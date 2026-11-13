# Txalometroa · Hika Teatroa

**Nueva versión en desarrollo:** [`definitiva/`](definitiva/README.md). La fase 1 incorpora catálogo, fichas y navegación bilingüe. El [plan actualizado por fases](docs/desarrollo-por-fases.md) recoge las decisiones más recientes: revisión tras cada fase, Wrapped anual y butacas aplazadas.

Prototipo del Txalometroa de Hika Teatroa: analiza el feedback del público, lo publica en la web y lo convierte en una app móvil.

| Parte | Dónde |
| --- | --- |
| App móvil (prototipo publicado) | https://txalometroa-hika.netlify.app · código en `movil/` |
| App de análisis y publicación | `app/txalometroa.html` |
| Réplica de la web para pruebas | `replica/index.html` |
| Script de análisis por línea de comandos | `analizar.py` |
| Presupuesto de la versión definitiva | [`docs/presupuesto.md`](docs/presupuesto.md) |
| **Documentación completa** (contexto, diseño, especificación técnica, decisiones) | [`docs/`](docs/README.md) |
| Instrucciones para programar con Claude | [`CLAUDE.md`](CLAUDE.md) |

Todo se compila con `python app/construir.py` y la app móvil se publica con `python app/publicar.py`.

## Análisis del export

Convierte la exportación del formulario de feedback del público en datos útiles y en un bloque publicable en la web.

```
Formulario web ──► export (.xls = TSV) ──► analizar.py ──► salida/
                                                            ├─ informe.html            (interno, para el teatro)
                                                            ├─ widget.html             (público, eu/es, para la web)
                                                            ├─ resumen.json            (todas las métricas, para integrar)
                                                            └─ respuestas_limpias.csv  (datos depurados, abre en Excel)
```

## App (prototipo)

`app/txalometroa.html` hace todo en el navegador, sin instalar nada y sin enviar los datos a ningún servidor:

1. **Cargar export**: el botón o arrastrar el fichero. Acepta el `.xls` de la web y también `.xlsx`/`.csv` si alguien lo abrió y guardó en Excel.
2. **Informe**: notas, conclusiones, mapa de calor, evolución por función y calidad de los datos.
3. **Publicar en la web**: bloque eu/es listo para pegar en un bloque «HTML personalizado» de WordPress.
4. **Ajustes**: obras (nombres eu/es), preguntas y criterios. Se guardan en el navegador.

### Obras y pruebas desde cero

- **Ajustes → Obras**: lista de obras con sus respuestas. «Añadir obra» pide el título en euskera, en castellano (si cambia) y la dirección de la foto; las respuestas del export con esos títulos se suman a la obra. «Quitar» pide un segundo clic.
- Al cargar un export con obras que no conoce, aparece **«Obras nuevas en este export»**: para cada nombre eliges si es una obra nueva o la misma que otra (versión eu/es). Sugiere las parejas que reciben respuestas en las mismas fechas; las que nunca coinciden (p. ej. *Bidaia* / *El viaje*) hay que unirlas a mano.
- **Probar desde cero**: «Vaciar datos» (quita el export), «Empezar de cero» (quita export y obras) y «Restaurar como al principio». Piden un segundo clic.
- `pruebas/export-con-obras-nuevas.xls` es un export inventado con 3 obras que no están configuradas, para probar cómo se dan de alta desde un export.

Para editarla se toca `app/txalometroa.src.html` y se reconstruye con `python app/construir.py` (mete `app/nucleo.js`, config.json y el último export de `datos/`).

## Réplica de prueba (`replica/index.html`)

Copia local de la página hikateatroa.eus/txalometroa para probar el circuito completo **votar → analizar → publicar** sin tocar la web real. Solo para pruebas internas: no publicarla.

- Lista de obras como en la web; **TXALOTU** abre el formulario con las 7 preguntas y las caras.
- Formulario mejorado: no deja enviar sin mover al menos una barra y bloquea el botón al pulsar (sin duplicados).
- Debajo de la lista, la **reseña** que genera el Txalometroa: foto de la obra, nota general en un aro y las medias de cada aspecto.
- **Panel «Modo prueba»**: «En directo» simula el plugin ampliado (cada voto se ve al momento); «Manual» simula el flujo actual (la reseña no cambia hasta pulsar «Pegar bloque actualizado»). Los votos se guardan solo en ese navegador y se pueden borrar.
- `#txalotu-<obra>` al final de la dirección abre directamente el formulario de esa obra (útil para un QR por obra).
- **Añadir obra** (panel «Modo prueba» → «Obras»): título en euskera y castellano y foto, subida desde el ordenador o con su dirección. La obra aparece la primera de la lista con la etiqueta «Berria» y su botón TXALOTU; su reseña sale al llegar al mínimo de valoraciones, que se puede bajar en el mismo panel para verla antes. «Quitar» la retira con sus votos de prueba.
- «Cargar export» (o arrastrar el fichero) carga datos nuevos; si traen obras desconocidas se abre **«Obras nuevas en este export»** para unir los nombres eu/es y añadir fotos. Las obras sin foto se muestran con su inicial.
- **Probar desde cero**: «Vaciar datos», «Empezar de cero» (quita export, obras y votos), «Borrar votos» y «Restaurar como al principio». Las acciones que borran piden un segundo clic.

