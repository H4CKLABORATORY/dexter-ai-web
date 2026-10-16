#!/usr/bin/env python3
"""Edición semiautomática Free Fire: guion + silencios + SRT + memes propios.

No simula comprensión semántica. Genera un plan editable y exporta con FFmpeg.
Publicación, música y voz-clonada no incluidas.
"""
import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

import reference_lab as lab
import studio

JOBS = studio.JOBS

def load_job(job):
    folder = studio.project(job)
    src = studio.load_source(folder)
    return folder, src

def active_ranges(duration, silences, pad=0.14, min_segment=0.43):
    cursor = 0.0
    kept = []
    for start, end in sorted(silences):
        start = max(cursor, max(0.0, start - pad))
        end = min(duration, end + pad)
        if start - cursor >= min_segment:
            kept.append([round(cursor, 3), round(start, 3)])
        cursor = max(cursor, end)
    if duration - cursor >= min_segment:
        kept.append([round(cursor, 3), round(duration, 3)])
    if not kept and duration:
        kept = [[0.0, round(duration, 3)]]
    return kept

def limit_duration(ranges, max_seconds):
    if max_seconds <= 0:
        return ranges
    result, total = [], 0.0
    for start, end in ranges:
        seconds = end - start
        available = max_seconds - total
        if available <= 0:
            break
        result.append([start, round(start + min(seconds, available), 3)])
        total += min(seconds, available)
    return result

def srt_time_to_seconds(value):
    match = re.fullmatch(r"(\d{2,}):(\d\d):(\d\d)[,.](\d{3})", value.strip())
    if not match:
        raise ValueError("Tiempo de subtítulos inválido: " + value)
    hours, minutes, seconds, millis = map(int, match.groups())
    if minutes >= 60 or seconds >= 60:
        raise ValueError("Tiempo SRT fuera de rango.")
    return hours * 3600 + minutes * 60 + seconds + millis / 1000

