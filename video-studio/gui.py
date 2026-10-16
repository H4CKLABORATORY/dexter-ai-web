#!/usr/bin/env python3
"""Ventana Windows local para preparar y exportar videos sin escribir comandos."""
import queue
import subprocess
import sys
import threading
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk

from studio import slugify
from future_tab import OtherContentTab
import content_modes as modes
import json

HERE = Path(__file__).resolve().parent

class StudioGUI:
    def __init__(self, root):
        self.root = root
        root.title("Dexter Video Studio — Free Fire / YouTube / TikTok")
        root.geometry("850x850")
        root.minsize(570, 460)
        self.events = queue.Queue()
        self.busy = False

        notebook=ttk.Notebook(root)
        notebook.pack(fill="both",expand=True)
        frame=ttk.Frame(notebook,padding=18)
        notebook.add(frame,text="Mi edición / Free Fire")
        self.future=OtherContentTab(notebook,log=self.append,on_change=self.refresh_content_mode)
        notebook.add(self.future,text="Nuevos contenidos y métodos")
        self.active_mode=None
        self.mode_details=None

        self.source = tk.StringVar()
        self.name = tk.StringVar(value="Video Free Fire 01")
        self.job = tk.StringVar()
        self.platform = tk.StringVar(value="youtube")
        self.layout = tk.StringVar(value="fit")
        self.gpu = tk.BooleanVar(value=False)
        self.start = tk.StringVar(value="0")
        self.duration = tk.StringVar(value="")
        self.reference = tk.StringVar()
        self.tiktok_url = tk.StringVar()
        self.subtitle_file = tk.StringVar()
        self.script_file = tk.StringVar()

        ttk.Label(frame, text="Producción local de videos", font=("Segoe UI", 17, "bold")).pack(anchor="w", pady=(0, 12))
        ttk.Label(frame, text="Grabación propia (.mp4, .mov, .mkv, .webm, .avi)").pack(anchor="w")
        r = ttk.Frame(frame)
        r.pack(fill="x", pady=(4, 10))
        ttk.Entry(r, textvariable=self.source).pack(side="left", fill="x", expand=True)
        ttk.Button(r, text="Buscar…", command=self.pick).pack(side="left", padx=(8, 0))

        self.input_row(frame, "Nombre de proyecto", self.name)
        ttk.Button(frame, text="1. Preparar proyecto", command=self.prepare).pack(anchor="w", pady=7)
        self.input_row(frame, "Identificador para exportar", self.job)

        r = ttk.Frame(frame)
        r.pack(fill="x", pady=7)
        ttk.Label(r, text="Formato:").pack(side="left")
        ttk.Combobox(r, textvariable=self.platform, values=["youtube", "shorts", "tiktok"],
                     state="readonly", width=12).pack(side="left", padx=8)
        ttk.Label(r, text="Composición:").pack(side="left")
        ttk.Combobox(r, textvariable=self.layout, values=["fit", "crop"],
                     state="readonly", width=8).pack(side="left", padx=8)
        ttk.Checkbutton(r, text="GPU NVIDIA", variable=self.gpu).pack(side="left", padx=5)

        r = ttk.Frame(frame)
        r.pack(fill="x", pady=5)
        ttk.Label(r, text="Inicio (seg):").pack(side="left")
        ttk.Entry(r, textvariable=self.start, width=8).pack(side="left", padx=(4, 16))
        ttk.Label(r, text="Duración (vacío = video completo):").pack(side="left")
        ttk.Entry(r, textvariable=self.duration, width=9).pack(side="left", padx=5)

        ttk.Button(frame, text="2. Exportar MP4", command=self.export).pack(anchor="w", pady=7)
        ttk.Label(frame, text="fit conserva todo el gameplay ultrawide; crop puede recortar. La exportación no se publica.").pack(anchor="w", pady=4)
        ttk.Separator(frame, orient="horizontal").pack(fill="x", pady=(12, 7))
        ttk.Label(frame, text="Biblioteca Free Fire / Referencias TikTok", font=("Segoe UI", 12, "bold")).pack(anchor="w")
        self.file_picker_row(frame, "Video referencia", self.reference, "video")
        ttk.Button(frame, text="Guardar referencia en biblioteca", command=self.save_reference).pack(anchor="w", pady=4)
        rurl = ttk.Frame(frame); rurl.pack(fill="x", pady=3)
        ttk.Label(rurl, text="Link TikTok público", width=23).pack(side="left")
        ttk.Entry(rurl, textvariable=self.tiktok_url).pack(side="left", fill="x", expand=True)
        ttk.Button(rurl, text="Importar", command=self.import_tiktok).pack(side="left", padx=5)
        ar=ttk.Frame(frame); ar.pack(anchor="w",pady=4)
        ttk.Button(ar, text="Analizar biblioteca", command=self.analyze_references).pack(side="left")
        ttk.Button(ar, text="Generar guía de estilo", command=self.style_guide).pack(side="left",padx=8)
        self.file_picker_row(frame, "Guion (.txt/.md)", self.script_file, "script")
        rlibrary = ttk.Frame(frame); rlibrary.pack(anchor="w", pady=4)
        ttk.Button(rlibrary, text="Guardar guion", command=self.save_script).pack(side="left")
        ttk.Button(rlibrary, text="Guardar meme propio", command=self.save_meme).pack(side="left", padx=8)
        self.file_picker_row(frame, "Subtítulos (.srt)", self.subtitle_file, "srt")
        r2 = ttk.Frame(frame); r2.pack(fill="x", pady=7)
        ttk.Button(r2, text="3. Plan de edición", command=self.auto_plan).pack(side="left")
        ttk.Button(r2, text="4. Render final + subtítulos", command=self.render_auto).pack(side="left", padx=8)
        ttk.Label(frame, text="El plan editable está en jobs/<proyecto>/edit-plan.json. Revisa memes y cortes antes del render.").pack(anchor="w")
        self.log = tk.Text(frame, height=7, wrap="word", state="disabled")
        self.log.pack(fill="both", expand=True, pady=(10, 0))
        root.after(150, self.poll)

    def refresh_content_mode(self):
        self.append("Métodos actualizados. Selección: "+self.future.choice.get())

    def save_active_content_mode(self, job_slug, mode, details):
        from studio import project
        folder=project(job_slug)
        config=folder/"project.json"
        metadata=json.loads(config.read_text(encoding="utf-8"))
        metadata["content_method"]=mode["id"]
        metadata["content_method_name"]=mode["name"]
        metadata["content_detection"]=details
        metadata["content_method_settings"]={k:mode.get(k) for k in ("platform","layout","length","goal")}
        modes.atomic_json(config,metadata)
        self.active_mode=mode
        self.mode_details=details
        self.job.set(job_slug)
        self.append("Método de edición guardado en el proyecto: "+mode["name"])

    def file_picker_row(self, parent, label, variable, kind):
        r = ttk.Frame(parent); r.pack(fill="x", pady=3)
        ttk.Label(r, text=label, width=23).pack(side="left")
        ttk.Entry(r, textvariable=variable).pack(side="left", fill="x", expand=True)
        pattern = {"video": "*.mp4 *.mov *.mkv *.webm *.avi", "script": "*.txt *.md", "srt": "*.srt"}[kind]
        ttk.Button(r, text="Buscar", command=lambda: self.select_file(variable, pattern)).pack(side="left", padx=5)

    def select_file(self, var, pattern):
        selected = filedialog.askopenfilename(filetypes=[("Archivo", pattern)])
        if selected:
            var.set(selected)

    def input_row(self, parent, label, variable):
        r = ttk.Frame(parent)
        r.pack(fill="x", pady=4)
        ttk.Label(r, text=label, width=25).pack(side="left")
        ttk.Entry(r, textvariable=variable).pack(side="left", fill="x", expand=True)

    def pick(self):
        path = filedialog.askopenfilename(filetypes=[("Videos", "*.mp4 *.mov *.mkv *.webm *.avi"), ("Todos", "*.*")])
        if path:
            self.source.set(path)

    def append(self, message):
        self.log.configure(state="normal")
        self.log.insert("end", message + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def execute(self, args, on_success=None, runner="studio.py"):
        if self.busy:
            messagebox.showinfo("En curso", "Espera a que termine la tarea actual.")
            return
        self.busy = True
        self.append("> " + " ".join(args))
        def task():
            try:
                result = subprocess.run([sys.executable, str(HERE / runner), *args],
                                        cwd=HERE, text=True, capture_output=True, check=False)
                output = (result.stdout + "\n" + result.stderr).strip()
                self.events.put((result.returncode == 0, output[-3500:], on_success))
            except OSError as exc:
                self.events.put((False, str(exc), None))
        threading.Thread(target=task, daemon=True).start()

    def poll(self):
        while not self.events.empty():
            ok, output, callback = self.events.get_nowait()
            self.busy = False
            self.append(output or ("Completado." if ok else "Error desconocido."))
            if ok and callback:
                callback()
            if not ok:
                messagebox.showerror("Falló la tarea", "Revisa el registro de la ventana.")
        self.root.after(150, self.poll)

    def prepare(self):
        if not self.source.get():
            messagebox.showwarning("Falta grabación", "Selecciona un archivo de video.")
            return
        try:
            slug = slugify(self.name.get())
        except ValueError as exc:
            messagebox.showerror("Nombre", str(exc))
            return
        if not self.script_file.get():
            matched=modes.match_catalog_script(self.name.get())
            if matched:
                self.script_file.set(matched["path"])
                self.append("Guion original importado encontrado para este proyecto: "+matched["name"])
        resolution=self.future.determine(self.name.get(),filename=Path(self.source.get()).name,
                                         script_path=self.script_file.get())
        if resolution is None:
            return
        chosen,details=resolution
        self.platform.set(chosen["platform"])
        self.layout.set(chosen["layout"])
        self.execute(["prepare", "--name", self.name.get(), "--source", self.source.get()],
                     on_success=lambda: self.save_active_content_mode(slug,chosen,details))

    def export(self):
        if not self.job.get():
            messagebox.showwarning("Falta proyecto", "Prepara un proyecto primero.")
            return
        try:
            start = float(self.start.get())
            if start < 0:
                raise ValueError
            duration = float(self.duration.get()) if self.duration.get().strip() else None
            if duration is not None and duration <= 0:
                raise ValueError
        except ValueError:
            messagebox.showerror("Tiempo", "Inicio debe ser >=0 y duración >0.")
            return
        args = ["render", "--job", self.job.get(), "--platform", self.platform.get(),
                "--layout", self.layout.get(), "--start", str(start)]
        if duration is not None:
            args += ["--duration", str(duration)]
        if self.gpu.get():
            args.append("--gpu")
        self.execute(args)

    def save_reference(self):
        if not self.reference.get():
            messagebox.showwarning("Referencia", "Selecciona un video de referencia.")
            return
        self.execute(["add", "--kind", "reference", "--file", self.reference.get()],
                     runner="reference_lab.py")

    def import_tiktok(self):
        if not self.tiktok_url.get():
            messagebox.showwarning("TikTok", "Pega un enlace público de tu TikTok.")
            return
        if not messagebox.askyesno("Permiso", "¿Confirmas que los videos son tuyos o tienes permiso para usarlos como referencia?"):
            return
        name = simpledialog.askstring("Biblioteca TikTok", "Nombre corto de la colección:")
        if not name:
            return
        self.execute(["tiktok","--url",self.tiktok_url.get(),"--name",name,
                      "--limit","8","--authorized"],runner="reference_lab.py")

    def save_script(self):
        if self.script_file.get():
            self.execute(["add","--kind","script","--file",self.script_file.get()],runner="reference_lab.py")
        else:
            messagebox.showwarning("Guion","Selecciona primero el archivo de guion.")

    def save_meme(self):
        image=filedialog.askopenfilename(filetypes=[("Imagen de meme","*.png *.jpg *.jpeg *.webp")])
        if not image:
            return
        if not messagebox.askyesno("Permisos","¿Este meme es tuyo o tienes licencia o permiso para editarlo y distribuirlo?"):
            return
        tags=simpledialog.askstring("Etiquetas","Palabras relacionadas (separadas por comas):") or ""
        self.execute(["add","--kind","meme","--file",image,
                      "--tags",tags,"--license","owned"],runner="reference_lab.py")

    def analyze_references(self):
        self.execute(["analyze"], runner="reference_lab.py")

    def style_guide(self):
        self.execute([],runner="style_report.py")

    def auto_plan(self):
        if not self.job.get():
            messagebox.showwarning("Proyecto", "Prepara un proyecto primero.")
            return
        mode=self.active_mode
        if mode is None:
            config=HERE/"jobs"/self.job.get()/"project.json"
            if config.is_file():
                details=json.loads(config.read_text(encoding="utf-8"))
                identifier=details.get("content_method")
                mode=next((x for x in modes.all_modes() if x["id"]==identifier),None)
        kind="long" if mode and mode.get("length")=="long" else "short"
        target="0" if kind=="long" else "30"
        args=["plan","--job",self.job.get(),"--platform",self.platform.get(),
              "--layout",self.layout.get(),"--kind",kind,"--target",target]
        if self.subtitle_file.get():
            args+=["--srt",self.subtitle_file.get()]
        if self.script_file.get():
            args+=["--script",self.script_file.get()]
        self.execute(args,runner="editor.py")

    def render_auto(self):
        if not self.job.get():
            messagebox.showwarning("Proyecto", "Prepara el proyecto y el plan primero.")
            return
        self.execute(["render","--job",self.job.get(),"--burn-captions"],runner="editor.py")

if __name__ == "__main__":
    root = tk.Tk()
    StudioGUI(root)
    root.mainloop()