La lógica (`app/nucleo.js`) es la misma que usa la app, así que lo que se ve en la réplica es exactamente lo que se pegaría en WordPress.

## Script de línea de comandos

Solo necesita Python 3 (sin librerías externas).

```
python analizar.py datos/<exportacion>.xls
```

## Qué hace la limpieza

| Problema en el export | Tratamiento |
|---|---|
| La misma obra aparece con nombre en euskera y en castellano | Se unen según `config.json` |
| Respuestas sin obra | Se descartan (se cuentan en el informe) |
| Envíos con todo a 0 | Se descartan: 0 = «no contestada» |
| Un 0 en alguna pregunta | Esa pregunta cuenta como no contestada, no como nota 0 (los deslizadores del formulario empiezan en 0) |
| Mismas notas repetidas en ≤10 s (doble clic) | Se queda una |

Las respuestas de cada obra se agrupan en **funciones**: un hueco de más de 3 h sin respuestas marca otra función. Solo se muestran las funciones con ≥5 respuestas.

## Configuración (`config.json`)

- `obras`: nombre eu/es de cada obra y los nombres con que llega en el export. **Cuando se estrene una obra nueva, añádela aquí** (el script avisa si encuentra nombres sin mapear).
- `preguntas`: etiqueta corta, texto completo eu/es y bloque de cada GAL (copiados del formulario de hikateatroa.eus/txalometroa).
  - Bloque **obra** (GAL1–GAL4: satisfacción, trama, reparto, recomendación) → forma la nota de la obra (`nota_obra`).
  - Bloque **público** (GAL5–GAL6: volver al teatro / volver a Hika) → fidelidad, se analiza aparte.
  - Bloque **localidad** (GAL7: programación cultural del municipio) → no habla de la obra, se analiza aparte.
- `pregunta_recomendacion`: GAL4; se usa para el «% que la recomendaría» (9–10) y un índice tipo NPS (% 9–10 menos % ≤6).
- `publicacion.min_respuestas_obra`: mínimo de respuestas para que una obra salga en el widget público.
- `publicacion.mostrar_preguntas`: `true` para que el widget muestre también la nota de cada pregunta.

## Publicar el widget

Sube `widget.html` a la web y empótralo:

```html
<iframe src="/txalometroa/widget.html?lang=eu" style="width:100%;height:260px;border:0"></iframe>
```

Parámetros: `lang=eu|es`, `obra=<id de config.json>` para mostrar una sola obra (p. ej. en su página), `tema=oscuro`.

## App móvil (`movil/`)

App instalable (PWA) para el público, con la identidad de las referencias: gris, rojo, crema y letra pixelada (Jersey 10).

- **Obras**: las obras del Txalometroa con su foto y el **logo de Hika que se llena de líquido** hasta la nota media. Debajo, el repertorio de Hika (para añadir a tu constelación lo que ya viste). La ficha de cada obra muestra cada aspecto con **5 máscaras, de drama a comedia**.
- **Valorar** (3 pasos): notas con máscaras (media máscara = 1 punto, entera = 2, escala 1–10 compatible con el export); emociones (¿reír o llorar?, ¿qué te emocionó?); y las preguntas abiertas nuevas (de qué trató, personaje favorito, conflicto, resolución). Al terminar, el logo se llena con tu nota y la compara con la del público.
- **Butacas**: mapa de la sala en directo que se va llenando, contador de personas y tu butaca. Es una **simulación**: en la versión real cada butaca tendría un QR.
- **Constelación**: cada obra vista es una estrella. Ángulo = género, distancia al centro = tu nota, tamaño = emoción. Líneas = orden en que las viste y obras del mismo género.
- **Wrapped**: historias a pantalla completa. El *mundial* sale de los datos reales del Txalometroa; el *personal*, de tus valoraciones.
- **Ajustes → Admin · Obras de prueba**: crea obras falsas (etiqueta PRUEBA, cartel generado y valoraciones inventadas) y bórralas una a una o todas.
- Lo personal (valoraciones, butaca, obras de prueba) se guarda solo en el móvil.

Ficheros: `index.src.html` (plantilla) → `index.html`, `sw.src.js` → `sw.js`, `manifest.webmanifest`, `icons/`. Se compila con `python app/construir.py`. Los géneros de las obras están en `app/catalogo.json` y son **provisionales** (deducidos de las descripciones de la web): que Hika los revise. Los textos en euskera conviene que los revise un hablante nativo.

### Dirección publicada

**https://txalometroa-hika.netlify.app** (Netlify, cuenta invitadoh2@gmail.com, acceso público). Para volver a publicar tras un cambio: `python app/publicar.py` (compila y sube solo los ficheros de la app). El sitio está enlazado en `.netlify/state.json`.

### Instalarla en el móvil

Para instalarla hace falta servir la carpeta `movil/` por **HTTPS** (desde un fichero local o `http://` no se instala). Lo más rápido:
1. Entra en https://app.netlify.com/drop y arrastra la carpeta `movil`. Te da una dirección `https://…netlify.app`.
2. Ábrela en el móvil. **Android (Chrome)**: menú ⋮ → «Instalar aplicación». **iPhone (Safari)**: Compartir → «Añadir a pantalla de inicio».
3. Desde entonces se abre como una app y funciona sin conexión (las fotos se guardan al verlas por primera vez).
