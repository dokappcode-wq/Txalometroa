"""Monta las páginas finales a partir de sus plantillas:

    app/txalometroa.src.html   -> app/txalometroa.html   (la app: informe + publicación)
    replica/replica.src.html   -> replica/index.html     (réplica local de la web para pruebas)
    movil/index.src.html       -> movil/index.html       (app móvil instalable del público)
    movil/sw.src.js            -> movil/sw.js            (service worker con la versión de esta compilación)

En todas incrusta app/nucleo.js (lectura, limpieza, análisis, reseña y piezas visuales),
config.json, app/catalogo.json y el último export de datos/ (o el que se pase como argumento).

Uso: python app/construir.py [datos/export.xls]
"""
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

raiz = Path(__file__).resolve().parent.parent
config = json.loads((raiz / "config.json").read_text(encoding="utf-8"))
catalogo = json.loads((raiz / "app" / "catalogo.json").read_text(encoding="utf-8"))
nucleo = (raiz / "app" / "nucleo.js").read_text(encoding="utf-8")

# Solo la URL y la clave publicable llegan al navegador.
url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
clave = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "").strip()
cuentas_config = None
if url or clave:
    partes = urlsplit(url)
    local = partes.scheme == "http" and partes.hostname in ("localhost", "127.0.0.1")
    if (not partes.hostname or not (partes.scheme == "https" or local)
            or any((partes.path, partes.query, partes.fragment, partes.username, partes.password))
            or not re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]+", clave)):
        sys.exit("Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY con la URL del proyecto y su clave sb_publishable_.")
    cuentas_config = {"url": url, "clave": clave}
cuentas = (raiz / "movil" / "cuentas.js").read_text(encoding="utf-8")

if len(sys.argv) > 1:
    export = Path(sys.argv[1])
else:
    export = max((raiz / "datos").glob("*.xls"), key=lambda p: p.stat().st_mtime)
datos = export.read_bytes().decode("utf-8-sig").replace("\r\n", "\n").strip()
if "</script" in datos.lower():
    sys.exit("El export contiene '</script' y no se puede incrustar.")

for plantilla, salida in [("app/txalometroa.src.html", "app/txalometroa.html"),
                          ("replica/replica.src.html", "replica/index.html"),
                          ("movil/index.src.html", "movil/index.html")]:
    html = ((raiz / plantilla).read_text(encoding="utf-8")
            .replace("__NUCLEO__", nucleo)
            .replace("__CONFIG__", json.dumps(config, ensure_ascii=False))
            .replace("__CATALOGO__", json.dumps(catalogo, ensure_ascii=False))
            .replace("__NOMBRE__", export.name.replace('"', ""))
            .replace("__KONTU_KONFIG__", json.dumps(cuentas_config).replace("<", "\\u003c"))
            .replace("__CUENTAS__", cuentas)
            .replace("__DATOS__", datos))
    (raiz / salida).write_text(html, encoding="utf-8")
    print(f"{salida} ({len(html) // 1024} KB)")

# La versión del service worker cambia con el contenido, así el móvil descarga la app nueva.
version = hashlib.sha1((raiz / "movil" / "index.html").read_bytes()).hexdigest()[:10]
sw = (raiz / "movil" / "sw.src.js").read_text(encoding="utf-8").replace("__VERSION__", version)
(raiz / "movil" / "sw.js").write_text(sw, encoding="utf-8")
print(f"movil/sw.js (versión {version})")
print(f"Datos: {export.name}")
