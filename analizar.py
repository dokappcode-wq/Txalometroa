"""Txalometroa: limpia la exportación del formulario, la analiza y genera
los ficheros para publicar el feedback del público en la web.

Uso:
    python analizar.py datos/export.xls [--config config.json] [--salida salida]

Genera en la carpeta de salida:
    respuestas_limpias.csv  datos depurados (se abre con Excel)
    resumen.json            todas las métricas, para integrarlas en la web
    informe.html            informe interno para el teatro
    widget.html             bloque público bilingüe (eu/es) para incrustar en la web
    bloque_wordpress_eu.html / _es.html
                            el mismo bloque, para pegar en un bloque «HTML personalizado»
"""
import argparse
import csv
import datetime as dt
import html
import json
import re
import statistics
import sys
from pathlib import Path

PREGUNTAS = [f"GAL{i}" for i in range(1, 8)]
FORMATO_FECHA = "%Y-%m-%d %H:%M:%S"


# --------------------------------------------------------------------------
# Lectura
# --------------------------------------------------------------------------

def leer_export(ruta):
    """La web exporta un TSV con extensión .xls; también acepta CSV."""
    datos = Path(ruta).read_bytes()
    if datos[:4] == b"\xd0\xcf\x11\xe0":
        sys.exit("El fichero es un Excel binario real: ábrelo y guárdalo como CSV o TXT (tabulaciones).")
    for codificacion in ("utf-8-sig", "cp1252"):
        try:
            texto = datos.decode(codificacion)
            break
        except UnicodeDecodeError:
            continue
    primera = texto.splitlines()[0]
    delimitador = "\t" if "\t" in primera else (";" if ";" in primera else ",")
    filas = list(csv.DictReader(texto.splitlines(), delimiter=delimitador))
    faltan = {"ID", "PRODUKZIOA", "NOIZ", "HIZKUNTZA", *PREGUNTAS} - set(filas[0])
    if faltan:
        sys.exit(f"Faltan columnas en la exportación: {', '.join(sorted(faltan))}")
    return filas


def slug(texto):
    return re.sub(r"[^a-z0-9]+", "-", texto.lower()).strip("-")


# --------------------------------------------------------------------------
# Limpieza
# --------------------------------------------------------------------------

def limpiar(filas, config):
    """Devuelve (respuestas válidas, descartes por motivo, obras sin mapear)."""
    alias = {}
    for obra_id, obra in config["obras"].items():
        for nombre in obra["alias"]:
            alias[nombre.strip().lower()] = obra_id
    seg_dup = config["limpieza"]["segundos_duplicado"]

    validas, sin_mapear = [], set()
    descartes = {"vacias": 0, "sin_obra": 0, "duplicadas": 0}
    ultima = {}  # obra_id -> última respuesta válida, para detectar dobles envíos

    for fila in filas:
        notas = {}
        for g in PREGUNTAS:
            valor = int(fila[g] or 0)
            notas[g] = valor if 1 <= valor <= 10 else None  # 0 = no contestada
        if all(v is None for v in notas.values()):
            descartes["vacias"] += 1
            continue

        nombre = fila["PRODUKZIOA"].strip()
        if not nombre:
            descartes["sin_obra"] += 1
            continue
        obra_id = alias.get(nombre.lower())
        if obra_id is None:
            obra_id = slug(nombre)
            sin_mapear.add(nombre)

        cuando = dt.datetime.strptime(fila["NOIZ"].strip(), FORMATO_FECHA)
        previa = ultima.get(obra_id)
        if previa and previa["notas"] == notas and (cuando - previa["cuando"]).total_seconds() <= seg_dup:
            descartes["duplicadas"] += 1
            continue

        # La nota de la obra solo usa las preguntas sobre la obra (no las de
        # fidelidad ni la de la programación de la localidad).
        de_obra = [notas[g] for g in config["nota_obra"] if notas[g] is not None]
        respuesta = {
            "id": fila["ID"],
            "obra": obra_id,
            "nombre_original": nombre,
            "idioma": fila["HIZKUNTZA"].strip(),
            "cuando": cuando,
            "notas": notas,
            "media": statistics.fmean(de_obra) if de_obra else None,
        }
        validas.append(respuesta)
        ultima[obra_id] = respuesta

    return validas, descartes, sorted(sin_mapear)


