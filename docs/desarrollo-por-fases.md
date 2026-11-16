# Desarrollo por fases · decisiones del 13/11/2026

Este documento actualiza el alcance de `version-definitiva.md` y `presupuesto.md` según las indicaciones del usuario. Cada fase se muestra y se corrige antes de avanzar; no se inicia la siguiente hasta que el usuario lo indique. El presupuesto anterior no constituye una estimación revisada.

## Reglas aceptadas

- Una valoración por persona y función, editable. Sin función conocida: una valoración general por persona y obra.
- Nota: media de las preguntas GAL1–GAL4 contestadas por cada persona, y después media entre personas. GAL5–GAL6 y GAL7 se analizan aparte.
- Privacidad: separar respuestas para Hika de textos publicados; perfiles privados con solicitudes de seguimiento y reglas de visibilidad.
- **Butacas y QR aplazados**: solo un estado «Próximamente». No desarrollar tablas, registro de asientos ni simulaciones en estas fases.
- **Wrapped anual**: del 1 de enero al 1 de enero siguiente, intervalo cerrado por la izquierda y abierto por la derecha, según Europe/Madrid. Selección de un año cada vez; año en curso etiquetado como provisional.
- Sin conexión: conservar borradores; solo confirmar envíos tras aceptación del servidor; reintentos sin duplicar datos.

## Fases y aceptación

1. **Base visual y catálogo — para revisión.** React/TypeScript, navegación móvil/escritorio, catálogo y fotos reales, búsqueda bilingüe, filtros, fichas, métricas históricas, idiomas y estados pendientes. Aceptar diseño, información y recorridos.
2. **Cuentas y datos compartidos.** Supabase en UE, migraciones y permisos, registro/verificación/recuperación, perfiles, privacidad, descarga/borrado de datos. Probar cuentas independientes y persistencia entre dispositivos. Requiere configurar servicios y correo.
3. **Valoraciones e historial.** Tres pasos, edición/borrado, unicidad con y sin función, borradores locales, reintentos, migración histórica idempotente y agregados compartidos. Igualar referencias históricas y probar concurrencia.
4. **Comunidad y moderación.** Solicitudes y seguidores, muro, comentarios, me gusta, avisos internos, bloqueos y denuncias; herramientas de moderación desde el primer día. Probar visibilidad desde cliente y API.
5. **Constelación y Wrapped anual.** Visualizaciones personales persistentes, periodos por año, mínimos estadísticos, estados sin datos y compartir imágenes. Probar límites del año, borrados y edición.
6. **Gestión de Hika y WordPress.** Obras, fotos, géneros, funciones y localidades (sin butacas), estadísticas, filtros, exportaciones y reseñas automáticas bilingües. Herramientas mínimas de gestión se incorporan antes si son necesarias para valorar/moderar. Requiere acceso a WordPress.
7. **Piloto y publicación.** PWA, actualización de cachés, accesibilidad, prueba en iOS/Android, pruebas de carga, recuperación de copias, observabilidad, revisión de euskera y textos legales, piloto real y entrega. Solo publicar como producto terminado al superar estos controles.

## Referencia de datos

Export del 20/10/2026: 696 filas, 546 válidas. Atearen bestaldean: 304, 9,56; Zorretan: 227, 9,16; Bidaia: 9, 9,58; MAKILhotsak: 6, 9,25. El mínimo público es 10 respuestas, por lo que las dos últimas no muestran nota en la nueva interfaz.

El paquete de revisión lleva solo agregados, no respuestas individuales ni datos de demostración. Las funciones históricas inferidas deberán conservar su procedencia durante la migración.

## Dependencias posteriores

Cuentas de servicios y dominio bajo control de Hika, configuración segura de credenciales, acceso a WordPress, fotos y géneros confirmados, revisión lingüística y legal, responsable de moderación y función disponible para el piloto. Planos y pegatinas QR ya no son una dependencia de este alcance.

## Estética elegida · 15/11/2026

El usuario eligió la propuesta 02, Escenario: fondo negro, blanco pastel, rojo, titulares sans serif contundentes, tarjetas grandes con esquinas redondeadas y navegación clara. Conservar el logo existente y los colores originales de los carteles: no aplicar filtros monocromos ni duotonos a las fotografías. Las imágenes de las propuestas eran referencias visuales; no sustituyen los recursos reales del catálogo. El cambio estético se aplica a las pantallas ya desarrolladas y no adelanta funcionalidades de otras fases.

## Continuación de cuentas · 16/11/2026

Descarga JSON del perfil y foto con RLS, reenvío de confirmación con espera entre solicitudes, limpieza de estado al cambiar de cuenta y validación de nombre no vacío. El borrado se implementa en una función Supabase autocontenida que verifica la sesión y la contraseña, limpia fotos y elimina la identidad; la app detecta si está desplegada antes de habilitar el botón. No requiere nuevas tablas. Queda pendiente activarla en el proyecto y validar el recorrido real con cuentas independientes.

El usuario solicita un proyecto nuevo de Netlify. Se añade configuración de compilación, rutas SPA y cabeceras, manteniendo el proyecto anterior. Al obtener la URL nueva hay que autorizarla en Supabase; el código sigue siendo una revisión de fase 2, no el cierre de la fase ni un producto final.

## Feed y Hikateat · solicitud explícita del 16/11/2026

El usuario solicita adelantar el feed social y un dashboard administrador. Se añaden publicaciones de texto vinculables a obras, spoilers, solicitudes de seguimiento, comentarios, aplausos, bloqueo y denuncias, con permisos verificados en PostgreSQL. Son opiniones sociales separadas de las valoraciones GAL y no cambian las medias históricas. El menú incorpora Feed en escritorio y móvil.

Hikateat recibe acceso mediante una reserva de correo en el esquema privado; se activa únicamente con el correo confirmado. No se guarda el correo autorizado en el repositorio. El dashboard muestra métricas reales, series diarias y obras con más conversación, además del histórico identificado por fecha y la cola de moderación. Incluye tablas alternativas a los gráficos y descarga de agregados.

Activación del servicio: ejecutar `definitiva/supabase/instalar-feed-dashboard.sql` y reservar el correo mediante `txalo_privado.invitar_hikateat`. La interfaz no representa datos ficticios si la migración está pendiente. Las pruebas locales de PostgreSQL cubren permisos, bloqueo, reintentos, paginación, rol administrador y borrado en cascada; faltan recorridos reales con distintas cuentas y revisión visual en navegador.
