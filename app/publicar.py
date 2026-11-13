"""Compila y publica la app móvil en Netlify (https://txalometroa-hika.netlify.app).

Sube solo lo que la app necesita (sin las plantillas .src). El sitio está enlazado en
.netlify/state.json; la cuenta es la que tenga la sesión abierta de netlify-cli.

Uso: python app/publicar.py
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
sitio = json.loads((raiz / ".netlify" / "state.json").read_text(encoding="utf-8"))["siteId"]
FICHEROS = ["index.html", "sw.js", "manifest.webmanifest", "_headers"]

subprocess.run([sys.executable, str(raiz / "app" / "construir.py")], check=True)

with tempfile.TemporaryDirectory() as tmp:
    destino = Path(tmp)
    for nombre in FICHEROS:
        shutil.copy2(raiz / "movil" / nombre, destino / nombre)
    shutil.copytree(raiz / "movil" / "icons", destino / "icons")
    npx = "npx.cmd" if sys.platform == "win32" else "npx"
    r = subprocess.run([npx, "-y", "netlify-cli@17", "deploy", "--prod", "--dir", str(destino), "--site", sitio], cwd=raiz)
    if r.returncode:
        sys.exit("No se ha podido publicar. Si dice «Site not found», la sesión de Netlify de este terminal es de otra cuenta:\n"
                 "el sitio está en la cuenta invitadoh2@gmail.com. Entra con ella con «npx netlify-cli@17 login» y vuelve a probar.")
