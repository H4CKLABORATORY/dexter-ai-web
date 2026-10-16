#!/usr/bin/env python3
"""Ventana Windows local para preparar y exportar videos sin escribir comandos."""
import queue
import subprocess
import sys
import threading
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from studio import slugify

HERE = Path(__file__).resolve().parent

class StudioGUI:
    def __init__(self, root):
        self.root = root
        root.title("Dexter Video Studio — Free Fire / YouTube / TikTok")
        root.geometry("660x520")
        root.minsize(570, 460)
        self.events = queue.Queue()
        self.busy = False

        frame = ttk.Frame(root, padding=18)
        frame.pack(fill="both", expand=True)

        self.source = tk.StringVar()
        self.name = tk.StringVar(value="Video Free Fire 01")
        self.job = tk.StringVar()
        self.platform = tk.StringVar(value="youtube")
        self.layout = tk.StringVar(value="fit")
        self.gpu = tk.BooleanVar(value=False)
        self.start = tk.StringVar(value="0")
        self.duration = tk.StringVar(value="")

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
        self.log = tk.Text(frame, height=8, wrap="word", state="disabled")
        self.log.pack(fill="both", expand=True, pady=(10, 0))
        root.after(150, self.poll)

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

    def execute(self, args, on_success=None):
        if self.busy:
            messagebox.showinfo("En curso", "Espera a que termine la tarea actual.")
            return
        self.busy = True
        self.append("> " + " ".join(args))
        def task():
            try:
                result = subprocess.run([sys.executable, str(HERE / "studio.py"), *args],
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
        self.execute(["prepare", "--name", self.name.get(), "--source", self.source.get()],
                     on_success=lambda: self.job.set(slug))

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

if __name__ == "__main__":
    root = tk.Tk()
    StudioGUI(root)
    root.mainloop()
