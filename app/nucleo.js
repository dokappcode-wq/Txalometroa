// Núcleo del Txalometroa: lectura del export, limpieza, análisis y bloque
// público. Lo comparten la app (app/txalometroa.src.html) y la réplica de la
// web (replica/replica.src.html); construir.py lo incrusta en las dos.

const PREG = ["GAL1", "GAL2", "GAL3", "GAL4", "GAL5", "GAL6", "GAL7"];

// ---------------------------------------------------------------- Lectura

const BOM = String.fromCharCode(0xFEFF);

function parsearTexto(texto) {
  if (texto.startsWith(BOM)) texto = texto.slice(1);
  const primera = texto.split(/\r?\n/, 1)[0];
  const delim = primera.includes("\t") ? "\t" : primera.includes(";") ? ";" : ",";
  const filas = [];
  let fila = [], campo = "", comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === delim) { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); filas.push(fila); fila = []; campo = "";
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter(f => f.some(v => String(v).trim() !== ""));
}

function aObjetos(matriz) {
  const cab = matriz[0].map(h => String(h).trim().toUpperCase());
  const faltan = ["PRODUKZIOA", "NOIZ", ...PREG].filter(c => !cab.includes(c));
  if (faltan.length) throw new Error(`Al fichero le faltan columnas: ${faltan.join(", ")}. ¿Es el export del Txalometroa?`);
  return matriz.slice(1).map(f => Object.fromEntries(cab.map((h, i) => [h, f[i] ?? ""])));
}

function cargarSheetJS() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = ok; s.onerror = () => ko(new Error("No se pudo cargar el lector de Excel. Guarda el fichero como CSV o texto con tabulaciones."));
    document.head.append(s);
  });
}

async function leerFichero(buf) {
  const b = new Uint8Array(buf.slice(0, 4));
  const binario = (b[0] === 0xD0 && b[1] === 0xCF) || (b[0] === 0x50 && b[1] === 0x4B);
  if (binario) {
    await cargarSheetJS();
    const libro = XLSX.read(buf, { type: "array", cellDates: true });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filas = aObjetos(XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: "" }));
    // Las fechas de Excel llegan como Date: se pasan a texto local para poder guardarlas.
    for (const f of filas) if (f.NOIZ instanceof Date) {
      const d = f.NOIZ;
      f.NOIZ = `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())} ${dd(d.getHours())}:${dd(d.getMinutes())}:${dd(d.getSeconds())}`;
    }
    return filas;
  }
  let texto;
  try { texto = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
  catch (e) { texto = new TextDecoder("windows-1252").decode(buf); }
  return aObjetos(parsearTexto(texto));
}

function parsearFecha(v) {
  if (v instanceof Date) return isNaN(v) ? null : v;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return new Date(+m[3], m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0));
  return null;
}

// ---------------------------------------------------------------- Limpieza y análisis

const slug = s => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const media = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (parte, total) => total ? Math.round(100 * parte / total) : 0;
const r2 = x => Math.round(x * 100) / 100;

