"""Abre MIRA en una ventana estilo aplicación sin barra de navegación, si Chrome/Edge existe.
Requiere Python 3 y un navegador moderno. No genera un instalador nativo ni expone el backend a Internet.
"""
import os
import pathlib
import shutil
import subprocess
import sys
import time
import urllib.request
import webbrowser

BASE=pathlib.Path(__file__).resolve().parent
PORT=int(os.getenv('MIRA_PORT','8765'))
URL=f'http://127.0.0.1:{PORT}/'

def find_browser():
    candidates=['chromium','google-chrome','chrome','msedge','microsoft-edge','brave','brave-browser']
    for name in candidates:
        exe=shutil.which(name)
        if exe:return exe
    if sys.platform=='win32':
        pf=[os.environ.get('PROGRAMFILES',''),os.environ.get('PROGRAMFILES(X86)',''),os.environ.get('LOCALAPPDATA','')]
        for prefix in pf:
            for path in ['Google/Chrome/Application/chrome.exe','Microsoft/Edge/Application/msedge.exe']:
                target=pathlib.Path(prefix)/path
                if target.exists():return str(target)
    return None

def main():
    # No se inicia un nuevo servidor si ya responde uno en ese puerto.
    proc=None
    try:
        try:urllib.request.urlopen(URL+'api/health',timeout=1)
        except Exception:
            proc=subprocess.Popen([sys.executable,str(BASE/'server.py'),'--host','127.0.0.1','--port',str(PORT)],cwd=BASE,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            for _ in range(30):
                time.sleep(.2)
                try:urllib.request.urlopen(URL+'api/health',timeout=.5);break
                except Exception:continue
            else:raise RuntimeError('No se pudo iniciar el servidor local.')
        browser=find_browser()
        if browser:
            subprocess.run([browser,f'--app={URL}','--window-size=1380,930','--no-first-run'],check=False)
        else:
            webbrowser.open(URL)
            print('Navegador abierto:',URL)
            input('Pulsa Enter para cerrar el servidor...')
    finally:
        if proc is not None:
            proc.terminate()
            try:proc.wait(timeout=3)
            except subprocess.TimeoutExpired:proc.kill()

if __name__=='__main__':
    try:main()
    except Exception as e:
        print('MIRA:',e,file=sys.stderr)
        input('Pulsa Enter para salir...')
