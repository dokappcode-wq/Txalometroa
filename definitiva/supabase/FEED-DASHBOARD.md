# Activar Feed y dashboard

Ejecutar `instalar-feed-dashboard.sql` en el SQL Editor del proyecto Supabase existente. Incluye únicamente las migraciones nuevas; no repetir la instalación de fase 2. Es idempotente y no borra datos. El script no inserta cuentas ni contenido de demostración.

Después, desde el mismo SQL Editor con el rol administrador del proyecto, reservar el correo autorizado:

```sql
select txalo_privado.invitar_hikateat('CORREO_AUTORIZADO');
```

Sustituir el marcador por el correo acordado con el propietario. El correo no se guarda en el repositorio ni en el JavaScript público. Si esa cuenta ya existe y tiene el correo confirmado, se activa el rol y se cambia el nombre a **Hikateat**. En caso contrario, se reserva el acceso; el titular debe registrarse en la app con su propia contraseña y verificar el correo. La confirmación activa el rol, establece el nombre y consume la reserva. Este paso no envía una invitación por email ni permite entrar sin contraseña. No acepta condiciones ni declara una edad en nombre del titular.

La cuenta administradora accede a `/admin`. El rol reside en un esquema privado, fuera de los campos editables del perfil. Cambiar el nombre a Hikateat no concede acceso. La cuenta puede seguir usando el feed como cualquier otra.

## Datos y privacidad

- Los perfiles privados aceptan cada solicitud; los abiertos admiten automáticamente a quien los siga. El feed reúne publicaciones propias y de personas cuyo seguimiento está aceptado.
- Se busca a un amigo mediante el enlace/código compartido por esa persona. No se publica un directorio de correos ni se concede lectura general a `perfiles`.
- Las publicaciones de texto pueden asociarse a una obra y marcarse como spoiler. No afectan al histórico ni equivalen a las valoraciones GAL1–GAL4 pendientes de fase 3.
- Los comentarios son visibles para quienes tienen acceso a la publicación. Bloquear corta el seguimiento en ambos sentidos y las lecturas posteriores; desbloquear no restaura relaciones.
- Publicaciones y comentarios usan identificadores de envío para reintentos sin duplicados. El borrador de publicación se guarda por cuenta en el dispositivo. No se confirma un envío antes de la respuesta del servidor.
- Los borrados de cuenta eliminan por cascada publicaciones, comentarios, aplausos, relaciones, denuncias y privilegios. La exportación incorpora la actividad social propia cuando el esquema está instalado.

## Dashboard de Hikateat

Métricas del servicio real: cuentas totales, participantes, publicaciones, comentarios, aplausos, seguimientos y denuncias. Selector de 7, 30 o 90 días naturales en Europe/Madrid, incluyendo días sin actividad. Datos históricos de valoraciones separados y etiquetados con su fecha de origen.

La cola de moderación muestra hasta las 50 denuncias pendientes más antiguas y el total pendiente. Permite descartar una denuncia o retirar la publicación/comentario denunciado; al retirar una publicación se eliminan sus comentarios. Cada acción se registra en `txalo_privado.acciones_admin`. Los usuarios no pueden ver las denuncias de otros ni el nombre del denunciante en el contenido social.

## Comprobaciones

`npm test -- supabase/feed.test.ts` ejecuta las migraciones y pruebas de permisos contra PostgreSQL local con PGlite y un esquema Auth/Storage de prueba. Incluye aplicación repetida, roles, acceso directo, solicitudes, bloqueos, idempotencia, cursor, exportación, reserva de admin y moderación. No usa ni modifica el proyecto real. Después de activar el servicio, verificar también el recorrido con cuentas reales independientes.