def seconds_to_srt(value):
    millis = max(0, round(value * 1000))
    hours, rest = divmod(millis, 3600000)
    minutes, rest = divmod(rest, 60000)
    seconds, ms = divmod(rest, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{ms:03}"

def parse_srt(text):
    entries = []
    for block in re.split(r"\n\s*\n", text.replace("\r\n", "\n").strip()):
        lines = block.splitlines()
        if not lines:
            continue
        row = next((i for i, line in enumerate(lines) if "-->" in line), None)
        if row is None:
            continue
        match = re.match(r"^\s*([0-9:,.\s]+)\s*-->\s*([0-9:,.\s]+)", lines[row])
        if not match:
            continue
        start = srt_time_to_seconds(match.group(1))
        end = srt_time_to_seconds(match.group(2))
        content = " ".join(lines[row+1:]).strip()
        if content and end > start:
            entries.append({"start": start, "end": end, "text": content})
    return entries

def remap_captions(entries, clips):
    mapping = []
    offset = 0.0
    for start, end in clips:
        for line in entries:
            overlap_start = max(start, line["start"])
            overlap_end = min(end, line["end"])
            if overlap_end - overlap_start >= 0.075:
                mapping.append({"start": round(offset + overlap_start - start, 3),
                                "end": round(offset + overlap_end - start, 3),
                                "text": line["text"]})
        offset += end - start
    return mapping

def format_srt(entries):
    return "\n".join(f"{i}\n{seconds_to_srt(e['start'])} --> {seconds_to_srt(e['end'])}\n{e['text']}\n"
                     for i, e in enumerate(entries, 1)) + "\n"

def tagged_memes():
    lab.initialize()
    records = []
    for meta in sorted(lab.MEMES.glob("*.json")):
        try:
            item = json.loads(meta.read_text(encoding="utf-8"))
            media = lab.MEMES / item["file"]
            if media.is_file() and media.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
                records.append({"file": str(media), "tags": item.get("tags", []),
                                "license": item.get("license", "review_pending")})
        except (ValueError, KeyError, OSError):
            pass
    return records

def suggest_memes(subtitles, limit=6):
    options = tagged_memes()
    found = []
    for line in subtitles:
        normalized = line["text"].lower()
        for meme in options:
            matched = next((tag for tag in meme["tags"]
                            if re.search(r"\b" + re.escape(tag.lower()) + r"\b", normalized)), None)
            if not matched:
                continue
            if found and line["start"] - found[-1]["start"] < 4:
                break
            if meme["license"] not in ("owned", "licensed", "permitted"):
                continue
            found.append({"start": line["start"], "end": min(line["start"] + 1.7, line["end"] + 0.7),
                          "asset": meme["file"], "trigger": matched,
                          "reason": "Sugerencia por etiqueta textual; no análisis semántico."})
            break
        if len(found) >= limit:
            break
    return found

def plan(args):
    folder, src = load_job(args.job)
    info = lab.probe(src)
    if info["duration"] <= 0:
        raise ValueError("Video sin duración conocida.")
    silences = lab.silent_intervals(src, info["duration"]) if info["has_audio"] else []
    clips = active_ranges(info["duration"], silences) if args.remove_silences else [[0.0, info["duration"]]]
    clips = limit_duration(clips, args.target)
    if not clips:
        raise ValueError("No quedan intervalos después de aplicar filtros.")
    original_subtitles = []
    if args.srt:
        subtitle_file = lab.safe_existing(args.srt, {".srt"})
        original_subtitles = parse_srt(subtitle_file.read_text(encoding="utf-8-sig"))
    remapped = remap_captions(original_subtitles, clips)
    memes = suggest_memes(remapped)
    style = lab.initialize()
    edition = {
        "source": str(src),
        "kind": args.kind,
        "platform": args.platform,
        "layout": args.layout,
        "clips": clips,
        "captions": remapped,
        "meme_suggestions": memes,
        "meme_events_approved": [],
        "voiceover": None,
        "style": style["name"],
        "auto_selection": "silences_only" if args.remove_silences else "sequential",
        "review_required": True,
        "notes": [
            "Selecciona manualmente los mejores momentos y corrige los subtítulos.",
            "Los silencios no detectan humor, jugadas buenas ni remates.",
            "Los memes aparecen como sugerencia. Para renderizarlos mueve eventos a meme_events_approved.",
            "La voz original permanece. La narración opcional debe ser propia, autorizada o sintética.",
            "Guion escrito sin marcas temporales NO significa subtítulos sincronizados."
        ]
    }
    dst = folder / "edit-plan.json"
    if dst.exists() and not args.overwrite:
        raise ValueError("Ya existe edit-plan.json; usa --overwrite para reemplazarlo.")
    dst.write_text(json.dumps(edition, indent=2, ensure_ascii=False), encoding="utf-8")
    print("Plan editable:", dst)
    print("Duración estimada:", round(sum(end-start for start,end in clips),2),
          "Subtítulos:", len(remapped), "Memes sugeridos:", len(memes))

def validate_plan(plan_data, source_duration):
    clips = plan_data["clips"]
    if not isinstance(clips, list) or not clips or len(clips) > 120:
        raise ValueError("Lista de cortes inválida o demasiado larga.")
    last_end = -1.0
    for s,e in clips:
        if not (isinstance(s,(float,int)) and isinstance(e,(float,int))
                and 0 <= s < e <= source_duration+0.01 and s >= last_end):
            raise ValueError("Cortes invalidos: deben estar ordenados y dentro del video.")
        last_end=e
    if plan_data.get("platform") not in studio.PRESETS:
        raise ValueError("Plataforma no válida.")
    if plan_data.get("layout") not in ("fit","crop"):
        raise ValueError("Composición no válida.")
    return clips

def escape_concat(path):
    # Ruta de archivo FFmpeg concat demuxer (sin interpolación de shell).
    return str(path).replace("\\", "/").replace("'", "'\\''")

def render(args):
    folder, src = load_job(args.job)
    json_plan = folder / "edit-plan.json"
    if not json_plan.is_file():
        raise ValueError("Primero crea un plan: editor.py plan.")
    p = json.loads(json_plan.read_text(encoding="utf-8"))
    info = lab.probe(src)
    clips = validate_plan(p, info["duration"])
    if not shutil.which("ffmpeg"):
        raise RuntimeError("Falta FFmpeg.")
    output_dir = folder / "exports"
    output_dir.mkdir(exist_ok=True)
    output = output_dir / f"edit-{p['platform']}.mp4"
    if output.exists() and not args.overwrite:
        raise ValueError("La exportación ya existe; usa --overwrite.")

    with tempfile.TemporaryDirectory(prefix="render-", dir=folder) as temp:
        temp = Path(temp)
        produced = []
        width, height = studio.PRESETS[p["platform"]]
        for index, (start, end) in enumerate(clips):
            part = temp / f"part-{index:03}.mp4"
            video = studio.video_filter(width,height,p["layout"])
            cmd = ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                   "-ss", str(start), "-i", str(src), "-t", str(round(end-start,3)),
                   "-map", "0:v:0", "-map", "0:a:0?", "-vf",video,
                   "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
                   "-c:a", "aac", "-ar", "48000", "-b:a", "160k", "-movflags", "+faststart",str(part)]
            studio.run(cmd)
            produced.append(part)
        concat = temp / "segments.txt"
        concat.write_text("\n".join("file '"+escape_concat(x)+"'" for x in produced)+"\n",encoding="utf-8")
        assembled = temp / "assembled.mp4"
        studio.run(["ffmpeg","-nostdin","-hide_banner","-loglevel","error","-y",
                    "-f","concat","-safe","0","-i",str(concat),"-c","copy",str(assembled)])
        captions = p.get("captions") or []
        valid_captions = [x for x in captions if 0 <= x["start"] < x["end"]]
        (temp / "captions.srt").write_text(format_srt(valid_captions),encoding="utf-8")
        approved = p.get("meme_events_approved",[])
        meme_images = []
        # La lista aprobada puede editarse a mano; sólo admite archivos de library/memes.
        for event in approved:
            media = Path(event["asset"]).resolve()
            if not media.is_relative_to(lab.MEMES.resolve()) or not media.is_file() or media.suffix.lower() not in {".png",".jpg",".jpeg",".webp"}:
                raise ValueError("Meme fuera de library/memes o formato incompatible.")
            total = sum(b-a for a,b in clips)
            if not (0 <= event["start"] < event["end"] <= total+0.01):
                raise ValueError("Evento meme fuera de la duración del video.")
            meme_images.append((media,event))
        if len(meme_images) > 12:
            raise ValueError("Máximo 12 memes por exportación.")
        cmd = ["ffmpeg","-nostdin","-hide_banner","-loglevel","error","-y","-i",str(assembled)]
        for image,_ in meme_images:
            cmd += ["-loop","1","-i",str(image)]
        # Insertar la voz femenina sólo mediante archivo de audio autorizado.
        voice_path = p.get("voiceover")
        has_voice = voice_path is not None
        if has_voice:
            voice = lab.safe_existing(voice_path,{".wav",".mp3",".m4a"})
            cmd += ["-i",str(voice)]
        if args.burn_captions and valid_captions:
            chain = "[0:v]subtitles=captions.srt[v0]"
        else:
            chain = "[0:v]null[v0]"
        current = "v0"
        for idx, (_,event) in enumerate(meme_images):
            chain += f";[{idx+1}:v]scale=-1:{int(height*0.24)},format=rgba[img{idx}]"
            start,end=float(event["start"]),float(event["end"])
            nxt = f"v{idx+1}"
            chain += (f";[{current}][img{idx}]overlay="
                      f"x=W-w-40:y=H-h-{int(height*0.15)}:enable='between(t,{start:.3f},{end:.3f})'"
                      f"[{nxt}]")
            current=nxt
        has_game_audio = info["has_audio"]
        if has_voice:
            voice_idx = len(meme_images)+1
            if has_game_audio:
                chain += f";[0:a]volume=0.35[game];[{voice_idx}:a]volume=1[voice];[game][voice]amix=inputs=2:duration=first:dropout_transition=0[aout]"
            else:
                chain += f";[{voice_idx}:a]apad[aout]"
        # subs trabaja sobre cwd para evitar escapado de ruta Windows en filtergraph.
        cmd += ["-filter_complex",chain,"-map",f"[{current}]"]
        if has_voice:
            cmd += ["-map","[aout]"]
        elif has_game_audio:
            cmd += ["-map","0:a:0"]
        cmd += ["-c:v","libx264","-preset","medium","-crf","21"]
        if has_voice or has_game_audio:
            cmd += ["-c:a","aac","-b:a","192k"]
        cmd += ["-pix_fmt","yuv420p","-movflags","+faststart",str(output)]
        if args.preview:
            print(json.dumps({"command":cmd,"cwd":str(temp)}, indent=2,ensure_ascii=False))
            return
        result = subprocess.run(cmd,cwd=temp)
        if result.returncode or not output.is_file() or output.stat().st_size == 0:
            raise RuntimeError("Error de exportación final: revisa ffmpeg/libass y las pistas de audio.")
    print("Video completo exportado:",output)

