#!/usr/bin/env python3
"""Perfiles extensibles y reconocimiento explicable para Dexter Video Studio.

Clasifica únicamente señales disponibles: título, nombre del archivo, guion,
transcripción suministrada y reglas JSON declarativas. NO interpreta video/voz.
No depende de servicios externos ni activa modelos por su cuenta.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys

BASE = Path(__file__).resolve().parent
LIBRARY = BASE / "library"
METHODS = LIBRARY / "content_methods.json"
KNOWLEDGE = LIBRARY / "dexter_knowledge.json"
CATALOG = LIBRARY / "script_catalog.json"
SCRIPTS = LIBRARY / "scripts"

# Referencias de guiones anteriores = TÍTULOS, no textos completos.
KNOWN_TITLES = [
    "Cazando interesadas", "Buscando interesadas 2",
    "Pareja de infieles", "FARMEANDO AURA EN ISLA SOCIAL",
    "Cuando el tío Dexter termina un PVP humillando tóxicos",
    "Sacando los nuevos cuernitos insanos",
    "Vayan a seguirme", "Si decimos el mismo te ganas un pase",
]
STYLE_SEED = {
    "brand": "Dexter FF",
    "game": "Free Fire",
    "language": "es-LATAM",
    "dialect": "Venezolano con toque salvadoreño; natural, callejero, espontáneo",
    "terms": ["bro", "cracks", "vato", "chacalito", "chacalita", "botsito", "manco", "veterano de papel"],
    "avoid": ["booyah", "headshot", "squad", "coño", "nah", "na'", "watsito", "huatsito"],
    "video_format": {
        "long": "Narración y diálogo abundante, intros largas cuando el formato sea novela; mantener duración, dinámica y progresión del guion original",
        "short": "Inicio fuerte 0-2 segundos, situación->curiosidad->giro->reacción; editar según el momento, no aplicar cortes agresivos por defecto",
        "vertical": "9:16 con texto dentro de zona segura; no tapar personajes ni interfaz relevante",
        "ultrawide": "Respetar gameplay completo con fit salvo elección explícita de crop",
        "voice": "Preservar la voz propia; voz femenina sintética o autorizada opcional",
        "meme": "Insertar donde tenga sentido narrativo, usando biblioteca licenciada y aprobación del creador",
    },
    "topics": ["Isla Social", "cazando interesadas", "novela", "chisme", "traición", "romance",
               "PvP", "jugadores tóxicos", "retos", "regalos", "skins", "humor"],
    "original_character": "No alterar outfit, proporciones ni accesorios cuando se proporcione referencia exacta",
    "posting": "Manual; no publicar automáticamente",
    "provenance": "Reglas reconstruidas de preferencias expresadas; NO contiene el texto de guiones originales.",
}
DEFAULT_MODES = [
    {"id": "free-fire-novela", "name": "Free Fire: novela/historias", "keywords": ["free fire", "isla social", "interesadas", "infieles", "chacalita", "traición", "novela", "botsito", "cazando"], "exclusive": ["freefire-novela"], "platform": "youtube", "layout": "fit", "length": "long", "goal": "historia"},
    {"id": "free-fire-shorts", "name": "Free Fire: clips/shorts", "keywords": ["free fire", "pvp", "toxico", "toxicos", "farmes", "pase", "emote", "skin", "headshot", "short", "gaming"], "exclusive": ["freefire-shorts"], "platform": "tiktok", "layout": "fit", "length": "short", "goal": "entretenimiento"},
    {"id": "tutorial-tech", "name": "Tecnología/tutorial", "keywords": ["tutorial", "windows", "python", "programación", "programacion", "software", "pc", "instalar"], "exclusive": ["tutorial"], "platform": "youtube", "layout": "fit", "length": "long", "goal": "enseñar"},
    {"id": "reaction", "name": "Reacciones/comentarios", "keywords": ["reacción", "reaccion", "reaccionando", "comentando", "reaccionamos", "opinión"], "exclusive": ["reaction"], "platform": "tiktok", "layout": "fit", "length": "short", "goal": "reaccionar"},
    {"id": "vlog", "name": "Vlog personal", "keywords": ["vlog", "mi día", "mi dia", "viaje", "rutina", "familia"], "exclusive": ["vlog"], "platform": "youtube", "layout": "fit", "length": "long", "goal": "contar"},
    {"id": "cocina", "name": "Cocina/recetas", "keywords": ["receta", "cocina", "ingredientes", "horno", "air fryer", "cocinando"], "exclusive": ["receta"], "platform": "tiktok", "layout": "fit", "length": "short", "goal": "enseñar"},
]
PLATFORMS = {"youtube", "shorts", "tiktok"}
LAYOUTS = {"fit", "crop"}
LENGTHS = {"short", "long", "auto"}
QUESTIONS = [
    {"id": "type", "label": "¿Qué clase de contenido vas a crear?", "choices": None},
    {"id": "goal", "label": "¿Qué quieres que el espectador sienta o haga?", "choices": None},
    {"id": "platform", "label": "¿Lo publicarás en YouTube, Shorts o TikTok?", "choices": ["youtube", "shorts", "tiktok"]},
    {"id": "length", "label": "¿Será largo, corto o prefieres decidir después?", "choices": ["long", "short", "auto"]},
    {"id": "voice", "label": "¿Usarás tu voz, narrador sintético autorizado, o sin voz?", "choices": ["original", "synthetic", "none"]},
    {"id": "text", "label": "¿Quieres subtítulos, texto narrativo o ambos?", "choices": ["subtitles", "narrative", "both", "none"]},
    {"id": "memes", "label": "¿Quieres memes: pocos, bastantes o ninguno?", "choices": ["few", "many", "none"]},
    {"id": "reference", "label": "¿Tienes un video de referencia o un método que quieras aplicar?", "choices": None},
]
def slug(value):
    result = re.sub(r"[^a-z0-9]+", "-", value.lower().strip()).strip("-")
    if not 2 <= len(result) <= 70:
        raise ValueError("El nombre del método debe tener entre 2 y 70 letras/números simples.")
    return result

def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default

def atomic_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")
    temp.replace(path)

def initialize():
    LIBRARY.mkdir(parents=True, exist_ok=True)
    SCRIPTS.mkdir(parents=True, exist_ok=True)
    if not METHODS.exists():
        atomic_json(METHODS, {"version": 1, "custom": []})
    if not KNOWLEDGE.exists():
        atomic_json(KNOWLEDGE, STYLE_SEED)
    if not CATALOG.exists():
        atomic_json(CATALOG, {"version": 1, "entries": [], "known_titles_only": KNOWN_TITLES})
    return all_modes()

def validate_mode(mode):
    if not isinstance(mode, dict):
        raise ValueError("Modo inválido.")
    mid = mode.get("id", "")
    if not isinstance(mid, str) or slug(mid) != mid:
        raise ValueError("ID de modo inválido.")
    if not isinstance(mode.get("name"), str) or not 2 <= len(mode["name"]) <= 100:
        raise ValueError("Nombre de modo inválido.")
    for key in ("keywords", "exclusive"):
        if not isinstance(mode.get(key, []), list) or any(not isinstance(x, str) or len(x) > 60 for x in mode.get(key, [])):
            raise ValueError("Palabras clave inválidas.")
    if mode.get("platform") not in PLATFORMS or mode.get("layout") not in LAYOUTS or mode.get("length") not in LENGTHS:
        raise ValueError("Plataforma, formato o duración inválidos.")
    if not isinstance(mode.get("goal",""), str) or len(mode.get("goal",""))>150:
        raise ValueError("Objetivo inválido.")
    return mode

def all_modes():
    custom = read_json(METHODS, {"custom": []}).get("custom", [])
    return [validate_mode(dict(x)) for x in DEFAULT_MODES + custom]

def add_method(name, keywords, platform, layout, length, goal):
    initialize()
    mode = {"id": slug(name), "name": name.strip(), "keywords": sorted(set(
        x.strip().lower() for x in keywords if x.strip())), "exclusive": [],
        "platform": platform, "layout": layout, "length": length, "goal": goal}
    validate_mode(mode)
    if not mode["keywords"]:
        raise ValueError("Añade al menos una palabra clave.")
    if mode["id"] in [x["id"] for x in all_modes()]:
        raise ValueError("El modo ya existe; elige otro nombre.")
    record = read_json(METHODS, {"version": 1, "custom": []})
    record["custom"].append(mode)
    atomic_json(METHODS, record)
    return mode

def tokenize(text):
    return " " + re.sub(r"\s+", " ", re.sub(r"[^a-zA-Z0-9áéíóúñü]+", " ", text.casefold())).strip() + " "

def detect(title="", script="", transcript="", filename="", mode_override=None):
    modes = initialize()
    if mode_override:
        found = next((x for x in modes if x["id"] == mode_override), None)
        if found is None:
            raise ValueError("No existe el modo solicitado.")
        return {"status": "chosen", "mode": found, "confidence": 1.0, "candidates": [], "evidence": ["elección manual"], "questions": []}
    # Guiones completos tienen mayor peso, pero un solo término NO basta para identificar un género.
    sections = [(tokenize(title), 3, "título"), (tokenize(filename), 1, "archivo"),
                (tokenize(script[:10000]), 2, "guion"), (tokenize(transcript[:10000]), 2, "transcripción")]
    results = []
    for mode in modes:
        score, evidence = 0.0, []
        for kw in mode["keywords"]:
            needle = " " + tokenize(kw).strip() + " "
            matching = [(w, name) for text,w,name in sections if needle in text]
            if matching:
                weight, source = max(matching)
                score += weight
                evidence.append(f"{kw} ({source})")
        results.append({"id": mode["id"], "name": mode["name"], "score": score,
                        "evidence": evidence, "settings": {k:mode[k] for k in ("platform","layout","length","goal")}})
    results.sort(key=lambda x: x["score"], reverse=True)
    top = results[0]
    runner = results[1] if len(results)>1 else {"score":0}
    # Conservador: diferencia clara y 2 evidencias o puntuación suficiente en título/guion.
    confident = top["score"] >= 5 and top["score"] >= runner["score"] + 3 and len(top["evidence"]) >= 2
    chosen = next((x for x in modes if x["id"]==top["id"]), None) if confident else None
    status = "detected" if confident else ("ambiguous" if top["score"] else "unknown")
    return {
        "status": status, "mode": chosen,
        "confidence": round(top["score"]/(top["score"]+runner["score"]+4),3) if top["score"] else 0.0,
        "candidates": results[:4], "evidence": top["evidence"] if confident else [],
        "questions": [] if confident else QUESTIONS[:],
        "warning": "Clasificación por texto y reglas; no analiza visualmente el video."
    }

def resolve_detection(info, responses):
    """Las respuestas explícitas tienen prioridad sobre una inferencia."""
    if info["mode"]:
        mode = dict(info["mode"])
    else:
        raw = responses.get("type","")
        mode = next((dict(x) for x in all_modes() if x["id"]==raw), None)
        if mode is None:
            raise ValueError("Elige un modo existente o crea uno nuevo desde la pestaña.")
    platform = responses.get("platform") or mode["platform"]
    if platform not in PLATFORMS:
        raise ValueError("Destino no válido.")
    mode["platform"] = platform
    if responses.get("goal"):
        mode["goal"] = responses["goal"][:150]
    if responses.get("length") in LENGTHS:
        mode["length"] = responses["length"]
    return mode

def import_folder(folder, max_files=500, copy=True):
    initialize()
    root = Path(folder).expanduser().resolve()
    if not root.is_dir():
        raise ValueError("Carpeta de guiones no encontrada.")
    sources = [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in {".txt", ".md", ".srt"}]
    if len(sources)>max_files:
        raise ValueError(f"Hay {len(sources)} archivos; límite {max_files} por lote.")
    catalog = read_json(CATALOG,{"version":1,"entries":[],"known_titles_only":KNOWN_TITLES})
    seen = {x["sha256"] for x in catalog["entries"]}
    added, duplicates, failed = [], 0, []
    for source in sorted(sources):
        try:
            if source.stat().st_size > 2_000_000:
                raise ValueError("Guion demasiado grande (2 MB)")
            raw = source.read_bytes()
            digest = hashlib.sha256(raw).hexdigest()
            if digest in seen:
                duplicates+=1; continue
            text = raw.decode("utf-8-sig")
            safe = slug(source.stem) if len(source.stem)>1 else digest[:12]
            dest = SCRIPTS / f"{safe}-{digest[:10]}{source.suffix.lower()}"
            if copy:
                shutil.copy2(source,dest)
            entry = {"name": source.stem, "sha256": digest, "path": str(dest if copy else source),
                     "words": len(text.split()), "type": source.suffix.lower(),
                     "imported_at": datetime.now(timezone.utc).isoformat(),
                     "complete_text": True}
            catalog["entries"].append(entry)
            seen.add(digest); added.append(entry["name"])
        except (ValueError,OSError,UnicodeError) as e:
            failed.append({"name":source.name,"error":str(e)})
    atomic_json(CATALOG, catalog)
    return {"added":added, "duplicates":duplicates, "failed":failed, "total_catalog":len(catalog["entries"])}

def script_content(path, limit=18000):
    source=Path(path).expanduser().resolve()
    if not source.is_file() or source.suffix.lower() not in {".txt",".md",".srt"}:
        raise ValueError("Guion no encontrado.")
    return source.read_text(encoding="utf-8-sig")[:limit]

def build_parser():
    p=argparse.ArgumentParser(description="Clasificador de contenido y métodos editables")
    s=p.add_subparsers(dest="command", required=True)
    i=s.add_parser("init");i.set_defaults(handler=lambda a:print(json.dumps({"modes":[m["name"] for m in initialize()]},ensure_ascii=False)))
    i=s.add_parser("classify")
    i.add_argument("--title",default="");i.add_argument("--file",default="");i.add_argument("--script")
    i.add_argument("--transcript");i.add_argument("--mode")
    i.set_defaults(handler=lambda a:print(json.dumps(detect(
        title=a.title,filename=a.file,script=script_content(a.script) if a.script else "",
        transcript=script_content(a.transcript) if a.transcript else "",
        mode_override=a.mode),indent=2,ensure_ascii=False)))
    i=s.add_parser("add-mode")
    i.add_argument("--name",required=True);i.add_argument("--keywords",required=True)
    i.add_argument("--platform",choices=PLATFORMS,default="youtube")
    i.add_argument("--layout",choices=LAYOUTS,default="fit")
    i.add_argument("--length",choices=LENGTHS,default="auto")
    i.add_argument("--goal",default="")
    i.set_defaults(handler=lambda a:print(json.dumps(add_method(
        a.name,a.keywords.split(","),a.platform,a.layout,a.length,a.goal),ensure_ascii=False,indent=2)))
    i=s.add_parser("import-scripts")
    i.add_argument("--folder",required=True)
    i.set_defaults(handler=lambda a:print(json.dumps(import_folder(a.folder),indent=2,ensure_ascii=False)))
    return p

if __name__=="__main__":
    try:
        args=build_parser().parse_args()
        args.handler(args)
    except (OSError,ValueError,KeyError,UnicodeError,TypeError) as e:
        print("Error:",e,file=sys.stderr); sys.exit(2)