function limpiar(filas, cfg) {
  const alias = {};
  for (const [id, o] of Object.entries(cfg.obras)) for (const n of o.alias) alias[n.trim().toLowerCase()] = id;
  const validas = [], sinMapear = new Set(), ultima = {};
  const descartes = { vacias: 0, sin_obra: 0, duplicadas: 0, sin_fecha: 0 };

  for (const f of filas) {
    const notas = {};
    for (const g of PREG) { const v = parseInt(f[g], 10) || 0; notas[g] = v >= 1 && v <= 10 ? v : null; }
    if (PREG.every(g => notas[g] === null)) { descartes.vacias++; continue; }
    const nombre = String(f.PRODUKZIOA ?? "").trim();
    if (!nombre) { descartes.sin_obra++; continue; }
    const cuando = parsearFecha(f.NOIZ);
    if (!cuando) { descartes.sin_fecha++; continue; }
    let obra = alias[nombre.toLowerCase()];
    if (!obra) { obra = slug(nombre); sinMapear.add(nombre); }

    const prev = ultima[obra];
    const firma = PREG.map(g => notas[g]).join(",");
    if (prev && prev.firma === firma && (cuando - prev.cuando) / 1000 <= cfg.limpieza.segundos_duplicado) { descartes.duplicadas++; continue; }

    const deObra = cfg.nota_obra.map(g => notas[g]).filter(v => v !== null);
    const r = { id: f.ID, obra, nombre, idioma: String(f.HIZKUNTZA ?? "").trim(), cuando, notas, firma,
                media: deObra.length ? media(deObra) : null };
    validas.push(r); ultima[obra] = r;
  }
  validas.sort((a, b) => a.cuando - b.cuando);

  // Funciones: bloques de respuestas de una obra sin huecos de más de N horas.
  const hueco = cfg.limpieza.horas_entre_funciones * 3600e3, finPorObra = {};
  for (const r of validas) {
    const act = finPorObra[r.obra];
    if (!act || r.cuando - act.fin > hueco) finPorObra[r.obra] = { id: `${r.obra}-${+r.cuando}`, fin: r.cuando };
    finPorObra[r.obra].fin = r.cuando;
    r.funcion = finPorObra[r.obra].id;
  }
  return { validas, descartes, sinMapear: [...sinMapear].sort() };
}

function metricas(rs, cfg) {
  const ms = rs.map(r => r.media).filter(m => m !== null);
  const rec = rs.map(r => r.notas[cfg.pregunta_recomendacion]).filter(v => v !== null);
  const prom = pct(rec.filter(v => v >= 9).length, rec.length), detr = pct(rec.filter(v => v <= 6).length, rec.length);
  return {
    n: rs.length,
    nota: ms.length ? r2(media(ms)) : null,
    pct_muy_satisfechos: pct(ms.filter(m => m >= 9).length, ms.length),
    pct_insatisfechos: pct(ms.filter(m => m <= 6).length, ms.length),
    pct_recomendaria: prom,
    indice_recomendacion: rec.length ? prom - detr : null,
  };
}

function metricasPregunta(rs, g) {
  const vs = rs.map(r => r.notas[g]).filter(v => v !== null);
  return { n: vs.length, media: vs.length ? r2(media(vs)) : null,
           pct_10: pct(vs.filter(v => v === 10).length, vs.length), pct_bajo: pct(vs.filter(v => v <= 6).length, vs.length) };
}

function analizar(filas, cfg) {
  const { validas, descartes, sinMapear } = limpiar(filas, cfg);
  if (!validas.length) throw new Error("No hay ninguna respuesta válida en el fichero.");
  const ids = [...new Set(validas.map(r => r.obra))];
  const obras = ids.map(id => {
    const rs = validas.filter(r => r.obra === id);
    const info = cfg.obras[id] || { eu: rs[0].nombre, es: rs[0].nombre };
    const funciones = [...new Set(rs.map(r => r.funcion))].map(fid => {
      const fr = rs.filter(r => r.funcion === fid);
      return { id: fid, inicio: fr[0].cuando, fin: fr.at(-1).cuando, fiable: fr.length >= cfg.limpieza.min_respuestas_funcion, ...metricas(fr, cfg) };
    });
    return { id, eu: info.eu, es: info.es, imagen: info.imagen || "", primera: rs[0].cuando, ultima: rs.at(-1).cuando, ...metricas(rs, cfg),
             preguntas: Object.fromEntries(PREG.map(g => [g, metricasPregunta(rs, g)])), funciones };
  }).sort((a, b) => b.n - a.n);

  const res = { generado: new Date(), filas: filas.length, validas, descartes, sinMapear, obras,
                desde: validas[0].cuando, hasta: validas.at(-1).cuando, global: metricas(validas, cfg) };
  res.conclusiones = conclusiones(res, cfg);
  return res;
}

