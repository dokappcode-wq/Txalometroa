# Contexto del proyecto

## El cliente y el encargo

**Hika Teatroa** es una compañía de teatro de Donostia que trabaja en euskera y castellano (web: https://hikateatroa.eus). Al final de cada función pide al público que valore la obra en el **Txalometroa** («aplausómetro»), un formulario de su web.

El encargo tiene tres pasos:

1. **Recibir** el feedback desde la web.
2. **Analizarlo** y sacar datos útiles para la compañía.
3. **Publicarlo** de vuelta en la web, a la vista del público.

El prototipo de este repositorio resuelve los tres pasos sin tocar el WordPress de Hika. La versión definitiva sustituye el formulario por una app propia con cuentas y red social (ver [version-definitiva.md](version-definitiva.md)).

## El formulario actual

Es un plugin propio de WordPress (`wp-content/plugins/txalometroa`), con WPML para los idiomas. No tenemos acceso a su código ni a su base de datos.

- Página eu: https://hikateatroa.eus/txalometroa/ · página es: https://hikateatroa.eus/es/txalometroa/
- Cada obra tiene su formulario en `?txalotu=<id del post>`; el id cambia según el idioma (Zorretan eu = 8514, Mi deuda es = 7620).
- 7 deslizadores `gal1`…`gal7` de 0 a 10 que **empiezan en 0**, un campo oculto `posta` con el id del post y el botón TXALOTU.
- Ningún campo es obligatorio, el botón no se bloquea tras enviar y no se guarda la localidad ni la función.

### Las 7 preguntas

| Columna | Bloque | Euskera | Castellano |
| --- | --- | --- | --- |
| GAL1 | Obra | Orokorrean, zein da zure gogobetetze-maila? | ¿Cuál es el grado de satisfacción general? |
| GAL2 | Obra | Zer iruditu zaizu obra honen trama? | ¿Qué te ha parecido la trama de esta obra? |
| GAL3 | Obra | Nola baloratuko zenituzke aktoreak? | ¿Cómo valorarías el reparto? |
| GAL4 | Obra | Zenbateraino da posible obra hau norbaiti gomendatzea? | ¿Cuánto de probable es que recomiendes esta obra a alguien? |
| GAL5 | Fidelidad | Laster beste antzezlanen bat ikusiko duzula uste al duzu? | ¿Cuánto de posible es que vuelvas al teatro dentro de poco? |
| GAL6 | Fidelidad | Zenbateraino da posible Hikaren beste antzezlan bat ikustera itzultzea? | ¿Cuánto de posible es que vuelvas a ver una obra de Hika? |
| GAL7 | Localidad | Nola baloratuko zenuke herri honetako kultur programazioa? | ¿Cómo valorarías la programación cultural de esta localidad? |

**La nota de una obra es la media de GAL1–GAL4.** GAL5–GAL6 miden si el público volverá y GAL7 habla del municipio, no de la obra; se analizan aparte.

## El export

El fichero que se descarga del WordPress (`datos/_Lab_Material_Hika-Teatroa_txalometroa_data_20261020.xls`) **no es un Excel**: es texto separado por tabulaciones, UTF-8, con extensión `.xls`.

```
ID	PRODUKZIOA	NOIZ	HIZKUNTZA	GAL1	GAL2	GAL3	GAL4	GAL5	GAL6	GAL7
1	Zorretan	"2024-05-15 14:02:54"	eu	5	6	7	8	1	4	5
26	"Al otro lado de la puerta"	"2024-05-29 11:26:53"	es	0	0	0	0	0	0	0
```

| Columna | Qué es |
| --- | --- |
| `ID` | Número correlativo del envío |
| `PRODUKZIOA` | Nombre de la obra **en el idioma del formulario** (o vacío) |
| `NOIZ` | Fecha y hora del envío |
| `HIZKUNTZA` | `eu`, `es` o `N/A` |
| `GAL1`…`GAL7` | Notas 1–10; **0 = no contestada** |

### Problemas que tiene y cómo se tratan

Datos del export del 20/10/2026 (del 15/05/2024 al 19/10/2026):

| Problema | Filas | Tratamiento |
| --- | --- | --- |
| La misma obra con nombre eu y es (*Atearen bestaldean* = *Al otro lado de la puerta*, *Zorretan* = *Mi deuda*, *Bidaia* = *El viaje*, *MAKILhotsak* = *MAKILhotsak (Golpes de guerra)*) | — | Se unen con los alias de `config.json` |
| Envíos con todo a 0 (se pulsó TXALOTU sin mover nada) | 38 | Se descartan |
| Envíos sin obra | 32 | Se descartan |
| Duplicados: mismas notas, misma obra, ≤ 10 s (doble clic o recarga) | 80 | Se queda uno |
| Un 0 en alguna pregunta | — | Esa pregunta cuenta como no contestada |

Quedan **546 respuestas válidas de 696**. El 67 % de todas las notas son un 10: la escala se satura, así que además de la media conviene mirar el % de notas ≤ 6 y el % que da 9–10 a «¿la recomendarías?».

### Resultados actuales

| Obra (eu / es) | Valoraciones | Nota (GAL1–4) |
| --- | --- | --- |
| Atearen bestaldean / Al otro lado de la puerta | 304 | 9,56 |
| Zorretan / Mi deuda | 227 | 9,16 |
| Bidaia / El viaje | 9 | 9,58 |
| MAKILhotsak / MAKILhotsak (Golpes de guerra) | 6 | 9,25 |

Las respuestas de cada obra se agrupan en **funciones**: un hueco de más de 3 horas sin respuestas marca otra función. Solo se consideran fiables las funciones con ≥ 5 respuestas.

## Repertorio de Hika

Además de las 4 obras del Txalometroa, el catálogo de la app ([`app/catalogo.json`](../app/catalogo.json)) incluye 9 obras anteriores de la página «Ibilbidea» de su web (Toto, Tarara, Seda, Gazte, Tonbola, Zaparrada, Txarriboda, Sagartu, Koadernoa zuri), con foto, año y género. **Los géneros son provisionales**: los dedujimos de las descripciones de la web y Hika debe confirmarlos.

## Qué falta saber

- Acceso al plugin de WordPress o a su base de datos, para leer los datos sin exportar a mano.
- Confirmación de Hika de los géneros de cada obra.
- Revisión de los textos en euskera por un hablante nativo.
- Plano de las salas (filas y butacas) para el mapa de butacas real.
