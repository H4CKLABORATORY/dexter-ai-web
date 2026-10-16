"""Pestaña de nuevos géneros y diálogo mínimo cuando falla el reconocimiento."""
import json
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk

import content_modes as modes


class OtherContentTab(ttk.Frame):
    """Métodos declarativos; ningún nuevo tipo requiere modificar Python."""
    def __init__(self, parent, log=None, on_change=None):
        super().__init__(parent, padding=18)
        self.log = log or (lambda msg: None)
        self.on_change = on_change or (lambda: None)
        modes.initialize()
        self.choice = tk.StringVar(value="auto")
        self.new_name = tk.StringVar()
        self.keywords = tk.StringVar()
        self.goal = tk.StringVar()
        self.platform = tk.StringVar(value="youtube")
        self.layout = tk.StringVar(value="fit")
        self.length = tk.StringVar(value="auto")
        ttk.Label(self,text="Nuevos tipos de contenido",font=("Segoe UI",17,"bold")).pack(anchor="w",pady=(0,10))
        ttk.Label(self,text="El editor propone un método por título/guion. Si no lo reconoce, te pregunta y guarda la elección.",wraplength=650).pack(anchor="w",pady=(0,10))
        r=ttk.Frame(self);r.pack(fill="x",pady=6)
        ttk.Label(r,text="Método para el video:",width=23).pack(side="left")
        self.mode_menu=ttk.Combobox(r,textvariable=self.choice,state="readonly",width=43)
        self.mode_menu.pack(side="left",fill="x",expand=True)
        self.refresh_modes()
        ttk.Button(r,text="Actualizar",command=self.refresh_modes).pack(side="left",padx=5)
        ttk.Separator(self).pack(fill="x",pady=14)
        ttk.Label(self,text="Crear nuevo método de edición",font=("Segoe UI",12,"bold")).pack(anchor="w")
        self.field("Nombre (ej. Entrevistas)",self.new_name)
        self.field("Palabras clave (separadas por comas)",self.keywords)
        self.field("Objetivo del video",self.goal)
        r=ttk.Frame(self);r.pack(fill="x",pady=6)
        for label,var,values in [
            ("Plataforma",self.platform,["youtube","shorts","tiktok"]),
            ("Encuadre",self.layout,["fit","crop"]),
            ("Duración",self.length,["auto","short","long"]),
        ]:
            ttk.Label(r,text=label).pack(side="left",padx=(0,4))
            ttk.Combobox(r,textvariable=var,values=values,width=11,state="readonly").pack(side="left",padx=(0,12))
        ttk.Button(self,text="Guardar nuevo método",command=self.add_mode).pack(anchor="w",pady=8)
        ttk.Separator(self).pack(fill="x",pady=14)
        ttk.Label(self,text="Biblioteca de guiones y conocimiento recuperado",font=("Segoe UI",12,"bold")).pack(anchor="w")
        r=ttk.Frame(self);r.pack(anchor="w",pady=10)
        ttk.Button(r,text="Importar carpeta de guiones",command=self.import_scripts).pack(side="left")
        ttk.Button(r,text="Estado de la biblioteca",command=self.report).pack(side="left",padx=10)
        ttk.Button(r,text="Mostrar reglas de estilo",command=self.show_knowledge).pack(side="left")
        ttk.Label(self,text="Se han preparado reglas y títulos conocidos; los guiones completos sólo se agregan desde archivos reales.",wraplength=650).pack(anchor="w")
        self.output=tk.Text(self,height=12,wrap="word",state="disabled")
        self.output.pack(fill="both",expand=True,pady=12)
        self.report()

    def field(self,label,variable):
        r=ttk.Frame(self);r.pack(fill="x",pady=5)
        ttk.Label(r,text=label,width=39).pack(side="left")
        ttk.Entry(r,textvariable=variable).pack(side="left",fill="x",expand=True)

    def write(self,value):
        self.output.configure(state="normal")
        self.output.delete("1.0","end")
        self.output.insert("1.0",value)
        self.output.configure(state="disabled")

    def refresh_modes(self):
        self.mode_items={x["id"]:x for x in modes.all_modes()}
        self.mode_menu["values"]=["auto"]+list(self.mode_items)
        if self.choice.get() not in self.mode_items and self.choice.get()!="auto":
            self.choice.set("auto")

    def add_mode(self):
        try:
            mode=modes.add_method(self.new_name.get(),self.keywords.get().split(","),
                                  self.platform.get(),self.layout.get(),self.length.get(),self.goal.get())
        except (ValueError, OSError) as exc:
            messagebox.showerror("Método",str(exc),parent=self);return
        self.refresh_modes()
        self.choice.set(mode["id"])
        self.new_name.set("");self.keywords.set("")
        self.write("Método creado:\n"+json.dumps(mode,ensure_ascii=False,indent=2))
        self.on_change()

    def import_scripts(self):
        folder=filedialog.askdirectory(parent=self,title="Carpeta con tus guiones reales")
        if not folder: return
        try:
            result=modes.import_folder(folder)
            self.write("Importación terminada:\n"+json.dumps(result,ensure_ascii=False,indent=2))
        except (ValueError,OSError) as exc:
            messagebox.showerror("Importar guiones",str(exc),parent=self)

    def report(self):
        modes.initialize()
        catalog=modes.read_json(modes.CATALOG,{"entries":[],"known_titles_only":[]})
        complete=catalog.get("entries",[])
        title_only=catalog.get("known_titles_only",[])
        self.write(
            f"GUIONES COMPLETOS IMPORTADOS: {len(complete)}\n"
            f"TÍTULOS RECUPERADOS (SIN TEXTO): {len(title_only)}\n\n"
            "Archivos de guiones completos:\n"+("\n".join(" • "+x["name"] for x in complete) or " — Ninguno todavía —")+
            "\n\nTítulos conocidos (sólo referencia):\n"+"\n".join(" • "+x for x in title_only)+
            "\n\nTu biblioteca se guarda sólo en este equipo, no se sube a GitHub."
        )

    def show_knowledge(self):
        modes.initialize()
        data=modes.read_json(modes.KNOWLEDGE,{})
        self.write(json.dumps(data,ensure_ascii=False,indent=2))

    def determine(self,title,filename="",script_path=""):
        """Prioriza modo manual; pregunta sólo si falta evidencia suficiente."""
        selected=self.choice.get()
        try:
            script=modes.script_content(script_path) if script_path else ""
            info=modes.detect(title=title,filename=filename,script=script,
                              mode_override=selected if selected!="auto" else None)
        except (ValueError, OSError, UnicodeError) as exc:
            messagebox.showerror("Detección",str(exc),parent=self);return None
        if info["mode"] is not None:
            self.log("Método: "+info["mode"]["name"]+" ("+info["status"]+")")
            return info["mode"], {"source":info["status"],"confidence":info["confidence"],
                                  "evidence":info["evidence"]}
        candidates="\n".join("• "+x["id"]+" ["+str(x["score"])+"]" for x in info["candidates"] if x["score"])
        intro=("No encontré suficiente información para identificar el video.\n\n"
               + (candidates+"\n\n" if candidates else "")+
               "¿Qué contenido vas a hacer?\nEscribe el ID de un método, o entra a la pestaña 'Nuevos contenidos' para crear uno.\n"
               "Opciones: "+", ".join(self.mode_items.keys()))
        choice=simpledialog.askstring("¿Qué video haremos?",intro,parent=self)
        if choice is None: return None
        mode=self.mode_items.get(choice.strip())
        if mode is None:
            messagebox.showinfo("Método desconocido","Crea ese método en Nuevos contenidos y vuelve a preparar.",parent=self)
            return None
        goal=simpledialog.askstring("Propósito","¿Para qué quieres este video? (ej. humor, contar una historia, explicar algo)",initialvalue=mode["goal"],parent=self)
        if goal is None: return None
        destination=simpledialog.askstring("Destino","¿YouTube, Shorts o TikTok?",initialvalue=mode["platform"],parent=self)
        if destination is None:return None
        if destination.strip().lower() not in modes.PLATFORMS:
            messagebox.showerror("Destino","Elige youtube, shorts o tiktok.",parent=self)
            return None
        result=dict(mode);result["goal"]=goal[:150];result["platform"]=destination.strip().lower()
        return result, {"source":"guided", "confidence":0.0,
                        "answers":{"type":mode["id"],"goal":goal,"platform":destination}}