function conclusiones(res, cfg) {
  const t = [], et = g => cfg.preguntas[g].es;
  for (const o of res.obras) {
    if (o.n < cfg.publicacion.min_respuestas_obra) { t.push(`«${o.es}» solo tiene ${o.n} respuestas: aún no es representativo.`); continue; }
    const ms = cfg.nota_obra.filter(g => o.preguntas[g].media !== null).map(g => [g, o.preguntas[g].media]);
    const floja = ms.reduce((a, b) => b[1] < a[1] ? b : a), fuerte = ms.reduce((a, b) => b[1] > a[1] ? b : a);
    const ind = o.indice_recomendacion;
    t.push(`«${o.es}»: ${fmt(o.nota)} de nota con ${o.n} respuestas; el ${o.pct_recomendaria}% la recomendaría (índice de recomendación ${ind >= 0 ? "+" : ""}${ind}). ` +
           `Lo mejor valorado: ${et(fuerte[0]).toLowerCase()} (${fmt(fuerte[1])}); lo más flojo: ${et(floja[0]).toLowerCase()} (${fmt(floja[1])}).`);
    const fiables = o.funciones.filter(f => f.fiable && f.nota !== null);
    if (fiables.length >= 3) {
      const peor = fiables.reduce((a, b) => b.nota < a.nota ? b : a);
      if (o.nota - peor.nota >= 0.5)
        t.push(`«${o.es}»: la función del ${fecha(peor.inicio)} quedó por debajo (${fmt(peor.nota)} con ${peor.n} respuestas). Vale la pena revisar qué pasó ese día.`);
    }
  }
  const bloque = b => PREG.filter(g => cfg.preguntas[g].bloque === b).map(g => [g, metricasPregunta(res.validas, g)]);
  const fid = bloque("publico");
  if (fid.length) t.push("Fidelidad: " + fid.map(([g, m]) => `«${et(g)}» ${fmt(m.media)} (${m.pct_bajo}% da 6 o menos)`).join("; ") + ". Es lo que indica si el público volverá.");
  for (const [g, m] of bloque("localidad"))
    t.push(`«${et(g)}» saca ${fmt(m.media)}, pero no habla de la obra sino del municipio: no entra en la nota de las obras. El formulario no guarda la localidad, así que solo se puede cruzar por fecha de función.`);
  const d = res.descartes;
  if (d.vacias) t.push(`${d.vacias} envíos llegaron con todos los deslizadores a 0 (se pulsó TXALOTU sin mover nada). El formulario debería exigir al menos una respuesta.`);
  if (d.sin_obra) t.push(`${d.sin_obra} respuestas llegaron sin obra y no se pueden usar; el formulario no debería guardar un envío si no sabe a qué obra pertenece.`);
  if (d.duplicadas) t.push(`${d.duplicadas} envíos eran duplicados (mismas notas en pocos segundos, típico doble clic o recarga). Se evita desactivando el botón tras enviar.`);
  const todas = res.validas.flatMap(r => PREG.map(g => r.notas[g])).filter(v => v !== null);
  const p10 = pct(todas.filter(v => v === 10).length, todas.length);
  if (p10 >= 50) t.push(`El ${p10}% de las notas son un 10: la escala se satura y las medias se parecen mucho. Por eso conviene mirar también el % de notas bajas (≤6) y el % que la recomendaría.`);
  if (res.sinMapear.length) t.push(`Hay nombres de obra que no están en Ajustes: ${res.sinMapear.join(", ")}. Añádelos para unir sus versiones eu/es.`);
  return t;
}

// ---------------------------------------------------------------- Formato

const fmt = (x, d = 1) => x === null || x === undefined ? "–" : x.toFixed(d).replace(".", ",");
const dd = n => String(n).padStart(2, "0");
const fecha = d => `${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${d.getFullYear()}`;
const fechaHora = d => `${fecha(d)} ${dd(d.getHours())}:${dd(d.getMinutes())}`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------------------------------------------------------------- Bloque público (reseña)

const TXT_BLOQUE = {
  eu: { titulo: "Ikusleen iritzia", sub: "Txalometroan jasotako balorazioak, 1etik 10era",
        resp: n => `${n} balorazio`, pct: p => `%${p}k gomendatuko luke`, act: f => `Eguneratua: ${f}` },
  es: { titulo: "La opinión del público", sub: "Valoraciones recogidas en el Txalometro, del 1 al 10",
        resp: n => `${n} valoraciones`, pct: p => `El ${p}% la recomendaría`, act: f => `Actualizado: ${f}` },
};

