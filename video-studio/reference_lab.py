#!/usr/bin/env python3
"""Biblioteca de estilo + análisis temporal de referencias para videos Free Fire.
Funciona localmente; URLs de TikTok sólo con yt-dlp y videos públicamente disponibles.
"""
import argparse
import json
from pathlib import Path
import re
import shutil
import statistics
import subprocess
import sys
import time
from urllib.parse import urlparse

BASE = Path(__file__).resolve().parent
LIB = BASE / "library"
REFERENCES = LIB / "references"
SCRIPTS = LIB / "scripts"
MEMES = LIB / "memes"
STYLE_FILE = LIB / "style.json"
MEDIA = {".mp4", ".mkv", ".mov", ".webm", ".avi"}
MEME_MEDIA = {".png", ".jpg", ".jpeg", ".webp", ".mp3", ".wav", ".mp4", ".mov"}
SCRIPTS_ALLOWED = {".txt", ".md", ".srt"}
DEFAULT_STYLE = {
    "name": "Dexter FF - Free Fire",
    "original_voice": True,
    "audience": "Free Fire LATAM",
    "language": "es-LATAM",
    "short_seconds_target": [15, 30],
    "hook_first_seconds": 2,
    "caption_position": "bottom",
    "safe_caption_margin": 160,
    "prefer_full_frame": True,
    "voiceover": "optional_authorized_voice",
    "preferred_vocabulary": ["bro", "cracks", "vato", "chacalito", "chacalita", "botsito"],
    "avoid_phrases": ["booyah", "headshot", "squad", "coño", "nah", "watsito"],
    "meme_categories": ["sorpresa", "troleo", "fail", "victoria", "confusion"],
    "strategy": "Hook directo, conflicto, reacción, remate; natural, sin intro forzada."
}

def valid_name(value):
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip()).strip("-").lower()
    if not cleaned or len(cleaned) > 80:
        raise ValueError("Nombre inválido.")
    return cleaned

def safe_existing(path, suffixes):
    obj = Path(path).expanduser().resolve()
    if not obj.is_file() or obj.suffix.lower() not in suffixes:
        raise ValueError("Archivo no encontrado o extensión incompatible.")
    return obj

def run(argv, check=True):
    outcome = subprocess.run(argv, capture_output=True, text=True, errors="replace")
    if check and outcome.returncode:
        raise RuntimeError((outcome.stderr or outcome.stdout or str(outcome.returncode))[-1800:])
    return outcome

def initialize():
    for folder in (REFERENCES, SCRIPTS, MEMES):
        folder.mkdir(parents=True, exist_ok=True)
    if not STYLE_FILE.exists():
        STYLE_FILE.write_text(json.dumps(DEFAULT_STYLE, indent=2, ensure_ascii=False), encoding="utf-8")
    return json.loads(STYLE_FILE.read_text(encoding="utf-8"))

def unique_dest(folder, name):
    target = folder / name
    if target.exists():
        raise ValueError("Ya existe este archivo. No se reemplazan originales: " + str(target))
    return target

def add_local(args):
    initialize()
    src = safe_existing(args.file, MEDIA if args.kind == "reference" else
                        (SCRIPTS_ALLOWED if args.kind == "script" else MEME_MEDIA))
    folder = {"reference": REFERENCES, "script": SCRIPTS, "meme": MEMES}[args.kind]
    target = unique_dest(folder, valid_name(args.name or src.stem) + src.suffix.lower())
    shutil.copy2(src, target)
    if args.kind == "meme":
        # El texto y las etiquetas los suministra el creador, no se deducen visualmente.
        tags = [valid_name(x) for x in args.tags.split(",") if x.strip()] if args.tags else []
        (MEMES / (target.stem + ".json")).write_text(
            json.dumps({"file": target.name, "tags": tags, "license": args.license,
                        "notes": args.notes}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"type": args.kind, "file": str(target)}, ensure_ascii=False))

def validate_tiktok_url(value):
    url = urlparse(value)
    host = (url.hostname or "").lower()
    return (url.scheme == "https" and
            (host == "tiktok.com" or host.endswith(".tiktok.com")) and
            not url.username and not url.password)

