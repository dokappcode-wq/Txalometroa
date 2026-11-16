# Activar Feed y dashboard

Ejecutar `instalar-feed-dashboard.sql` en el SQL Editor del proyecto Supabase existente. Incluye únicamente las migraciones nuevas; no repetir la instalación de fase 2. Es idempotente y no borra datos. El script no inserta cuentas ni contenido de demostración.

Para registro directo, configuración de redirecciones y activación manual del administrador, seguir [REGISTRO-Y-BUSQUEDA.md](REGISTRO-Y-BUSQUEDA.md). En proyectos con feed ya instalado basta aplicar `actualizar-busqueda-registro.sql`.

La administración se concede explícitamente al UUID de la cuenta propia desde el SQL Editor del propietario:

```sql
select txalo_privado.designar_hikateat('UUID_DE_TU_CUENTA'::uuid);
```

No se concede el rol por registrar un correo o cambiar el nombre del perfil. Este paso no crea cuentas ni contraseñas, no acepta condiciones y no declara una edad en nombre del titular. Los administradores existentes conservan su rol.

La cuenta administradora accede a `/admin`. El rol reside en un esquema privado, fuera de los campos editables del perfil. Cambiar el nombre a Hikateat no concede acceso. La cuenta puede seguir usando el feed como cualquier otra.

## Datos y privacidad

- Los perfiles privados aceptan cada solicitud; los abiertos admiten automáticamente a quien los siga. El feed reúne publicaciones propias y de personas cuyo seguimiento está aceptado.
- Se buscan personas por su nombre visible (mínimo dos caracteres, máximo veinte resultados) o mediante un enlace/código compartido. Se respetan bloqueos en ambos sentidos. No se publica un directorio de correos ni se concede lectura general a `perfiles`.
- Las publicaciones de texto pueden asociarse a una obra y marcarse como spoiler. No afectan al histórico ni equivalen a las valoraciones GAL1–GAL4 pendientes de fase 3.
- Los comentarios son visibles para quienes tienen acceso a la publicación. Bloquear corta el seguimiento en ambos sentidos y las lecturas posteriores; desbloquear no restaura relaciones.
- Publicaciones y comentarios usan identificadores de envío para reintentos sin duplicados. El borrador de publicación se guarda por cuenta en el dispositivo. No se confirma un envío antes de la respuesta del servidor.
- Los borrados de cuenta eliminan por cascada publicaciones, comentarios, aplausos, relaciones, denuncias y privilegios. La exportación incorpora la actividad social propia cuando el esquema está instalado.

## Dashboard de Hikateat

Métricas del servicio real: cuentas totales, participantes, publicaciones, comentarios, aplausos, seguimientos y denuncias. Selector de 7, 30 o 90 días naturales en Europe/Madrid, incluyendo días sin actividad. Datos históricos de valoraciones separados y etiquetados con su fecha de origen.

La cola de moderación muestra hasta las 50 denuncias pendientes más antiguas y el total pendiente. Permite descartar una denuncia o retirar la publicación/comentario denunciado; al retirar una publicación se eliminan sus comentarios. Cada acción se registra en `txalo_privado.acciones_admin`. Los usuarios no pueden ver las denuncias de otros ni el nombre del denunciante en el contenido social.

## Comprobaciones

`npm test -- supabase/feed.test.ts` ejecuta las migraciones y pruebas de permisos contra PostgreSQL local con PGlite y un esquema Auth/Storage de prueba. Incluye aplicación repetida, roles, acceso directo, solicitudes, bloqueos, idempotencia, cursor, exportación, reserva de admin de la versión anterior y moderación. `supabase/busqueda.test.ts` comprueba búsqueda, privacidad y concesión explícita de administración de la versión actual. No usa ni modifica el proyecto real. Después de activar el servicio, verificar también el recorrido con cuentas reales independientes.
