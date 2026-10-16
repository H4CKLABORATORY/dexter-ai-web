#!/usr/bin/env python3
"""Video Studio: exportación gratuita con FFmpeg y adaptador CLI de OpenCreator.
No publica, descarga ni envía contenidos a proveedores sin indicación explícita.
"""
import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
JOBS = ROOT / "jobs"
EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
PRESETS = {"youtube": (1920, 1080), "shorts": (1080, 1920), "tiktok": (1080, 1920)}

def slugify(name):
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    if not 2 <= len(slug) <= 70:
        raise ValueError("Nombre inválido (2 a 70 caracteres ASCII).")
    return slug

def project(slug):
    if slug != slugify(slug):
        raise ValueError("Identificador inválido.")
    return JOBS / slug

def source_path(raw):
    p = Path(raw).expanduser().resolve()
    if not p.is_file() or p.suffix.lower() not in EXTENSIONS:
        raise ValueError("Video no encontrado o formato incompatible.")
    return p

def video_filter(width, height, layout):
    mode = "decrease" if layout == "fit" else "increase"
    part = (f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2" if layout == "fit"
            else f"crop={width}:{height}")
    return f"scale={width}:{height}:force_original_aspect_ratio={mode}:flags=lanczos,{part},setsar=1,format=yuv420p"

def ffmpeg_args(source, target, platform, layout="fit", gpu=False, start=0.0, duration=None):
    width, height = PRESETS[platform]
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-y"]
    if start:
        cmd += ["-ss", str(start)]
    cmd += ["-i", str(source), "-map", "0:v:0", "-map", "0:a:0?", "-vf", video_filter(width, height, layout)]
    if duration is not None:
        cmd += ["-t", str(duration)]
    if gpu:
        cmd += ["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "21", "-b:v", "0"]
    else:
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "21"]
    return cmd + ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(target)]

def run(cmd, cwd=None):
    print("Ejecutando:", " ".join(map(str, cmd)))
    result = subprocess.run(cmd, cwd=cwd, check=False)
    if result.returncode:
        raise RuntimeError(f"Error externo: código {result.returncode}")

def prepare(args):
    folder = project(slugify(args.name))
    if (folder / "project.json").exists():
        raise ValueError("Ya existe ese proyecto. No se sobrescribe.")
    src = source_path(args.source)
    dest = folder / "input" / ("original" + src.suffix.lower())
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    data = {"name": args.name, "slug": folder.name,
            "source": str(dest.relative_to(folder)),
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "status": "prepared", "publishing": "manual"}
    (folder / "project.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    (folder / "brief.md").write_text(
        f"# {args.name}\n\n- Hook:\n- Guion:\n- Miniatura:\n- Título:\n"
        "- Descripción:\n- Hashtags TikTok (máx. 5):\n- Derechos y revisión humana: pendiente\n",
        encoding="utf-8")
    print("Proyecto preparado:", folder)

def load_source(folder):
    cfg = folder / "project.json"
    if not cfg.is_file():
        raise ValueError("Proyecto inexistente. Usa prepare.")
    metadata = json.loads(cfg.read_text(encoding="utf-8"))
    src = (folder / metadata["source"]).resolve()
    if not src.is_relative_to(folder.resolve()):
        raise ValueError("Ruta de entrada insegura.")
    return source_path(str(src))

def render(args):
    folder = project(args.job)
    src = load_source(folder)
    if not shutil.which("ffmpeg"):
        raise RuntimeError("Instala FFmpeg y agrégalo a PATH.")
    output = folder / "exports" / f"{args.platform}-{args.layout}.mp4"
    cmd = ffmpeg_args(src, output, args.platform, args.layout, args.gpu, args.start, args.duration)
    if args.preview:
        print(json.dumps(cmd, indent=2))
        return
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists() and not args.overwrite:
        raise ValueError("Archivo ya existente; usa --overwrite.")
    run(cmd)
    if not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError("Exportación vacía.")
    print("Exportado:", output)

def thumbnail(args):
    folder = project(args.job)
    src = load_source(folder)
    if not shutil.which("ffmpeg"):
        raise RuntimeError("Falta FFmpeg.")
    dst = folder / "exports" / "miniatura-base.jpg"
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and not args.overwrite:
        raise ValueError("La miniatura existe; usa --overwrite.")
    run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-ss", str(args.second),
         "-i", str(src), "-frames:v", "1", "-update", "1",
         "-vf", video_filter(1280, 720, "fit"), "-q:v", "2", str(dst)])
    print("Miniatura base:", dst)

