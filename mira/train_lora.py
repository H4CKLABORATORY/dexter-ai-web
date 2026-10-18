#!/usr/bin/env python3
"""Train a *real* LoRA adapter against a locally controlled open-weight model.

Requires Python extras from requirements-train.txt, compatible model license,
consented examples, and preferably NVIDIA CUDA GPU. This does not change ChatGPT.
"""
import argparse
import json
from pathlib import Path


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--model', required=True, help='Modelo abierto accesible en Hugging Face')
    p.add_argument('--dataset', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--steps', type=int, default=30)
    p.add_argument('--max-length', type=int, default=768)
    args = p.parse_args()
    if not 1 <= args.steps <= 2000: p.error('steps debe estar entre 1 y 2000')
    if not 128 <= args.max_length <= 4096: p.error('max-length inválido')
    if not args.dataset.is_file(): p.error('No existe el dataset')

    import torch
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import (AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig,
                              DataCollatorForLanguageModeling, Trainer, TrainingArguments)
    if not torch.cuda.is_available():
        raise RuntimeError('Este perfil de entrenamiento requiere CUDA. El modo de prompt y la inferencia sí funcionan sin GPU.')
    use_bf16 = torch.cuda.is_bf16_supported()
    print('GPU:', torch.cuda.get_device_name(0), flush=True)
    print('Modelo:', args.model, 'Pasos:', args.steps, flush=True)
    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=False)
    if tokenizer.pad_token is None: tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=BitsAndBytesConfig(load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16 if use_bf16 else torch.float16,
            bnb_4bit_quant_type='nf4', bnb_4bit_use_double_quant=True),
        device_map='auto', trust_remote_code=False)
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model)
    lora = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                      bias='none', target_modules='all-linear', task_type='CAUSAL_LM')
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    samples = []
    for raw in args.dataset.read_text(encoding='utf-8').splitlines():
        if not raw.strip(): continue
        ex = json.loads(raw)
        if 'instruction' not in ex or 'response' not in ex: continue
        messages = [
            {'role': 'user', 'content': ex['instruction']},
            {'role': 'assistant', 'content': ex['response']}
        ]
        if getattr(tokenizer, 'chat_template', None):
            txt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        else:
            txt = f'Usuario: {ex["instruction"]}\nAsistente: {ex["response"]}{tokenizer.eos_token or ""}'
        tok = tokenizer(txt, truncation=True, max_length=args.max_length, add_special_tokens=False)
        samples.append({'input_ids': tok['input_ids'], 'attention_mask': tok['attention_mask']})
    if len(samples) < 2: raise ValueError('Se requieren al menos dos ejemplos válidos.')
    class TrainingDataset(torch.utils.data.Dataset):
        def __len__(self): return len(samples)
        def __getitem__(self, i): return samples[i]
    args.output.mkdir(parents=True, exist_ok=True)
    config = TrainingArguments(
        output_dir=str(args.output), max_steps=args.steps,
        per_device_train_batch_size=1, gradient_accumulation_steps=8,
        learning_rate=1e-4, lr_scheduler_type='cosine', warmup_ratio=0.05,
        logging_steps=5, save_strategy='no', report_to='none',
        bf16=use_bf16, fp16=not use_bf16, gradient_checkpointing=True,
        optim='paged_adamw_8bit', seed=42, remove_unused_columns=False,
    )
    trainer = Trainer(
        model=model, args=config, train_dataset=TrainingDataset(),
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
    )
    trainer.train()
    model.save_pretrained(str(args.output), safe_serialization=True)
    tokenizer.save_pretrained(str(args.output))
    (args.output / 'omega_manifest.json').write_text(json.dumps({
        'base_model': args.model, 'steps': args.steps,
        'dataset_examples':len(samples), 'method':'QLoRA 4-bit NF4 + PEFT'
    }, indent=2), encoding='utf-8')
    print('Adaptador guardado en', args.output, flush=True)
    print('El modelo base NO se ha sobreescrito. Para fusionar: merge_lora.py.', flush=True)

if __name__ == '__main__': main()
