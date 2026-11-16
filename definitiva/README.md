# Txalometroa definitiva · Fase 2 en revisión

Aplicación React, TypeScript y Vite de Hika Teatroa. Se revisa cada fase antes de empezar la siguiente.

## Desarrollo

Node 22.12+ o 24. Instalar con `npm ci`, ejecutar con `npm run dev`, comprobar con `npm test` y compilar con `npm run build`.

Copiar `.env.example` a `.env.local` y configurar la URL y la clave pública de Supabase. No utilizar claves administrativas en variables `VITE_*`. Las variables de compilación no son secretos: forman parte del JavaScript del navegador.

## Incluido

- Estilo Escenario, negro/blanco pastel/rojo, logo e imágenes originales.
- Catálogo real de trece obras, búsqueda bilingüe, filtros y fichas enlazables. Histórico agregado hasta el 19/10/2026, mínimo público de diez respuestas.
- Registro y confirmación por correo, reenvío, acceso, recuperación/cambio de contraseña, edición del perfil y foto privada.
- Descarga del perfil y foto. Función de borrado permanente implementada y probada, pendiente de activación en Supabase; el botón depende de la disponibilidad real del servicio.
- Euskera/castellano, navegación adaptable, estados de error, foco visible y movimiento reducido.

Valoraciones nuevas, comunidad, constelación, Wrapped anual, administración y PWA pertenecen a fases posteriores. Butacas permanece como «Próximamente». Las cifras históricas no son datos en directo. Los nuevos textos en euskera y la información legal necesitan revisión antes del lanzamiento público.

## Netlify

El archivo `../netlify.toml` fija `definitiva` como carpeta base, `npm run build` como comando y `dist` como publicación. `_redirects` permite recargar rutas como `/perfil` y `/obra/bidaia`. `_headers` configura el tipo de contenido y la caché de los archivos con hash.

Para despliegues automáticos desde GitHub, importar el repositorio y seleccionar la rama `codex/fase-1-base-visual`; establecer las variables públicas de Supabase en el proyecto Netlify. Para subir una compilación ya preparada, publicar exclusivamente `dist/`, sin el repositorio ni `.env.local`.

Después de crear el nuevo proyecto, registrar su URL en Supabase para la confirmación y recuperación de cuentas. Consultar `supabase/README.md` para esas redirecciones y la activación del borrado.

## Verificación

La suite prueba catálogo, navegación, idiomas, métricas y límites anuales; también formularios, exportación y autorización/borrado del backend. Las pruebas de interacción usan DOM simulado, y las del backend respuestas controladas: no sustituyen las pruebas reales con dos cuentas ni la revisión visual en dispositivos.

`npm run datos` regenera catálogo e histórico a partir del repositorio original; no es necesario al desplegar una copia de la app.

Ver `../docs/desarrollo-por-fases.md` para el alcance aceptado.
