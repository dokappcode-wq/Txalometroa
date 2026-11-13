# Txalometroa definitiva · Fase 1

Nueva aplicación React + TypeScript + Vite, independiente del prototipo original. Desarrollo por fases: cada entrega requiere revisión del usuario antes de empezar la siguiente.

## Ejecutar

Node 22.12+ o 24. `npm ci`, `npm run dev`. Producción: `npm run build`. Comprobaciones: `npm test`.

`npm run datos` regenera los agregados y el catálogo desde el núcleo del prototipo y el export histórico del repositorio. Debe ejecutarse dentro del repositorio original; una copia aislada de revisión usa los JSON ya generados.

## Incluido

- Catálogo real: cuatro obras del Txalometroa y nueve del repertorio; búsqueda por ambos títulos sin distinguir acentos, filtros combinables y estado en URL.
- Fichas enlazables, notas históricas, mínimo de diez respuestas, máscaras y logo líquido.
- Euskera/castellano y preferencia de idioma local. Fuentes e imágenes servidas desde el propio sitio.
- Navegación adaptable, estados vacíos, página 404, foco visible, enlace para saltar al contenido y movimiento reducido.
- Pantallas explícitamente pendientes para cuentas, comunidad, constelación y Wrapped. Este último permite seleccionar años naturales en Europe/Madrid; todavía no calcula resúmenes.
- Butacas aplazado. No contiene simulación ni ocupaciones.

## Límites de esta fase

No hay registro, servidor de valoraciones, red social ni administración todavía. No se recogen datos personales; únicamente se guarda la preferencia de idioma en este navegador. Las cifras proceden del export hasta el 19/10/2026, no se presentan como datos en directo. La PWA y la sincronización de borradores se completan al desarrollar la persistencia; no se instala un service worker prematuramente.

Los textos nuevos en euskera deben revisarse por un hablante nativo. Los géneros proceden del catálogo provisional y requieren confirmación de Hika.

## Despliegue

Compilar y servir `dist/` con fallback de navegación a `index.html` (incluido `_redirects` para Netlify). El enlace privado de revisión usa Sites. La aplicación no depende de servicios específicos de ese alojamiento y puede desplegarse en el Netlify definitivo.

## Verificación

La suite cubre filtros, búsqueda bilingüe, navegación, idioma, umbral de publicación, cifras históricas y límites anuales. Las pruebas de interacción usan DOM simulado y no sustituyen la comprobación visual en dispositivos. El entorno de esta entrega no ofrece la herramienta de navegador de Sites: validación visual pendiente.

Ver `../docs/desarrollo-por-fases.md` para el alcance aceptado y próximos hitos.