def asignar_funciones(respuestas, config):
    """Agrupa las respuestas de cada obra en funciones: un hueco de más de
    N horas sin respuestas marca el inicio de otra función."""
    hueco = dt.timedelta(hours=config["limpieza"]["horas_entre_funciones"])
    por_obra = {}
    for r in sorted(respuestas, key=lambda r: r["cuando"]):
        por_obra.setdefault(r["obra"], []).append(r)
    for lista in por_obra.values():
        actual = None
        for r in lista:
            if actual is None or r["cuando"] - actual["fin"] > hueco:
                actual = {"inicio": r["cuando"], "fin": r["cuando"]}
                funcion_id = f'{r["obra"]}-{r["cuando"]:%Y%m%d-%H%M}'
            actual["fin"] = r["cuando"]
            r["funcion"] = funcion_id


# --------------------------------------------------------------------------
# Análisis
# --------------------------------------------------------------------------

def pct(parte, total):
    return round(100 * parte / total) if total else 0


def metricas(respuestas, config):
    medias = [r["media"] for r in respuestas if r["media"] is not None]
    g = config["pregunta_recomendacion"]
    rec = [r["notas"][g] for r in respuestas if r["notas"][g] is not None]
    promotores, detractores = pct(sum(v >= 9 for v in rec), len(rec)), pct(sum(v <= 6 for v in rec), len(rec))
    return {
        "n": len(respuestas),
        "nota": round(statistics.fmean(medias), 2) if medias else None,
        "pct_muy_satisfechos": pct(sum(m >= 9 for m in medias), len(medias)),
        "pct_insatisfechos": pct(sum(m <= 6 for m in medias), len(medias)),
        # Recomendación al estilo NPS: % que da 9-10 menos % que da 6 o menos.
        "pct_recomendaria": promotores,
        "indice_recomendacion": promotores - detractores if rec else None,
    }


def metricas_pregunta(respuestas, g):
    valores = [r["notas"][g] for r in respuestas if r["notas"][g] is not None]
    n = len(valores)
    return {
        "n": n,
        "media": round(statistics.fmean(valores), 2) if n else None,
        "pct_10": pct(sum(v == 10 for v in valores), n),
        "pct_bajo": pct(sum(v <= 6 for v in valores), n),
    }


def analizar(respuestas, config):
    min_funcion = config["limpieza"]["min_respuestas_funcion"]
    obras = []
    for obra_id in sorted({r["obra"] for r in respuestas}):
        rs = [r for r in respuestas if r["obra"] == obra_id]
        info = config["obras"].get(obra_id, {"eu": rs[0]["nombre_original"], "es": rs[0]["nombre_original"]})
        funciones = []
        for funcion_id in dict.fromkeys(r["funcion"] for r in rs):
            fr = [r for r in rs if r["funcion"] == funcion_id]
            funciones.append({
                "id": funcion_id,
                "inicio": fr[0]["cuando"].isoformat(sep=" "),
                "fin": fr[-1]["cuando"].isoformat(sep=" "),
                "fiable": len(fr) >= min_funcion,
                **metricas(fr, config),
            })
        obras.append({
            "id": obra_id,
            "eu": info["eu"],
            "es": info["es"],
            "primera": rs[0]["cuando"].date().isoformat(),
            "ultima": rs[-1]["cuando"].date().isoformat(),
            **metricas(rs, config),
            "preguntas": {g: metricas_pregunta(rs, g) for g in PREGUNTAS},
            "funciones": funciones,
        })
    obras.sort(key=lambda o: -o["n"])
    return obras