const CSS_BLOQUE = `
.txalo-emaitzak { --txalo-gorria: #ff3c42; --txalo-testua: #595b60; margin: 40px 0; color: var(--txalo-testua); }
.txalo-emaitzak * { box-sizing: border-box; }
.txalo-emaitzak .txalo-izenburua { font-weight: 300; font-size: 2.2rem; letter-spacing: .03em; text-align: center; margin: 0; color: var(--txalo-testua); }
.txalo-emaitzak .txalo-azpi { text-align: center; font-size: .95rem; margin: 6px 0 28px; opacity: .8; }
.txalo-emaitzak .txalo-lista { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 28px; }
.txalo-emaitzak .txalo-obra { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 28px rgba(30, 20, 20, .10); display: flex; flex-direction: column; }
.txalo-emaitzak .txalo-irudia { position: relative; aspect-ratio: 3 / 2; background: #4d3733; }
.txalo-emaitzak .txalo-irudia img { display: block; width: 100%; height: 100%; object-fit: cover; margin: 0; }
.txalo-emaitzak .txalo-irudia::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.72)); }
.txalo-emaitzak .txalo-izena { position: absolute; left: 20px; right: 120px; bottom: 16px; z-index: 1; margin: 0; color: #fff; font-weight: 700; font-size: 1.45rem; line-height: 1.15; }
.txalo-emaitzak .txalo-nota { position: absolute; right: 16px; bottom: -52px; z-index: 2; width: 104px; border-radius: 14px; background: #fdeec7;
  padding: 10px 10px 8px; display: grid; justify-items: center; gap: 2px; box-shadow: 0 6px 18px rgba(0,0,0,.22); }
.txalo-emaitzak .txalo-nota svg { display: block; width: 100%; height: auto; }
.txalo-emaitzak .txalo-nota span { font-weight: 700; font-size: 1.5rem; line-height: 1; color: #231f20; font-variant-numeric: tabular-nums; }
.txalo-emaitzak .txalo-nota small { font-size: .7rem; font-weight: 400; color: var(--txalo-testua); margin-left: 2px; }
.txalo-emaitzak .txalo-gorputza { padding: 18px 20px 22px; display: grid; gap: 16px; }
.txalo-emaitzak .txalo-datuak { display: flex; flex-wrap: wrap; gap: 6px; margin-right: 118px; min-height: 40px; font-size: .82rem; }
.txalo-emaitzak .txalo-txip { background: #f2f2f3; border-radius: 999px; padding: 3px 10px; }
.txalo-emaitzak .txalo-txip.gorria { background: #ffe8e9; color: #c4161c; font-weight: 600; }
.txalo-emaitzak .txalo-barrak { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; font-size: .9rem; }
.txalo-emaitzak .txalo-barrak li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; margin: 0; padding: 0; }
.txalo-emaitzak .txalo-barrak li::before { content: none; }
.txalo-emaitzak .txalo-barrak b { font-weight: 700; color: #231f20; font-variant-numeric: tabular-nums; }
.txalo-emaitzak .txalo-barra { grid-column: 1 / -1; height: 6px; background: #eeeeef; border-radius: 3px; overflow: hidden; }
.txalo-emaitzak .txalo-barra i { display: block; height: 100%; background: var(--txalo-gorria); border-radius: 3px; }
.txalo-emaitzak .txalo-pie { text-align: center; font-size: .82rem; opacity: .7; margin: 24px 0 0; }`;

