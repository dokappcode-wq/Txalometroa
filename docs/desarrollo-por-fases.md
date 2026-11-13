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