def conclusiones(obras, descartes, total_filas, respuestas, sin_mapear, config):
    """Lecturas automáticas en lenguaje natural, a partir de reglas fijas."""
    textos = []
    etiqueta = lambda g: config["preguntas"][g]["es"]
    for o in obras:
        if o["n"] < config["publicacion"]["min_respuestas_obra"]:
            textos.append(f'«{o["es"]}» solo tiene {o["n"]} respuestas: aún no es representativo.')
            continue
        medias = {g: o["preguntas"][g]["media"] for g in config["nota_obra"] if o["preguntas"][g]["media"] is not None}
        floja = min(medias, key=medias.get)
        fuerte = max(medias, key=medias.get)
        textos.append(
            f'«{o["es"]}»: {fmt(o["nota"])} de nota con {o["n"]} respuestas; el {o["pct_recomendaria"]}% la recomendaría '
            f'(índice de recomendación {o["indice_recomendacion"]:+d}). '
            f'Lo mejor valorado: {etiqueta(fuerte).lower()} ({fmt(medias[fuerte])}); lo más flojo: {etiqueta(floja).lower()} ({fmt(medias[floja])}).'
        )
        fiables = [f for f in o["funciones"] if f["fiable"]]
        if len(fiables) >= 3:
            peor = min(fiables, key=lambda f: f["nota"])
            if o["nota"] - peor["nota"] >= 0.5:
                textos.append(
                    f'«{o["es"]}»: la función del {fecha_corta(peor["inicio"])} quedó por debajo '
                    f'({fmt(peor["nota"])} con {peor["n"]} respuestas). Vale la pena revisar qué pasó ese día.'
                )

    por_bloque = lambda b: {g: metricas_pregunta(respuestas, g) for g, p in config["preguntas"].items() if p["bloque"] == b}
    fidelidad = por_bloque("publico")
    if fidelidad:
        textos.append(
            'Fidelidad: ' + '; '.join(f'«{etiqueta(g)}» {fmt(m["media"])} ({m["pct_bajo"]}% da 6 o menos)' for g, m in fidelidad.items())
            + '. Es lo que indica si el público volverá.'
        )
    for g, m in por_bloque("localidad").items():
        textos.append(
            f'«{etiqueta(g)}» saca {fmt(m["media"])} y es de las notas más bajas, pero no habla de la obra sino del municipio: '
            'no entra en la nota de las obras. El formulario no guarda la localidad, así que solo se puede cruzar por fecha de función.'
        )

    if descartes["vacias"]:
        textos.append(
            f'{descartes["vacias"]} envíos llegaron con todos los deslizadores a 0 (se pulsó TXALOTU sin mover nada). '
            'El formulario debería exigir al menos una respuesta.'
        )
    if descartes["sin_obra"]:
        textos.append(
            f'{descartes["sin_obra"]} respuestas llegaron sin obra y no se pueden usar; '
            'el formulario no debería guardar un envío si no sabe a qué obra pertenece.'
        )
    if descartes["duplicadas"]:
        textos.append(
            f'{descartes["duplicadas"]} envíos eran duplicados (mismas notas en pocos segundos, típico doble clic o recarga). '
            'Se evita desactivando el botón tras enviar y redirigiendo después del envío.'
        )
    todas = [v for r in respuestas for v in r["notas"].values() if v is not None]
    pct10 = pct(sum(v == 10 for v in todas), len(todas))
    if pct10 >= 50:
        textos.append(
            f'El {pct10}% de las notas son un 10: la escala se satura y las medias se parecen mucho entre sí. '
            'Por eso el informe se fija también en el % de notas bajas (≤6), que discrimina mejor.'
        )
    if sin_mapear:
        textos.append(f'Hay nombres de obra que no están en config.json: {", ".join(sin_mapear)}. Añádelos para unir sus versiones eu/es.')
    return textos


# --------------------------------------------------------------------------
# Formato
# --------------------------------------------------------------------------

def fmt(x, dec=1):
    return "–" if x is None else f"{x:.{dec}f}".replace(".", ",")


def fecha_corta(iso):
    return dt.datetime.fromisoformat(iso).strftime("%d/%m/%Y")


def esc(texto):
    return html.escape(str(texto))


# --------------------------------------------------------------------------
# Salidas
# --------------------------------------------------------------------------

def escribir_csv(respuestas, ruta):
    with open(ruta, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh, delimiter=";")  # Excel en español usa ';'
        w.writerow(["id", "obra", "nombre_original", "idioma", "fecha", "hora", "funcion", *PREGUNTAS, "nota_obra"])
        for r in respuestas:
            w.writerow([
                r["id"], r["obra"], r["nombre_original"], r["idioma"],
                r["cuando"].date().isoformat(), r["cuando"].strftime("%H:%M"), r["funcion"],
                *["" if r["notas"][g] is None else r["notas"][g] for g in PREGUNTAS],
                fmt(r["media"], 2),
            ])


ESTILO_BASE = """
:root {
  color-scheme: light;
  --bg: #f4f3ef; --surface: #fcfcfb; --border: #e3e2dd;
  --text: #0b0b0b; --text-2: #52514e; --text-3: #7d7c77;
  --series-1: #2a78d6; --track: #ebeae5;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --bg: #121211; --surface: #1a1a19; --border: #33332f;
    --text: #f0efec; --text-2: #c3c2b7; --text-3: #8f8e86;
    --series-1: #3987e5; --track: #2a2a27;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #121211; --surface: #1a1a19; --border: #33332f;
  --text: #f0efec; --text-2: #c3c2b7; --text-3: #8f8e86;
  --series-1: #3987e5; --track: #2a2a27;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text);
  font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
"""

# Rampa secuencial azul (claro -> oscuro) para el mapa de calor.
RAMPA = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7",
         "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"]