// Genera la reseña pública como HTML estático (sin JavaScript), para pegar en
// un bloque «HTML personalizado» de WordPress. opts.obras limita a esas obras.
function bloqueWordpress(res, cfg, lang, opts = {}) {
  const t = TXT_BLOQUE[lang], pub = cfg.publicacion;
  const preguntas = pub.preguntas_publicas || cfg.nota_obra;
  const obras = res.obras.filter(o => o.n >= pub.min_respuestas_obra && o.nota !== null && (!opts.obras || opts.obras.includes(o.id)));
  const tarjetas = obras.map(o => {
    const img = o.imagen ? `<img src="${esc(o.imagen)}" alt="${esc(o[lang])}" loading="lazy">` : "";
    const barras = preguntas.filter(g => o.preguntas[g].media !== null).map(g => {
      const m = o.preguntas[g].media;
      return `<li><span>${esc(cfg.preguntas[g][lang])}</span><b>${fmt(m)}</b><span class="txalo-barra"><i style="width:${Math.round(m * 10)}%"></i></span></li>`;
    }).join("");
    return `<article class="txalo-obra">
<div class="txalo-irudia">${img}<h4 class="txalo-izena">${esc(o[lang])}</h4>
<div class="txalo-nota">${svgLogoLiquido(o.nota)}<span>${fmt(o.nota)}<small>/ 10</small></span></div></div>
<div class="txalo-gorputza"><div class="txalo-datuak"><span class="txalo-txip">${t.resp(o.n)}</span><span class="txalo-txip gorria">${t.pct(o.pct_recomendaria)}</span></div>
<ul class="txalo-barrak">${barras}</ul></div>
</article>`;
  }).join("\n");
  const cabecera = opts.sinCabecera ? "" : `<h3 class="txalo-izenburua">${t.titulo}</h3>\n<p class="txalo-azpi">${t.sub}</p>\n`;
  return `<!-- Txalometroa · generado el ${fechaHora(res.generado)}. No lo edites a mano: vuelve a generarlo y pégalo entero. -->
<style>${CSS_BLOQUE}
</style>
<div class="txalo-emaitzak" lang="${lang}">
${cabecera}<div class="txalo-lista">
${tarjetas}
</div>
<p class="txalo-pie">${t.act(fecha(res.hasta))}</p>
</div>`;
}

// ---------------------------------------------------------------- Alta de obras desde el export

// Por cada nombre de obra del export: respuestas, idioma predominante y días con respuestas.
function infoNombres(filas) {
  const info = {};
  for (const f of filas) {
    const n = String(f.PRODUKZIOA ?? "").trim(); if (!n) continue;
    const i = info[n] ||= { n: 0, eu: 0, es: 0, dias: new Set() };
    i.n++;
    const h = String(f.HIZKUNTZA ?? "").trim().toLowerCase();
    if (h === "eu" || h === "es") i[h]++;
    const d = parsearFecha(f.NOIZ); if (d) i.dias.add(fecha(d));
  }
  for (const i of Object.values(info)) i.idioma = i.eu > i.es ? "eu" : "es";
  return info;
}

// Si dos nombres en idiomas distintos reciben respuestas los mismos días, lo más
// probable es que sean la misma obra (versión eu y versión es). Puntuación: parte
// de los días del nombre con menos días que coinciden con el otro. Se empareja de
// mayor a menor puntuación, cada nombre una sola vez. Devuelve { i: j } con j < i.
function emparejar(nombres, info) {
  const pares = [];
  for (let i = 0; i < nombres.length; i++) for (let j = 0; j < i; j++) {
    const a = info[nombres[i]], b = info[nombres[j]];
    if (!a || !b || a.idioma === b.idioma) continue;
    const comunes = [...a.dias].filter(d => b.dias.has(d)).length;
    const p = comunes / Math.min(a.dias.size, b.dias.size);
    if (comunes && p >= 0.35) pares.push({ i, j, p });
  }
  const usado = new Set(), res = {};
  for (const { i, j } of pares.sort((x, y) => y.p - x.p)) {
    if (usado.has(i) || usado.has(j)) continue;
    usado.add(i); usado.add(j); res[i] = j;
  }
  return res;
}

