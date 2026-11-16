# Registro sin confirmar el correo y búsqueda de personas

La web pública es https://txalometroa-escenario.netlify.app. No requiere ChatGPT. Los enlaces antiguos de chatgpt.site son otra publicación y no deben compartirse.

## Aplicar en el proyecto Supabase

1. En **SQL Editor → New query**, ejecutar el contenido completo de `actualizar-busqueda-registro.sql`. Requiere tener instalado el feed/dashboard. Es repetible; no borra cuentas, publicaciones ni permisos existentes. Añade la búsqueda por nombre y elimina la concesión automática de administración por correo reservado. Ejecutarlo **antes** del siguiente paso.
2. En **Authentication → Sign In / Providers**, desactivar **Confirm email** y guardar. Según la versión del panel, aparece en User Signups o dentro de Email. A partir de entonces Supabase crea la sesión durante el registro; la app abre el perfil directamente.
3. En **Authentication → URL Configuration**, poner **Site URL** = `https://txalometroa-escenario.netlify.app`. Añadir en **Redirect URLs** `https://txalometroa-escenario.netlify.app/perfil` y `https://txalometroa-escenario.netlify.app/perfil?recuperar=1`. Guardar. Quitar las URL antiguas de chatgpt.site.
4. Si se personalizaron las plantillas en **Authentication → Emails**, comprobar que los enlaces de confirmación/recuperación usan `{{ .ConfirmationURL }}`, sin direcciones fijas a ChatGPT. Los mensajes ya enviados conservan sus enlaces antiguos: descartarlos y solicitar uno nuevo después de guardar la configuración.

La clave pública de la aplicación no permite cambiar estos ajustes administrativos. El código acepta tanto proyectos que confirman correos como proyectos con registro directo y envía los nuevos enlaces al dominio de Netlify. No puede corregir la Site URL ni las plantillas remotas.

## Cuenta ya creada, pendiente de confirmación

Desactivar Confirm email afecta al registro nuevo; no asumir que valida retroactivamente todas las cuentas. Para una cuenta existente del propietario, abrir **Authentication → Users**, seleccionar el usuario correcto y confirmar su correo desde el panel si ofrece esa acción. No borrar la cuenta ni sus datos. Si el panel no ofrece la acción, el propietario puede confirmar **solo su UUID comprobado** desde SQL Editor:

```sql
update auth.users set email_confirmed_at = now()
where id = 'UUID_DE_TU_CUENTA'::uuid and email_confirmed_at is null;
```

Después entrar con correo y contraseña en `/perfil`. No compartir contraseñas ni claves privadas con el asistente. Recuperar la contraseña sigue necesitando correo si se ha olvidado.

## Administración Hikateat

Con Confirm email desactivado, escribir un correo no prueba ser su dueño. Por eso el registro nunca concede administración automáticamente. Los administradores existentes mantienen su rol. Para activar una cuenta nueva: identificar **el UUID de la cuenta propia** en Authentication → Users y, desde SQL Editor del propietario, ejecutar:

```sql
select txalo_privado.designar_hikateat('UUID_DE_TU_CUENTA'::uuid);
```

Esto le da el rol y el nombre Hikateat. Solo el administrador de Supabase puede ejecutarlo, nunca los usuarios de la app. `invitar_hikateat(correo)` ahora solo localiza la cuenta y devuelve instrucciones; no otorga privilegios por correo.

## Buscar usuarios

Feed → **Buscar personas** → buscar por nombre visible (mínimo 2 caracteres). También se conservan los enlaces de amistad. Se devuelven hasta 20 coincidencias, sin correos ni fotos privadas. La búsqueda respeta bloqueos en ambos sentidos y excluye perfiles incompletos. Encontrar un perfil privado no abre sus publicaciones: hace falta su aceptación. El fallo del servidor se muestra como error, no como ausencia de resultados.

## Verificación

Comprobar registro directo con una cuenta de prueba propia, entrada/cierre de sesión y recuperación con un enlace nuevo. Probar la búsqueda con dos perfiles propios, solicitud y aceptación, y bloqueo. No desactivar los permisos RLS ni publicar claves administrativas para resolver acceso.