def color_celda(media, minimo=8.0, maximo=10.0):
    t = min(max((media - minimo) / (maximo - minimo), 0), 1)
    i = round(t * (len(RAMPA) - 1))
    return RAMPA[i], ("#0b0b0b" if i <= 4 else "#ffffff")


def svg_evolucion(obra):
    """Nota media por función a lo largo del tiempo (solo funciones fiables)."""
    fs = [f for f in obra["funciones"] if f["fiable"] and f["nota"] is not None]
    if len(fs) < 2:
        return '<p class="nota">Aún no hay suficientes funciones con ≥5 respuestas para ver la evolución.</p>'
    ancho, alto, mx, my = 640, 170, 34, 18
    y_min = min(7.0, min(f["nota"] for f in fs) // 1)
    xs = [mx + i * (ancho - 2 * mx) / (len(fs) - 1) for i in range(len(fs))]
    y = lambda v: my + (10 - v) / (10 - y_min) * (alto - 2 * my)
    partes = [f'<svg viewBox="0 0 {ancho} {alto}" class="evol" role="img" aria-label="Evolución de la nota por función">']
    for v in range(int(y_min), 11):
        partes.append(f'<line x1="{mx}" x2="{ancho - mx}" y1="{y(v):.1f}" y2="{y(v):.1f}" class="grid"/>')
        partes.append(f'<text x="{mx - 8}" y="{y(v) + 4:.1f}" class="eje" text-anchor="end">{v}</text>')
    puntos = " ".join(f"{x:.1f},{y(f['nota']):.1f}" for x, f in zip(xs, fs))
    partes.append(f'<polyline points="{puntos}" class="linea"/>')
    for x, f in zip(xs, fs):
        tip = f'{fecha_corta(f["inicio"])} · nota {fmt(f["nota"])} · {f["n"]} respuestas'
        partes.append(f'<circle cx="{x:.1f}" cy="{y(f["nota"]):.1f}" r="4" class="punto"/>')
        partes.append(f'<circle cx="{x:.1f}" cy="{y(f["nota"]):.1f}" r="12" class="hit" data-tip="{esc(tip)}"/>')
    partes.append(f'<text x="{xs[0]:.1f}" y="{alto - 2}" class="eje">{fecha_corta(fs[0]["inicio"])}</text>')
    partes.append(f'<text x="{xs[-1]:.1f}" y="{alto - 2}" class="eje" text-anchor="end">{fecha_corta(fs[-1]["inicio"])}</text>')
    partes.append("</svg>")
    return "".join(partes)


def html_informe(resumen, config):
    obras = resumen["obras"]
    cal = resumen["calidad"]
    etiqueta = lambda g: esc(config["preguntas"][g]["es"])

    tiles = [
        ("Respuestas válidas", f'{cal["validas"]}', f'de {cal["filas"]} filas recibidas'),
        ("Nota media de las obras", fmt(resumen["global"]["nota"]), "satisfacción, trama, reparto y recomendación"),
        ("La recomendarían", f'{resumen["global"]["pct_recomendaria"]}%', "dan 9 o 10 a «¿la recomendarías?»"),
        ("Funciones medidas", f'{sum(f["fiable"] for o in obras for f in o["funciones"])}',
         f'con ≥{config["limpieza"]["min_respuestas_funcion"]} respuestas cada una'),
    ]
    h = [f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Txalometroa · Informe</title>
<style>{ESTILO_BASE}
main {{ max-width: 1040px; margin: 0 auto; padding: 32px 16px 64px; }}
h1 {{ font-size: 28px; margin: 0 0 4px; }} h2 {{ font-size: 20px; margin: 40px 0 12px; }}
h3 {{ font-size: 17px; margin: 0; }}
.sub, .nota {{ color: var(--text-2); }} .nota {{ font-size: 13px; }}
.tiles {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 24px; }}
.card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; }}
.tile .k {{ color: var(--text-2); font-size: 13px; }} .tile .v {{ font-size: 32px; font-weight: 650; line-height: 1.2; }}
.tile .d {{ color: var(--text-3); font-size: 13px; }}
ul.conc {{ padding-left: 20px; }} ul.conc li {{ margin: 6px 0; }}
.scroll {{ overflow-x: auto; }}
table {{ border-collapse: separate; border-spacing: 2px; width: 100%; font-size: 14px; }}
th {{ text-align: left; font-weight: 600; color: var(--text-2); padding: 6px 8px; white-space: nowrap; }}
td {{ padding: 6px 8px; }}
td.c {{ text-align: center; border-radius: 4px; font-variant-numeric: tabular-nums; }}
.leyenda {{ display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-2); margin-top: 8px; }}
.leyenda .rampa {{ height: 10px; width: 160px; border-radius: 3px; background: linear-gradient(90deg, {", ".join(RAMPA)}); }}
.obra {{ margin-top: 16px; }}
.obra .cab {{ display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px; }}
.obra .nota-grande {{ font-size: 30px; font-weight: 650; }}
.obra .nota-grande small {{ font-size: 14px; color: var(--text-2); font-weight: 400; }}
.filas {{ display: grid; grid-template-columns: minmax(90px, 140px) 44px 1fr 64px; gap: 6px 12px; align-items: center; margin-top: 14px; font-size: 14px; }}
.filas .h {{ color: var(--text-3); font-size: 12px; }}
.filas .bloque {{ grid-column: 1 / -1; font-size: 12px; font-weight: 600; color: var(--text-2); text-transform: uppercase; letter-spacing: .04em; margin-top: 8px; }}
th[title] {{ cursor: help; }} tr.grupos th {{ text-align: center; border-bottom: 1px solid var(--border); }}
.barra {{ height: 10px; background: var(--track); border-radius: 4px; overflow: hidden; }}
.barra span {{ display: block; height: 100%; background: var(--series-1); border-radius: 0 4px 4px 0; }}
.num {{ font-variant-numeric: tabular-nums; }} .muted {{ color: var(--text-2); }}
svg.evol {{ width: 100%; height: auto; margin-top: 16px; overflow: visible; }}
svg .grid {{ stroke: var(--border); stroke-width: 1; }}
svg .eje {{ fill: var(--text-3); font-size: 11px; }}
svg .linea {{ fill: none; stroke: var(--series-1); stroke-width: 2; stroke-linejoin: round; }}
svg .punto {{ fill: var(--series-1); stroke: var(--surface); stroke-width: 2; }}
svg .hit {{ fill: transparent; cursor: pointer; }}
details {{ margin-top: 12px; }} summary {{ cursor: pointer; color: var(--text-2); font-size: 14px; }}
#tip {{ position: fixed; pointer-events: none; background: var(--text); color: var(--surface); font-size: 12px;
  padding: 6px 8px; border-radius: 6px; opacity: 0; transition: opacity .1s; z-index: 10; }}
