#!/usr/bin/env python3
"""Merge a LoRA adapter into a distinct full-precision model directory.
Only for model architectures/licenses which permit merging and redistribution.
Requires substantial CPU/GPU RAM and disk space.
"""
import argparse
import json
from pathlib import Path

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--adapter', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    manifest = json.loads((args.adapter/'omega_manifest.json').read_text(encoding='utf-8'))
    base = manifest['base_model']
    if args.output.exists() and any(args.output.iterdir()):
        p.error('La salida debe ser un directorio nuevo/vacío.')
    model = AutoModelForCausalLM.from_pretrained(base, torch_dtype='auto', device_map='auto', trust_remote_code=False)
    adapted = PeftModel.from_pretrained(model, str(args.adapter))
    merged = adapted.merge_and_unload()
    args.output.mkdir(parents=True, exist_ok=True)
    merged.save_pretrained(str(args.output), safe_serialization=True)
    AutoTokenizer.from_pretrained(base, trust_remote_code=False).save_pretrained(str(args.output))
    print('Modelo fusionado en:', args.output)

if __name__ == '__main__': main()