def add_tiktok(args):
    initialize()
    if not validate_tiktok_url(args.url):
        raise ValueError("Sólo enlaces HTTPS públicos de TikTok; no se admiten URL arbitrarias.")
    if not shutil.which("yt-dlp"):
        raise RuntimeError("Necesitas instalar yt-dlp localmente. No se descargará nada.")
    name = valid_name(args.name)
    folder = REFERENCES / name
    if folder.exists():
        raise ValueError("Ya existe esta referencia. No se sobrescribe.")
    folder.mkdir()
    # Descarga voluntaria, sin cookies/login, sin scraping de endpoints privados.
    cmd = ["yt-dlp", "--no-playlist"] if args.single else [
        "yt-dlp", "--yes-playlist", "--playlist-end", str(args.limit), "--max-downloads", str(args.limit)]
    cmd += ["--ignore-errors", "--no-overwrites", "--no-progress",
            "--restrict-filenames", "-o", str(folder / "%(id)s.%(ext)s"),
            args.url]
    try:
        result = run(cmd, check=False)
        files = [p.name for p in folder.iterdir() if p.suffix.lower() in MEDIA]
        if not files:
            raise RuntimeError("TikTok no entregó videos accesibles. " + result.stderr[-500:])
        (folder / "source.json").write_text(json.dumps(
            {"source": args.url, "file_count": len(files), "files": files,
             "downloaded_at": time.strftime("%Y-%m-%d"),
             "rights_confirmed_by_user": args.authorized}, ensure_ascii=False, indent=2),
             encoding="utf-8")
        print(json.dumps({"downloaded": len(files), "folder": str(folder)}, ensure_ascii=False))
    except Exception:
        if not list(folder.iterdir()):
            folder.rmdir()
        raise

def probe(file):
    if not shutil.which("ffprobe"):
        raise RuntimeError("No se detectó ffprobe en PATH.")
    payload = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                              "-of", "json", str(file)]).stdout)
    streams = payload.get("streams", [])
    video = next((x for x in streams if x.get("codec_type") == "video"), {})
    if not video:
        raise ValueError("El archivo no contiene video.")
    duration = float(payload.get("format", {}).get("duration") or video.get("duration") or 0)
    return {"duration": duration, "width": video.get("width"), "height": video.get("height"),
            "fps": video.get("avg_frame_rate"), "has_audio": any(x.get("codec_type") == "audio" for x in streams)}

def scene_times(file, duration, threshold=0.36):
    if not shutil.which("ffmpeg"):
        raise RuntimeError("FFmpeg no encontrado.")
    # showinfo entrega pts_time en stderr; proceso sólo de análisis, no exporta material.
    out = run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(file), "-vf",
               "select=gt(scene\\," + str(threshold) + "),showinfo",
               "-an", "-f", "null", "-"], check=False)
    found = re.findall(r"\bpts_time:([0-9]+(?:\.[0-9]+)?)", out.stderr)
    return sorted({round(float(x), 3) for x in found if 0 < float(x) < duration})

def silent_intervals(file, duration, noise="-34dB", min_length=0.65):
    out = run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(file), "-af",
               f"silencedetect=noise={noise}:d={min_length}", "-vn", "-f", "null", "-"], check=False)
    pattern = r"silence_(start|end):\s*([0-9]+(?:\.[0-9]+)?)"
    events = re.findall(pattern, out.stderr)
    periods, start = [], None
    for kind, raw in events:
        t = float(raw)
        if kind == "start":
            start = t
        elif start is not None:
            periods.append([round(max(0, start), 3), round(min(duration, t), 3)])
            start = None
    if start is not None:
        periods.append([round(start, 3), round(duration, 3)])
    return periods

def caption_metrics(srt_text):
    chunks = re.split(r"\n\s*\n", srt_text.replace("\r", "").strip())
    chars = []
    for part in chunks:
        lines = part.splitlines()
        text = " ".join(x for x in lines if "-->" not in x and not x.strip().isdigit())
        if text.strip():
            chars.append(len(text))
    return {"subtitles": len(chars), "median_chars": statistics.median(chars) if chars else None}

def analyze_file(file):
    info = probe(file)
    dur = info["duration"]
    info["scene_times"] = scene_times(file, dur)
    info["silence_intervals"] = silent_intervals(file, dur) if info["has_audio"] else []
    info["approx_shot_median_seconds"] = round(
        statistics.median([b-a for a,b in zip([0.0]+info["scene_times"],
                    info["scene_times"]+[dur])]), 2) if dur else None
    info["limits"] = ["Detección de cortes por píxeles y silencios, no comprende memes ni significado de diálogo.",
                      "Posición del texto en pantalla requiere anotación manual o un detector visual adicional."]
    return info

def all_reference_files():
    files = [p for p in REFERENCES.rglob("*") if p.is_file() and p.suffix.lower() in MEDIA]
    return sorted(files)