</style></head><body><main>
<h1>Txalometroa · Informe de feedback</h1>
<p class="sub">Datos del {fecha_corta(resumen["periodo"]["desde"])} al {fecha_corta(resumen["periodo"]["hasta"])} · generado el {esc(resumen["generado"])}</p>
<div class="tiles">"""]
    for k, v, d in tiles:
        h.append(f'<div class="card tile"><div class="k">{k}</div><div class="v">{v}</div><div class="d">{d}</div></div>')
    h.append("</div><h2>Lo que dicen los datos</h2><div class=\"card\"><ul class=\"conc\">")
    h += [f"<li>{esc(t)}</li>" for t in resumen["conclusiones"]]
    h.append("</ul></div>")

    # Mapa de calor obra x pregunta
    h.append('<h2>Nota media por obra y pregunta</h2><div class="card"><div class="scroll"><table><tr class="grupos"><th></th><th></th>')
    for b, info in config["bloques"].items():
        span = sum(config["preguntas"][g]["bloque"] == b for g in PREGUNTAS)
        h.append(f'<th colspan="{span}">{esc(info["es"])}</th>')
    h.append("</tr><tr><th>Obra</th><th>n</th>")
    h += [f'<th title="{esc(config["preguntas"][g]["texto_es"])}">{etiqueta(g)}</th>' for g in PREGUNTAS]
    h.append("</tr>")
    for o in obras:
        h.append(f'<tr><td>{esc(o["es"])}</td><td class="num muted">{o["n"]}</td>')
        for g in PREGUNTAS:
            m = o["preguntas"][g]
            if m["media"] is None:
                h.append('<td class="c muted">–</td>')
                continue
            fondo, tinta = color_celda(m["media"])
            tip = f'{o["es"]} · {config["preguntas"][g]["es"]}: {fmt(m["media"], 2)} · {m["pct_10"]}% dieron 10 · {m["pct_bajo"]}% ≤6 · {m["n"]} respuestas'
            h.append(f'<td class="c" style="background:{fondo};color:{tinta}" data-tip="{esc(tip)}">{fmt(m["media"])}</td>')
        h.append("</tr>")
    h.append('</table></div><div class="leyenda">8,0 o menos<span class="rampa"></span>10</div>'
             '<p class="nota">Las obras con pocas respuestas (n bajo) no son comparables con el resto.</p></div>')

    # Ficha por obra
    h.append("<h2>Detalle por obra</h2>")
    for o in obras:
        h.append(f'<div class="card obra"><div class="cab"><div><h3>{esc(o["es"])}</h3>'
                 f'<div class="nota">{esc(o["eu"])} · {o["n"]} respuestas · {fecha_corta(o["primera"])} – {fecha_corta(o["ultima"])}</div></div>'
                 f'<div class="nota-grande">{fmt(o["nota"])}<small> /10 · {o["pct_recomendaria"]}% la recomendaría · {o["pct_insatisfechos"]}% insatisfechos</small></div></div>')
        h.append('<div class="filas"><span class="h">Pregunta</span><span class="h">Media</span><span class="h">% que dio un 10</span><span class="h">% ≤6</span>')
        bloque = None
        for g in PREGUNTAS:
            if config["preguntas"][g]["bloque"] != bloque:
                bloque = config["preguntas"][g]["bloque"]
                h.append(f'<span class="bloque">{esc(config["bloques"][bloque]["es"])}</span>')
            m = o["preguntas"][g]
            tip = f'{config["preguntas"][g]["texto_es"]} — {m["pct_10"]}% dieron 10 ({m["n"]} respuestas)'
            h.append(f'<span>{etiqueta(g)}</span><span class="num">{fmt(m["media"])}</span>'
                     f'<div class="barra" data-tip="{esc(tip)}"><span style="width:{m["pct_10"]}%"></span></div>'
                     f'<span class="num muted">{m["pct_bajo"]}%</span>')
        h.append("</div>")
        h.append(svg_evolucion(o))
        fiables = [f for f in o["funciones"] if f["fiable"]]
        sueltas = o["n"] - sum(f["n"] for f in fiables)
        h.append(f'<details><summary>Tabla de funciones ({len(fiables)})</summary><div class="scroll"><table><tr><th>Fecha</th><th>Respuestas</th><th>Nota</th><th>% muy satisfechos</th><th>% insatisfechos</th></tr>')
        for f in fiables:
            h.append(f'<tr><td>{dt.datetime.fromisoformat(f["inicio"]):%d/%m/%Y %H:%M}</td><td class="num">{f["n"]}</td>'
                     f'<td class="num">{fmt(f["nota"])}</td><td class="num">{f["pct_muy_satisfechos"]}%</td><td class="num">{f["pct_insatisfechos"]}%</td></tr>')
        h.append(f'</table></div><p class="nota">Solo funciones con ≥{config["limpieza"]["min_respuestas_funcion"]} respuestas. '
                 f'Otras {sueltas} respuestas llegaron sueltas (días después o en funciones con muy poca participación) y cuentan en la media de la obra.</p></details></div>')

    # Calidad
    d = cal["descartadas"]
    h.append(f"""<h2>Calidad de los datos</h2><div class="card">
