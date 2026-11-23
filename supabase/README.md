# Supabase: cuentas, perfiles y feed

La app móvil usa Supabase para las cuentas, los perfiles, el feed, los seguimientos y los txalos (me gusta). Mientras `config.json` no tenga los datos del proyecto, la pestaña **Feed** dice que la red social todavía no está conectada y el resto de la app funciona igual.

## Ponerlo en marcha (una vez)

1. Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratuito vale para empezar). Región: **Central EU (Frankfurt)**, por el RGPD.
2. **SQL Editor → New query**: pega [`esquema.sql`](esquema.sql) entero y pulsa **Run**. Crea las tablas, la seguridad (RLS) y las funciones. Se puede volver a ejecutar sin perder datos.
3. **Authentication → Sign In / Providers → Email**: déjalo activado.
   - Con **Confirm email** activado, cada cuenta nueva recibe un correo para confirmar. El servidor de correo que trae Supabase solo envía unos pocos correos por hora: para el público, configura un SMTP propio en **Authentication → Emails → SMTP Settings**.
   - Para las pruebas, puedes desactivar **Confirm email**: así la cuenta funciona al momento.
4. **Authentication → URL Configuration**: en **Site URL** pon `https://txalometroa-hika.netlify.app`. Es adonde lleva el enlace del correo de confirmación.
5. **Project Settings → API Keys**: copia la URL del proyecto y la clave pública (**anon**, o la **publishable** en los proyectos nuevos) en `config.json`:

   ```json
   "supabase": {
     "url": "https://xxxxxxxx.supabase.co",
     "anon": "eyJhbGciOi…"
   }
   ```

   Esta clave es pública: va en el navegador y la seguridad la ponen las reglas RLS de `esquema.sql`. **Nunca** pongas aquí la clave `service_role` (o `secret`).
6. Compila y publica: `python app/publicar.py`.

## Qué hay en la base de datos

| Tabla | Contenido | Quién escribe |
| --- | --- | --- |
| `perfiles` | Usuario (`@nombre`), nombre, bio y color del avatar; uno por cuenta | Cada persona el suyo |
| `valoraciones` | Notas GAL1–GAL7 y la opinión; una por persona y obra (si vuelve a valorar, se sustituye) | Cada persona las suyas |
| `seguimientos` | Quién sigue a quién | Cada persona sus seguimientos |
| `txaloak` | Los «txalos» (me gusta) a cada valoración | Cada persona los suyos |

Todo se puede leer (perfiles y opiniones son públicos). Funciones que llama la app: `muro` (el feed, «Todos» o «Siguiendo», y las opiniones de un perfil), `perfil_de`, `buscar_perfiles` y `borrar_cuenta` (borra la cuenta y todo lo suyo).

## Diferencias con la especificación definitiva

Esto es un primer paso hacia [`docs/version-definitiva.md`](../docs/version-definitiva.md). Todavía no incluye: funciones con QR (las valoraciones van por obra), perfiles privados, comentarios, notificaciones, bloquear y denunciar, fotos de perfil ni inicio de sesión con Google. Las valoraciones del export histórico tampoco están en la base de datos: la nota pública de cada obra sigue saliendo del export, como antes.