// Tabla para decidir, por cada nombre nuevo del export, si es una obra nueva o la
// misma que otra. Los controles llevan id nueva-<i> y foto-<i>.
function htmlTablaObrasNuevas(nombres, cfg, filas) {
  const info = infoNombres(filas), parejas = emparejar(nombres, info);
  const filasHtml = nombres.map((n, i) => {
    const sug = parejas[i] ?? null;
    const opciones = [`<option value="nueva">Una obra nueva</option>`,
      ...Object.entries(cfg.obras).map(([id, o]) => `<option value="id:${esc(id)}">La misma que «${esc(o.es)}»</option>`),
      ...nombres.slice(0, i).map((m, j) => `<option value="n:${j}" ${j === sug ? "selected" : ""}>La misma que «${esc(m)}»${j === sug ? " (sugerido)" : ""}</option>`)];
    return `<tr><td><b>${esc(n)}</b></td><td class="num">${info[n]?.n ?? 0}</td><td>${info[n]?.idioma ?? "–"}</td>
      <td><select id="nueva-${i}" aria-label="Qué es «${esc(n)}»">${opciones.join("")}</select>${sug !== null ? `<span class="sugerido">Mismas fechas que «${esc(nombres[sug])}»</span>` : ""}</td>
      <td><input id="foto-${i}" type="url" aria-label="Foto de «${esc(n)}»" placeholder="https://…/foto.jpg (opcional)"></td></tr>`;
  }).join("");
  return `<table class="nuevas"><tr><th>Nombre en el export</th><th>Respuestas</th><th>Idioma</th><th>Es…</th><th>Foto</th></tr>${filasHtml}</table>`;
}

// Lee las decisiones de la tabla anterior y crea o amplía las obras en cfg.
function aplicarObrasNuevas(cfg, nombres, filas) {
  const info = infoNombres(filas);
  const valor = i => document.getElementById(`nueva-${i}`).value;
  const foto = i => document.getElementById(`foto-${i}`).value.trim();
  const idDe = {};
  nombres.forEach((n, i) => {
    if (valor(i) !== "nueva") return;
    let id = slug(n) || "obra", k = 2;
    while (cfg.obras[id]) id = `${slug(n) || "obra"}-${k++}`;
    cfg.obras[id] = { eu: n, es: n, alias: [n], imagen: foto(i) };
    idDe[i] = id;
  });
  const destino = i => { const v = valor(i); return v === "nueva" ? idDe[i] : v.startsWith("id:") ? v.slice(3) : destino(+v.slice(2)); };
  nombres.forEach((n, i) => {
    if (valor(i) === "nueva") return;
    const o = cfg.obras[destino(i)];
    if (!o.alias.includes(n)) o.alias.push(n);
    o[info[n]?.idioma ?? "es"] = n;
    if (!o.imagen && foto(i)) o.imagen = foto(i);
  });
  return cfg;
}

// ---------------------------------------------------------------- Piezas visuales

// Logo de la app (A de Hika): forma negra en «<» y A roja con su hueco triangular.
const LOGO = {
  vista: "0 0 400 380",
  negro: "M103 50 L214 50 L121 183 L217 338 L110 338 L50 246 L44 114 Z",
  rojo: "M253 7 L292 57 L280 71 L315 122 L330 120 L366 170 L148 221 L122 186 Z",
  hueco: "M181 173 L212 141 L217 167 Z",
};

let idLiquido = 0;
// nota: 0–10. Devuelve un SVG con la forma vacía y el líquido (con ola) hasta nota/10.
function svgLogoLiquido(nota, opts = {}) {
  const id = `liq${++idLiquido}`, nivel = Math.max(0, Math.min(1, (nota ?? 0) / 10));
  const arriba = 7, abajo = 338, y = abajo - (abajo - arriba) * nivel;
  const ola = "M0 0 Q 50 -14 100 0 T 200 0 T 300 0 T 400 0 T 500 0 T 600 0 T 700 0 T 800 0 L 800 400 L 0 400 Z";
  const vacio = opts.vacio || "rgba(35,31,32,.14)";
  const animar = opts.animar !== false;
  return `<svg class="logo-liquido" viewBox="${LOGO.vista}" role="img" aria-label="${opts.etiqueta || `Nota ${fmt(nota)} de 10`}">
  <defs>
    <mask id="${id}-ola" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="380"><g transform="translate(0 ${y.toFixed(1)})">
      ${animar ? `<animateTransform attributeName="transform" type="translate" from="0 ${abajo + 20}" to="0 ${y.toFixed(1)}" dur="1.8s" fill="freeze" calcMode="spline" keySplines=".2 .7 .3 1" keyTimes="0;1"/>` : ""}
      <path d="${ola}" fill="#fff">${animar ? `<animateTransform attributeName="transform" type="translate" from="0 0" to="-200 0" dur="2.6s" repeatCount="indefinite"/>` : ""}</path>
    </g></mask>
  </defs>
  <g fill="${vacio}"><path d="${LOGO.negro}"/><path d="${LOGO.rojo}" fill-rule="evenodd"/></g>
  <g mask="url(#${id}-ola)">
    <path d="${LOGO.negro}" fill="#0d0d0d"/>
    <path d="${LOGO.rojo} ${LOGO.hueco}" fill="#c8361b" fill-rule="evenodd"/>
  </g>
  <path d="${LOGO.hueco}" fill="var(--hueco, #fdeec7)"/>
</svg>`;
}