<p>Filas recibidas: <b>{cal["filas"]}</b> · válidas: <b>{cal["validas"]}</b></p>
<ul><li>{d["vacias"]} envíos vacíos (todas las preguntas a 0)</li>
<li>{d["sin_obra"]} sin obra indicada</li>
<li>{d["duplicadas"]} duplicados (mismas notas en ≤{config["limpieza"]["segundos_duplicado"]} s)</li></ul>
<p class="nota">Criterios: los deslizadores del formulario empiezan en 0, así que un 0 es «no contestada» y la escala real es 1–10.
La nota de cada obra es la media de {", ".join(config["preguntas"][g]["es"].lower() for g in config["nota_obra"])}; las preguntas de fidelidad y de la localidad se analizan aparte. Las versiones eu/es de cada obra se unen según config.json.
Una función es un bloque de respuestas de la misma obra sin huecos de más de {config["limpieza"]["horas_entre_funciones"]} h.</p></div>
</main><div id="tip"></div>{SCRIPT_TIP}</body></html>""")
    return "".join(h)


SCRIPT_TIP = """<script>
(() => {
  const tip = document.getElementById('tip');
  document.addEventListener('mousemove', e => {
    const t = e.target.closest('[data-tip]');
    if (!t) { tip.style.opacity = 0; return; }
    tip.textContent = t.dataset.tip;
    const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + 'px'; tip.style.top = (e.clientY + 14) + 'px'; tip.style.opacity = 1;
  });
})();
</script>"""


def html_widget(resumen, config):
    """Bloque público: se incrusta con un <iframe>. Idioma con ?lang=eu|es,
    una sola obra con ?obra=<id>, tema oscuro con ?tema=oscuro."""
    pub = config["publicacion"]
    datos = {
        "preguntas": {g: config["preguntas"][g] for g in config["nota_obra"]} if pub.get("mostrar_preguntas", True) else None,
        "obras": [
            {
                "id": o["id"], "eu": o["eu"], "es": o["es"], "n": o["n"], "nota": o["nota"],
                "pct": o["pct_recomendaria"],
                "preguntas": {g: o["preguntas"][g]["media"] for g in config["nota_obra"]} if pub.get("mostrar_preguntas", True) else None,
            }
            for o in resumen["obras"] if o["n"] >= pub["min_respuestas_obra"]
        ],
        "actualizado": resumen["periodo"]["hasta"],
    }
    return f"""<!doctype html><html lang="eu"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Txalometroa</title>
