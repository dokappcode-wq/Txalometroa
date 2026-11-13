# El prototipo

El prototipo son cuatro piezas que comparten la misma lógica. Todo es HTML y JavaScript sin dependencias, más Python para compilar y publicar. No hay servidor ni base de datos: lo que cada persona hace se guarda en el navegador.

| Pieza | Fichero final | Plantilla | Para quién |
| --- | --- | --- | --- |
| App móvil (PWA) | `movil/index.html` | `movil/index.src.html` | El público: valorar, constelación, Wrapped, butacas |
| App de análisis y publicación | `app/txalometroa.html` | `app/txalometroa.src.html` | Hika: informe interno y bloque para WordPress |
| Réplica de la web | `replica/index.html` | `replica/replica.src.html` | Pruebas: la página del Txalometroa con el bloque y el formulario |
| Script de análisis | `analizar.py` | — | Lo mismo que la app de análisis, por línea de comandos |

Publicado: https://txalometroa-hika.netlify.app (app móvil).

## Cómo se compila

```bash
python app/construir.py
```

`construir.py` monta cada página final a partir de su plantilla, sustituyendo cuatro marcadores:

| Marcador | Se sustituye por |
| --- | --- |
| `__NUCLEO__` | `app/nucleo.js`, la lógica compartida |
| `__CONFIG__` | `config.json` |
| `__CATALOGO__` | `app/catalogo.json` (solo la app móvil lo usa) |
| `__DATOS__` / `__NOMBRE__` | El último export de `datos/` y su nombre |

También genera `movil/sw.js` a partir de `movil/sw.src.js`, con una versión calculada a partir del contenido de `movil/index.html`, para que el móvil descargue la versión nueva.

**No edites los ficheros finales** (`*.html` sin `.src`, `sw.js`): se sobrescriben en cada compilación.

## La lógica compartida: `app/nucleo.js`

| Función | Qué hace |
| --- | --- |
| `leerFichero`, `parsearTexto`, `aObjetos`, `parsearFecha` | Leen el export: TSV, CSV con `;` o `,`, y `.xlsx`/`.xls` real (carga SheetJS de cdnjs solo si hace falta) |
| `limpiar` | Une los nombres eu/es, descarta vacíos, sin obra y duplicados, y agrupa en funciones |
| `metricas`, `metricasPregunta`, `analizar` | Nota media, % muy satisfechos (≥ 9), % insatisfechos (≤ 6), % que la recomendaría (9–10 en GAL4) e índice tipo NPS |
| `conclusiones` | Frases automáticas para el informe |
| `bloqueWordpress` | El HTML estático (sin JavaScript) de la reseña pública, en eu o es |
| `infoNombres`, `emparejar`, `htmlTablaObrasNuevas`, `aplicarObrasNuevas` | Asistente para dar de alta obras que aparecen nuevas en un export; sugiere parejas eu/es por fechas coincidentes |
| `svgLogoLiquido` | El logo de Hika que se llena de líquido hasta la nota |
| `svgMascara` | Máscara de teatro de drama (−1) a comedia (1), rellena en parte |

`analizar.py` repite la limpieza y el análisis en Python. Si cambias una regla de limpieza, cámbiala en los dos sitios.

## La configuración: `config.json`

| Clave | Qué define |
| --- | --- |
| `obras` | Cada obra: nombre `eu`, nombre `es`, `alias` (todos los nombres con que llega en el export) e `imagen` |
| `preguntas` | GAL1–GAL7: etiqueta corta y texto completo en eu/es, y su bloque (`obra`, `publico`, `localidad`) |
| `nota_obra` | Preguntas que forman la nota (GAL1–GAL4) |
| `pregunta_recomendacion` | GAL4 |
| `limpieza` | `segundos_duplicado` (10), `horas_entre_funciones` (3), `min_respuestas_funcion` (5) |
| `publicacion` | `min_respuestas_obra` (10) y `preguntas_publicas` (las medias que salen en la reseña) |
| `web` | Direcciones de la página del Txalometroa en eu y es |

## La app móvil (`movil/`)

Cuatro pestañas y un menú de ajustes:

- **Obras:** obras activas con su foto, el logo líquido con la nota del público y el botón TXALOTU. Debajo, el repertorio para añadir obras ya vistas. La ficha de cada obra muestra cada aspecto con 5 máscaras.
- **Valorar** (3 pasos): notas con máscaras (media máscara = 1 punto, entera = 2, escala 1–10); emociones (¿reír o llorar?, ¿qué te emocionó?); y preguntas abiertas. Exige al menos una nota de GAL1–GAL4 y bloquea el botón al enviar.
- **Butacas:** mapa de 12 filas × 18 butacas que se llena solo. **Es una simulación**; el usuario puede marcar su butaca.
- **Constelación:** dibujada en un canvas. Ángulo = género, distancia al centro = nota (más cerca, mejor), tamaño = emoción y textos. Las líneas unen el orden cronológico y las obras del mismo género.
- **Wrapped:** historias a pantalla completa. El mundial sale del export real; el personal, de las valoraciones del usuario. Toca para avanzar y mantén pulsado para pausar.
- **Ajustes:** idioma eu/es, instalar la app, perfil de ejemplo, **Admin · obras de prueba** (crea obras falsas con valoraciones inventadas y las borra) y borrar los datos.

Es instalable: tiene `manifest.webmanifest`, iconos en `movil/icons/`, un service worker que guarda la app para usarla sin conexión y `_headers` para Netlify.

### Datos que guarda cada pieza en el navegador

| Pieza | Clave de `localStorage` | Contenido |
| --- | --- | --- |
| App móvil | `txalometroa-mugikorra` | `lang`, `valoraciones`, `butaka`, `pruebak` (obras de prueba) |
| App de análisis | `txalometroa-app` | `cfg`, último `fichero` cargado, `vaciado` |
| Réplica | `txalometroa-replica-hika` | `modo`, `cfg`, `fichero`, `votos`, `pegado`, `estrenos` |

## Cómo probarlo

```bash
python -m http.server 8766
```

Abre http://localhost:8766/movil/, /app/txalometroa.html o /replica/index.html. El service worker solo funciona en `localhost` o con HTTPS: desde `file://` la app funciona pero no se instala. Para verla como en un móvil, usa la vista de dispositivo del navegador (390 px de ancho).

## Cómo se publica

```bash
python app/publicar.py
```

Compila y sube a Netlify solo los ficheros de la app (sin las plantillas). El sitio está enlazado en `.netlify/state.json` y pertenece a la cuenta de Netlify invitadoh2@gmail.com.

Si `publicar.py` dice «Site not found», la sesión de `netlify-cli` de ese terminal es de otra cuenta: entra con `npx netlify-cli@17 login`.

La app de análisis se publicó también como página de Claude (privada): https://claude.ai/artifact/TZYLFz3mNrURGFNKA6YNFc