def opencreator(args):
    folder = project(args.job)
    src = load_source(folder)
    cli = Path(args.cli).expanduser().resolve()
    cwd = Path(args.cwd).expanduser().resolve()
    if not cli.is_file() or not cwd.is_dir():
        raise ValueError("Faltan --cli (binario real) o --cwd (runtime/krillinai o raíz release).")
    workdir = folder / "opencreator"
    workdir.mkdir(parents=True, exist_ok=True)
    if args.stage == "subtitle":
        cmd = [str(cli), "subtitle", "local:" + str(src),
               "--origin-lang", args.origin_lang, "--target-lang", args.target_lang,
               "--workdir", str(workdir), "--caption-source", args.caption_source,
               "--prepare-video"]
    else:
        captions = ("short_origin_mixed_srt.srt" if args.stage == "render-vertical"
                    else "bilingual_srt.srt")
        video = workdir / "origin_video.mp4"
        subtitle = workdir / captions
        if args.execute and (not video.is_file() or not subtitle.is_file()):
            raise ValueError("Primero ejecuta subtítulos para generar origen y SRT.")
        cmd = [str(cli), args.stage, "--workdir", str(workdir),
               "--video", str(video), "--subtitle", str(subtitle)]
    if not args.execute:
        cmd.append("--dry-run")
    print("Modo:", "REAL (puede llamar servicios configurados)" if args.execute else "DRY-RUN SIN PROVEEDORES")
    run(cmd, cwd=cwd)
    if args.execute and not (workdir / "krillinai_manifest.json").exists():
        raise RuntimeError("No se encontró krillinai_manifest.json.")

def build_parser():
    parser = argparse.ArgumentParser(description="Dexter Video Studio / OpenCreator")
    subs = parser.add_subparsers(dest="task", required=True)
    p = subs.add_parser("check")
    p.set_defaults(func=lambda _: print(json.dumps(
        {"python": sys.version.split()[0], "ffmpeg": shutil.which("ffmpeg"),
         "ffprobe": shutil.which("ffprobe"), "opencreator_included": False},
        indent=2)))
    p = subs.add_parser("prepare")
    p.add_argument("--name", required=True)
    p.add_argument("--source", required=True)
    p.set_defaults(func=prepare)
    p = subs.add_parser("render")
    p.add_argument("--job", required=True)
    p.add_argument("--platform", required=True, choices=PRESETS)
    p.add_argument("--layout", choices=["fit", "crop"], default="fit")
    p.add_argument("--start", type=float, default=0)
    p.add_argument("--duration", type=float)
    p.add_argument("--gpu", action="store_true")
    p.add_argument("--preview", action="store_true")
    p.add_argument("--overwrite", action="store_true")
    p.set_defaults(func=render)
    p = subs.add_parser("thumbnail")
    p.add_argument("--job", required=True)
    p.add_argument("--second", type=float, default=3)
    p.add_argument("--overwrite", action="store_true")
    p.set_defaults(func=thumbnail)
    p = subs.add_parser("opencreator")
    p.add_argument("--job", required=True)
    p.add_argument("--cli", required=True)
    p.add_argument("--cwd", required=True)
    p.add_argument("--stage", choices=["subtitle", "render-horizontal", "render-vertical"], default="subtitle")
    p.add_argument("--origin-lang", default="es")
    p.add_argument("--target-lang", default="en")
    p.add_argument("--caption-source", choices=["any", "whisper"], default="whisper")
    p.add_argument("--execute", action="store_true")
    p.set_defaults(func=opencreator)
    return parser

def main():
    args = build_parser().parse_args()
    if getattr(args, "start", 0) < 0 or (hasattr(args, "duration") and
                                          args.duration is not None and args.duration <= 0):
        raise ValueError("Tiempo inválido.")
    if getattr(args, "second", 0) < 0:
        raise ValueError("Segundo inválido.")
    args.func(args)

if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError, json.JSONDecodeError) as exc:
        print("Error:", exc, file=sys.stderr)
        raise SystemExit(2)