def available_voices():
    try:
        import pyttsx3
    except ImportError as exc:
        raise RuntimeError("Instala pyttsx3 para voces locales: py -m pip install pyttsx3") from exc
    engine=pyttsx3.init()
    return engine,engine.getProperty("voices")

def voices(args):
    engine,records=available_voices()
    for x in records:
        print(json.dumps({"id":x.id,"name":x.name,"languages":[str(z) for z in x.languages],
                          "gender":getattr(x,"gender",None)},ensure_ascii=False))
    engine.stop()

def narrate(args):
    folder,_=load_job(args.job)
    textfile=lab.safe_existing(args.script,{".txt",".md"})
    engine, records=available_voices()
    if args.voice:
        if args.voice not in [x.id for x in records]:
            raise ValueError("Voz no instalada: usa editor.py voices.")
        engine.setProperty("voice",args.voice)
    engine.setProperty("rate",args.rate)
    export=folder/"input"/"narration.wav"
    if export.exists() and not args.overwrite:
        raise ValueError("Ya existe narration.wav; usa --overwrite.")
    engine.save_to_file(textfile.read_text(encoding="utf-8-sig"),str(export))
    engine.runAndWait()
    if not export.is_file() or not export.stat().st_size:
        raise RuntimeError("El motor TTS no guardó la voz.")
    print("Narración local creada:",export)
    print("Para incorporarla, escribe la ruta absoluta en voiceover dentro de edit-plan.json.")