<style>{ESTILO_BASE}
body {{ background: transparent; padding: 16px; }}
.txalo {{ max-width: 720px; margin: 0 auto; }}
.txalo h2 {{ font-size: 18px; margin: 0 0 12px; }}
.lista {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }}
.obra {{ background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }}
.obra .t {{ font-weight: 600; }}
.obra .v {{ font-size: 34px; font-weight: 700; line-height: 1.1; margin-top: 8px; font-variant-numeric: tabular-nums; }}
.obra .v small {{ font-size: 15px; color: var(--text-2); font-weight: 400; }}
.obra .d {{ color: var(--text-2); font-size: 13px; margin-top: 4px; }}
.obra .p {{ display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; font-size: 13px; margin-top: 10px; color: var(--text-2); }}
.pie {{ color: var(--text-3); font-size: 12px; margin-top: 12px; }}
</style></head><body><div class="txalo" id="txalo"></div>
<script>
const DATOS = {json.dumps(datos, ensure_ascii=False)};
const TXT = {{
  eu: {{ titulo: "Ikusleen iritzia", resp: n => `${{n}} balorazio`, pct: p => `%${{p}}k gomendatuko luke`, act: f => `Eguneratua: ${{f}}` }},
  es: {{ titulo: "La opinión del público", resp: n => `${{n}} valoraciones`, pct: p => `El ${{p}}% la recomendaría`, act: f => `Actualizado: ${{f}}` }}
}};
const q = new URLSearchParams(location.search);
const lang = q.get("lang") === "es" ? "es" : "eu";
if (q.get("tema") === "oscuro") document.documentElement.dataset.theme = "dark";
else document.documentElement.dataset.theme = "light";
document.documentElement.lang = lang;
const t = TXT[lang], num = x => x.toFixed(1).replace(".", ",");
const obras = DATOS.obras.filter(o => !q.get("obra") || o.id === q.get("obra"));
const el = (tag, cls, txt) => {{ const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }};
const raiz = document.getElementById("txalo");
raiz.append(el("h2", null, t.titulo));
const lista = el("div", "lista");
for (const o of obras) {{
  const c = el("div", "obra");
  c.append(el("div", "t", o[lang]));
  const v = el("div", "v", num(o.nota)); v.append(el("small", null, " / 10")); c.append(v);
  c.append(el("div", "d", t.resp(o.n) + " · " + t.pct(o.pct)));
  if (o.preguntas) {{
    const p = el("div", "p");
    for (const [g, m] of Object.entries(o.preguntas)) if (m != null) {{ p.append(el("span", null, DATOS.preguntas[g][lang])); p.append(el("span", null, num(m))); }}
    c.append(p);
  }}
  lista.append(c);
}}
raiz.append(lista);
const [y, m, d] = DATOS.actualizado.split("-");
raiz.append(el("div", "pie", t.act(`${{d}}/${{m}}/${{y}}`)));
</script></body></html>"""


TEXTOS_BLOQUE = {
    "eu": {"titulo": "Ikusleen iritzia", "resp": "{n} balorazio", "pct": "%{p}k gomendatuko luke", "act": "Eguneratua: {f}"},
    "es": {"titulo": "La opinión del público", "resp": "{n} valoraciones", "pct": "El {p}% la recomendaría", "act": "Actualizado: {f}"},
}


def html_bloque_wordpress(resumen, config, lang):
    """Fragmento estático (sin JavaScript) para pegar en un bloque «HTML
    personalizado» de WordPress. Los estilos van acotados a .txalo-emaitzak
    para no afectar al resto de la página."""
    t = TEXTOS_BLOQUE[lang]
    pub = config["publicacion"]
    tarjetas = []
    for o in resumen["obras"]:
        if o["n"] < pub["min_respuestas_obra"]:
            continue
        preguntas = ""
        if pub.get("mostrar_preguntas", True):
            preguntas = '<dl class="txalo-p">' + "".join(
                f'<dt>{esc(config["preguntas"][g][lang])}</dt><dd>{fmt(o["preguntas"][g]["media"])}</dd>'
                for g in config["nota_obra"]) + "</dl>"
        tarjetas.append(
            f'<div class="txalo-obra"><div class="txalo-t">{esc(o[lang])}</div>'
            f'<div class="txalo-v">{fmt(o["nota"])}<small> / 10</small></div>'
            f'<div class="txalo-d">{t["resp"].format(n=o["n"])} · {t["pct"].format(p=o["pct_recomendaria"])}</div>{preguntas}</div>'
        )
    return f"""<!-- Txalometroa: generado por analizar.py el {esc(resumen["generado"])}. No editar a mano; vuelve a generarlo y pégalo entero. -->
