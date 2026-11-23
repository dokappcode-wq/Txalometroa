"""Monta las páginas finales a partir de sus plantillas:

    app/txalometroa.src.html   -> app/txalometroa.html   (la app: informe + publicación)
    replica/replica.src.html   -> replica/index.html     (réplica local de la web para pruebas)
    movil/index.src.html       -> movil/index.html       (app móvil instalable del público)
    movil/404.src.html         -> movil/404.html         (error 404 / sin conexión, con el telón)
    movil/sw.src.js            -> movil/sw.js            (service worker con la versión de esta compilación)

En las de movil/ incrusta además el telón de las animaciones (movil/telon/: estilos, encaje y logo).
En todas incrusta app/nucleo.js (lectura, limpieza, análisis, reseña y piezas visuales),
config.json, app/catalogo.json y el último export de datos/ (o el que se pase como argumento).

Uso: python app/construir.py [datos/export.xls]
"""
import base64
import hashlib
import json
import sys
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
config = json.loads((raiz / "config.json").read_text(encoding="utf-8"))
catalogo = json.loads((raiz / "app" / "catalogo.json").read_text(encoding="utf-8"))
nucleo = (raiz / "app" / "nucleo.js").read_text(encoding="utf-8")

if len(sys.argv) > 1:
    export = Path(sys.argv[1])
else:
    export = max((raiz / "datos").glob("*.xls"), key=lambda p: p.stat().st_mtime)
# Telón de carga, apertura y error: estilos y encaje comunes, con el logo de Hika incrustado.
logo = base64.b64encode((raiz / "movil" / "telon" / "hika.png").read_bytes()).decode("ascii")
telon_css = (raiz / "movil" / "telon" / "telon.css").read_text(encoding="utf-8").replace("__LOGO__", "data:image/png;base64," + logo)
telon_js = (raiz / "movil" / "telon" / "telon.js").read_text(encoding="utf-8")

datos = export.read_bytes().decode("utf-8-sig").replace("\r\n", "\n").strip()
if "</script" in datos.lower():
    sys.exit("El export contiene '</script' y no se puede incrustar.")

for plantilla, salida in [("app/txalometroa.src.html", "app/txalometroa.html"),
                          ("replica/replica.src.html", "replica/index.html"),
                          ("movil/index.src.html", "movil/index.html"),
                          ("movil/404.src.html", "movil/404.html")]:
    html = ((raiz / plantilla).read_text(encoding="utf-8")
            .replace("__TELON_CSS__", telon_css)
            .replace("__TELON_JS__", telon_js)
            .replace("__NUCLEO__", nucleo)
            .replace("__CONFIG__", json.dumps(config, ensure_ascii=False))
            .replace("__CATALOGO__", json.dumps(catalogo, ensure_ascii=False))
            .replace("__NOMBRE__", export.name.replace('"', ""))
            .replace("__DATOS__", datos))
    (raiz / salida).write_text(html, encoding="utf-8")
    print(f"{salida} ({len(html) // 1024} KB)")

# La versión del service worker cambia con el contenido, así el móvil descarga la app nueva.
version = hashlib.sha1((raiz / "movil" / "index.html").read_bytes() + (raiz / "movil" / "404.html").read_bytes()).hexdigest()[:10]
sw = (raiz / "movil" / "sw.src.js").read_text(encoding="utf-8").replace("__VERSION__", version)
(raiz / "movil" / "sw.js").write_text(sw, encoding="utf-8")
print(f"movil/sw.js (versión {version})")
print(f"Datos: {export.name}")