// Máscara de teatro. k: -1 (drama) … 1 (comedia). relleno: 0–1 (parte roja, de izquierda a derecha).
let idMascara = 0;
function svgMascara(k, relleno = 1, opts = {}) {
  const id = `msk${++idMascara}`;
  const sube = k;                       // >0 sonríe, <0 llora
  // Boca: comisuras arriba (comedia) o abajo (drama); la abertura se agranda en los extremos.
  const cy = 76 - 7 * sube, abre = 6 + 8 * Math.abs(k);
  const boca = sube >= 0
    ? `M28 ${cy} Q50 ${cy + 4 + abre * 1.6} 72 ${cy} Q50 ${cy + 6} 28 ${cy} Z`
    : `M28 ${cy} Q50 ${cy - 6 - abre * 1.3} 72 ${cy} Q50 ${cy - 2} 28 ${cy} Z`;
  // Ojos: media luna feliz o caída triste.
  const ojo = (x, lado) => {
    const caida = -sube * 5 * lado;      // la esquina exterior cae en drama
    return sube >= 0
      ? `M${x - 10} ${44 + 2} Q${x} ${32 + 2 - 6 * sube} ${x + 10} ${44 + 2} Q${x} ${40 + 2} ${x - 10} ${44 + 2} Z`
      : `M${x - 10} ${42 + (lado < 0 ? -caida : 0)} Q${x} ${50} ${x + 10} ${42 + (lado > 0 ? caida : 0)} Q${x} ${34} ${x - 10} ${42 + (lado < 0 ? -caida : 0)} Z`;
  };
  // Cejas: arqueadas (comedia) o con la parte interior levantada (drama).
  const ceja = (x, lado) => {
    const int = x + (lado < 0 ? 9 : -9), ext = x + (lado < 0 ? -11 : 11);
    const yInt = 27 - Math.max(0, -sube) * 7, yExt = 27 + Math.max(0, -sube) * 3;
    return `M${ext} ${yExt} Q${x} ${21 - 3 * Math.max(0, sube)} ${int} ${yInt}`;
  };
  const cara = "M50 4 C78 4 95 14 95 40 C95 70 80 101 50 106 C20 101 5 70 5 40 C5 14 22 4 50 4 Z";
  const agujeros = `${ojo(32, -1)} ${ojo(68, 1)} ${boca}`;
  const capa = (fondo, borde, sombra) => `
    <path d="${cara} ${agujeros}" fill-rule="evenodd" fill="${fondo}" stroke="${borde}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="${ceja(32, -1)} ${ceja(68, 1)}" fill="none" stroke="${sombra}" stroke-width="3.2" stroke-linecap="round"/>`;
  return `<svg class="mascara" viewBox="-2 0 104 110" aria-hidden="true">
  <defs>
    <linearGradient id="${id}-r" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#ef5a4f"/><stop offset=".55" stop-color="#d0322a"/><stop offset="1" stop-color="#9f1d17"/></linearGradient>
    <linearGradient id="${id}-c" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fff6dc"/><stop offset="1" stop-color="#ecd29b"/></linearGradient>
    <clipPath id="${id}-m"><rect x="-2" y="0" width="${(104 * relleno).toFixed(1)}" height="110"/></clipPath>
  </defs>
  ${opts.vacia === false ? "" : capa(`url(#${id}-c)`, "#cfae6c", "#b8955a")}
  <g clip-path="url(#${id}-m)">${capa(`url(#${id}-r)`, "#7d1712", "#7d1712")}
    <path d="M30 14 C40 9 60 9 70 14" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="4" stroke-linecap="round"/></g>
</svg>`;
}
