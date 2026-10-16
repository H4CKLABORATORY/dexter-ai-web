#!/usr/bin/env python3
"""Informe de estilo reproducible basado SOLO en archivos locales y métricas verificadas."""
import json
from pathlib import Path
import re
from collections import Counter
import reference_lab as lab

STOP = {"para","pero","porque","como","este","esta","estos","donde","cuando","unos",
        "unas","tengo","quiero","vamos","estaba","estoy","entonces","ahora","ellos",
        "ellas","desde","hasta","sobre","entre","pues","tambien","dije","dice",
        "esto","toda","todo","hola","bueno","esta","esas","ese","fue","hay","una",
        "que","con","los","las","del","por","sin","muy","más","mas","aquí","aqui",
        "sus","son","de","la","el","y","en","se","lo","le","un","es","yo","tu","me","al"}

def main():
    style=lab.initialize()
    measure=lab.LIB / "reference-analysis.json"
    data=json.loads(measure.read_text(encoding="utf-8")) if measure.is_file() else {}
    refs=data.get("analyzed",[])
    counter=Counter()
    script_count=0
    for file in lab.SCRIPTS.glob("*"):
        if file.suffix.lower() not in lab.SCRIPTS_ALLOWED:
            continue
        script_count += 1
        text=file.read_text(encoding="utf-8-sig",errors="replace")
        counter.update(w.lower() for w in re.findall(r"[A-Za-zÁÉÍÓÚáéíóúÑñÜü]{3,}",text)
                       if w.lower() not in STOP)
    kinds=Counter()
    for meta in lab.MEMES.glob("*.json"):
        try:
            body=json.loads(meta.read_text(encoding="utf-8"))
            for tag in body.get("tags",[]):
                kinds[tag] += 1
        except (ValueError,OSError):
            pass
    seconds=data.get("profile_summary",{}).get("median_shot_duration")
    report=[
        "# Perfil local de edición Free Fire",
        "",
        "> Estadísticas y preferencias, no entrenamiento de un modelo de IA.",
        "",
        "## Preferencias del creador",
        f"- Nombre: {style.get('name','Dexter FF')}",
        f"- Español: {style.get('language','es-LATAM')}",
        f"- Shorts objetivo: {style.get('short_seconds_target',[15,30])} segundos",
        f"- Hook: antes de {style.get('hook_first_seconds',2)} segundos",
        f"- Vocabulario: {', '.join(style.get('preferred_vocabulary',[]))}",
        f"- Evitar: {', '.join(style.get('avoid_phrases',[]))}",
        f"- Dinámica: {style.get('strategy','')}",
        "",
        "## Evidencia de la biblioteca",
        f"- Guiones importados: {script_count}",
        f"- Referencias analizadas: {len(refs)}",
        f"- Mediana aproximada de plano/escena: {seconds if seconds is not None else 'sin datos'} s",
        f"- Palabras frecuentes en tus guiones: {', '.join(w for w,_ in counter.most_common(16)) or 'sin guiones'}",
        f"- Categorías de memes etiquetadas: {', '.join(k for k,_ in kinds.most_common()) or 'sin memes'}",
        "",
        "## Qué debe hacer el editor",
        "1. Conservar grabación y voz originales de Dexter.",
        "2. Alinear texto con diálogo transcrito por SRT; no inventar frases.",
        "3. Priorizar reacciones, tensión, conflictos y humor, si un análisis semántico los detecta.",
        "4. Proponer memes de la biblioteca etiquetada. Insertar sólo con aprobación.",
        "5. Evitar barras de TikTok, overlays, interfaz del juego y bordes al colocar texto.",
        "6. Revisar el encuadre de BlueStacks/Free Fire; modo fit no recorta gameplay.",
        "7. Presentar un plan editable antes de un render definitivo.",
        "",
        "## Límites",
        "Las escenas y silencios son aproximaciones técnicas. Sin modelo de video no se detectan",
        "automáticamente chistes, memes visuales o la posición real de los textos de referencia.",
        "Los archivos de referencia no se redistribuyen como parte de tus videos.",
        ""
    ]
    dest=lab.LIB/"EDITING_STYLE_GUIDE.md"
    dest.write_text("\n".join(report),encoding="utf-8")
    print("Informe reutilizable para Codex/OpenCreator:",dest)

if __name__=="__main__":
    main()