def parser():
    p=argparse.ArgumentParser(description="Editor Free Fire: cortes/subtítulos/memes/voz local")
    subs=p.add_subparsers(dest="action",required=True)
    q=subs.add_parser("plan")
    q.add_argument("--job",required=True)
    q.add_argument("--srt")
    q.add_argument("--platform",choices=studio.PRESETS,default="tiktok")
    q.add_argument("--kind",choices=["short","long"],default="short")
    q.add_argument("--layout",choices=["fit","crop"],default="fit")
    q.add_argument("--target",type=float,default=30)
    q.add_argument("--remove-silences",action="store_true")
    q.add_argument("--overwrite",action="store_true")
    q.set_defaults(fn=plan)
    q=subs.add_parser("render")
    q.add_argument("--job",required=True)
    q.add_argument("--burn-captions",action="store_true")
    q.add_argument("--overwrite",action="store_true")
    q.add_argument("--preview",action="store_true")
    q.set_defaults(fn=render)
    q=subs.add_parser("voices"); q.set_defaults(fn=voices)
    q=subs.add_parser("narrate")
    q.add_argument("--job",required=True)
    q.add_argument("--script",required=True)
    q.add_argument("--voice")
    q.add_argument("--rate",type=int,default=178)
    q.add_argument("--overwrite",action="store_true")
    q.set_defaults(fn=narrate)
    return p

if __name__=="__main__":
    try:
        args=parser().parse_args()
        if getattr(args,"target",0) < 0:
            raise ValueError("Duración objetivo no válida.")
        args.fn(args)
    except (ValueError,RuntimeError,OSError,KeyError) as exc:
        print("Error:",exc,file=sys.stderr)
        sys.exit(2)