def analyze(args):
    initialize()
    files = [safe_existing(args.file, MEDIA)] if args.file else all_reference_files()
    if not files:
        raise ValueError("Biblioteca vacía: importa videos de referencia primero.")
    if len(files) > args.limit:
        files = files[:args.limit]
    entries, failures = [], []
    for item in files:
        try:
            info = analyze_file(item)
            info["file"] = str(item.relative_to(BASE)) if item.is_relative_to(BASE) else str(item)
            srt = item.with_suffix(".srt")
            if srt.is_file():
                info["caption_reference"] = caption_metrics(srt.read_text(encoding="utf-8-sig"))
            entries.append(info)
        except (ValueError, RuntimeError, json.JSONDecodeError) as exc:
            failures.append({"file": str(item), "error": str(exc)})
    shot = [x["approx_shot_median_seconds"] for x in entries if x["approx_shot_median_seconds"] is not None]
    result = {"analyzed": entries, "errors": failures, "profile_summary": {
        "videos": len(entries),
        "median_shot_duration": round(statistics.median(shot), 2) if shot else None,
        "reference_files_are_not_copied_into_exports": True,
        "does_not_identify_or_clone_voices": True}}
    destination = LIB / "reference-analysis.json"
    destination.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print("Análisis guardado:", destination)
    print("Videos:", len(entries), "Errores:", len(failures))

def transcribe(args):
    # Sólo gratuito/local cuando faster-whisper está instalado; la descarga inicial del
    # modelo puede necesitar Internet y su licencia debe verificarse.
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError("Instala faster-whisper: py -m pip install faster-whisper") from exc
    video = safe_existing(args.file, MEDIA)
    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments, info = model.transcribe(str(video), language=args.language, vad_filter=True)
    output = Path(args.output).expanduser().resolve()
    if output.exists() and not args.overwrite:
        raise ValueError("El SRT ya existe; usa --overwrite.")
    output.parent.mkdir(parents=True, exist_ok=True)
    def stamp(value):
        millis = max(0, round(value * 1000))
        h, ms = divmod(millis, 3600000)
        m, ms = divmod(ms, 60000)
        s, ms = divmod(ms, 1000)
        return f"{h:02}:{m:02}:{s:02},{ms:03}"
    with output.open("w", encoding="utf-8") as dest:
        for index, segment in enumerate(segments, 1):
            dest.write(f"{index}\n{stamp(segment.start)} --> {stamp(segment.end)}\n{segment.text.strip()}\n\n")
    print("Subtítulos transcritos localmente:", output, "Idioma:", info.language)

def parser():
    p = argparse.ArgumentParser(description="Biblioteca de referencias TikTok / estilo Dexter Free Fire")
    subs = p.add_subparsers(dest="action", required=True)
    q = subs.add_parser("init"); q.set_defaults(fn=lambda x: print("Biblioteca:", initialize()["name"]))
    q = subs.add_parser("add")
    q.add_argument("--kind", required=True, choices=["script", "meme", "reference"])
    q.add_argument("--file", required=True)
    q.add_argument("--name")
    q.add_argument("--tags", default="")
    q.add_argument("--license", default="review_pending")
    q.add_argument("--notes", default="")
    q.set_defaults(fn=add_local)
    q = subs.add_parser("tiktok")
    q.add_argument("--url", required=True)
    q.add_argument("--name", required=True)
    q.add_argument("--limit", type=int, default=8)
    q.add_argument("--single", action="store_true")
    q.add_argument("--authorized", action="store_true", help="Confirmar derechos de uso del material")
    q.set_defaults(fn=add_tiktok)
    q = subs.add_parser("analyze")
    q.add_argument("--file")
    q.add_argument("--limit", type=int, default=20)
    q.set_defaults(fn=analyze)
    q = subs.add_parser("transcribe")
    q.add_argument("--file", required=True)
    q.add_argument("--output", required=True)
    q.add_argument("--model", default="small")
    q.add_argument("--language", default="es")
    q.add_argument("--device", choices=["cpu", "cuda"], default="cpu")
    q.add_argument("--compute-type", default="int8")
    q.add_argument("--overwrite", action="store_true")
    q.set_defaults(fn=transcribe)
    return p

if __name__ == "__main__":
    try:
        args = parser().parse_args()
        if getattr(args, "limit", 1) < 1 or getattr(args, "limit", 1) > 100:
            raise ValueError("Límite permitido: 1-100 referencias.")
        args.fn(args)
    except (ValueError, RuntimeError, OSError) as exc:
        print("Error:", exc, file=sys.stderr)
        sys.exit(2)