<style>
.txalo-emaitzak {{ margin: 24px 0; }}
.txalo-emaitzak h3 {{ margin: 0 0 12px; }}
.txalo-emaitzak .txalo-lista {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }}
.txalo-emaitzak .txalo-obra {{ border: 1px solid rgba(0,0,0,.12); border-radius: 12px; padding: 16px; }}
.txalo-emaitzak .txalo-t {{ font-weight: 600; }}
.txalo-emaitzak .txalo-v {{ font-size: 34px; font-weight: 700; line-height: 1.1; margin-top: 8px; }}
.txalo-emaitzak .txalo-v small {{ font-size: 15px; font-weight: 400; opacity: .7; }}
.txalo-emaitzak .txalo-d, .txalo-emaitzak .txalo-pie {{ font-size: 13px; opacity: .75; margin-top: 4px; }}
.txalo-emaitzak .txalo-p {{ display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; font-size: 13px; margin: 10px 0 0; }}
.txalo-emaitzak .txalo-p dd {{ margin: 0; }}
</style>
<div class="txalo-emaitzak" lang="{lang}">
<h3>{t["titulo"]}</h3>
<div class="txalo-lista">{"".join(tarjetas)}</div>
<div class="txalo-pie">{t["act"].format(f=fecha_corta(resumen["periodo"]["hasta"]))}</div>
</div>
"""


# --------------------------------------------------------------------------

def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("export", help="fichero exportado por la web (.xls/.tsv/.csv)")
    ap.add_argument("--config", default=Path(__file__).with_name("config.json"))
    ap.add_argument("--salida", default=Path(__file__).with_name("salida"))
    args = ap.parse_args()

    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    filas = leer_export(args.export)
    respuestas, descartes, sin_mapear = limpiar(filas, config)
    if not respuestas:
        sys.exit("No hay respuestas válidas en el fichero.")
    asignar_funciones(respuestas, config)
    respuestas.sort(key=lambda r: r["cuando"])
    obras = analizar(respuestas, config)

    resumen = {
        "generado": dt.datetime.now().strftime("%d/%m/%Y %H:%M"),
        "fuente": Path(args.export).name,
        "periodo": {"desde": respuestas[0]["cuando"].date().isoformat(), "hasta": respuestas[-1]["cuando"].date().isoformat()},
        "calidad": {"filas": len(filas), "validas": len(respuestas), "descartadas": descartes, "obras_sin_mapear": sin_mapear},
        "global": metricas(respuestas, config),
        "preguntas": {g: config["preguntas"][g] for g in PREGUNTAS},
        "obras": obras,
    }
    resumen["conclusiones"] = conclusiones(obras, descartes, len(filas), respuestas, sin_mapear, config)

    salida = Path(args.salida)
    salida.mkdir(parents=True, exist_ok=True)
    escribir_csv(respuestas, salida / "respuestas_limpias.csv")
    (salida / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=2), encoding="utf-8")
    (salida / "informe.html").write_text(html_informe(resumen, config), encoding="utf-8")
    (salida / "widget.html").write_text(html_widget(resumen, config), encoding="utf-8")
    for lang in ("eu", "es"):
        (salida / f"bloque_wordpress_{lang}.html").write_text(html_bloque_wordpress(resumen, config, lang), encoding="utf-8")

    print(f"{len(filas)} filas -> {len(respuestas)} válidas  (descartadas: {descartes})")
    for o in obras:
        print(f'  {o["es"]:<32} n={o["n"]:<4} nota={fmt(o["nota"], 2)}  funciones medidas={sum(f["fiable"] for f in o["funciones"])}')
    if sin_mapear:
        print("  Obras sin mapear en config.json:", ", ".join(sin_mapear))
    print(f"Ficheros generados en {salida.resolve()}")


if __name__ == "__main__":
    main()
