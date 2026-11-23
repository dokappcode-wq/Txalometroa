# Supabase: cuentas, perfiles, feed, funciones en directo y pantalla

La app móvil usa Supabase para las cuentas, los perfiles, el feed, los seguimientos, los txalos (me gusta), las funciones en directo con su pizarra y la transmisión del móvil a un ordenador. Mientras `config.json` no tenga los datos del proyecto, la pestaña **Feed** dice que la red social todavía no está conectada y el resto de la app funciona igual.

## Ponerlo en marcha (una vez)

1. Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratuito vale para empezar). Región: **Central EU (Frankfurt)**, por el RGPD.
2. **SQL Editor → New query**: pega [`esquema.sql`](esquema.sql) entero y pulsa **Run**. Crea las tablas, la seguridad (RLS) y las funciones. Se puede volver a ejecutar sin perder datos.
3. **Authentication → Sign In / Providers → Email**: déjalo activado.
   - Con **Confirm email** activado, cada cuenta nueva recibe un correo para confirmar. El servidor de correo que trae Supabase solo envía unos pocos correos por hora: para el público, configura un SMTP propio en **Authentication → Emails → SMTP Settings**.
   - Para las pruebas, puedes desactivar **Confirm email**: así la cuenta funciona al momento.
4. **Authentication → URL Configuration**: en **Site URL** pon `https://txalometroa-escenario.netlify.app`. Es adonde lleva el enlace del correo de confirmación.
5. **Project Settings → API Keys**: copia la URL del proyecto y la clave pública (**anon**, o la **publishable** en los proyectos nuevos) en `config.json`:

   ```json
   "supabase": {
     "url": "https://xxxxxxxx.supabase.co",
     "anon": "eyJhbGciOi…"
   }
   ```

   Esta clave es pública: va en el navegador y la seguridad la ponen las reglas RLS de `esquema.sql`. **Nunca** pongas aquí la clave `service_role` (o `secret`).
6. **Cuenta de Hika como administración** (para programar funciones en directo): crea la cuenta y el perfil desde la app (por ejemplo `@hika`) y luego, en el SQL Editor:

   ```sql
   update public.perfiles set rol = 'admin' where usuario = 'hika';
   ```

   Desde la app nadie puede darse este rol: los permisos de la base de datos no dejan cambiar esa columna.
7. **Realtime** (Project Settings → Realtime): deja permitido el acceso público a los canales (no actives «solo canales privados»). La transmisión a un ordenador usa canales de difusión sin cuenta. `esquema.sql` ya añade `funciones`, `comentarios` y `valoraciones` a la publicación de tiempo real.
8. Compila y publica: `python app/publicar.py`.

## Qué hay en la base de datos

| Tabla | Contenido | Quién escribe |
| --- | --- | --- |
| `perfiles` | Usuario (`@nombre`), nombre, bio y color del avatar; uno por cuenta | Cada persona el suyo |
| `valoraciones` | Notas GAL1–GAL7 y la opinión; una por persona y obra (si vuelve a valorar, se sustituye) | Cada persona las suyas |
| `seguimientos` | Quién sigue a quién | Cada persona sus seguimientos |
| `txaloak` | Los «txalos» (me gusta) a cada valoración | Cada persona los suyos |
| `funciones` | Funciones en directo: obra del catálogo (o título y género de una obra nueva), lugar, fecha y hora, minutos de pizarra y estado | Solo `rol = 'admin'` |
| `comentarios` | Lo que el público escribe en la pizarra (280 caracteres como máximo) | Cada persona los suyos, y solo con la pizarra abierta |

Todo se puede leer (perfiles y opiniones son públicos). Funciones que llama la app: `muro` (el feed, «Todos» o «Siguiendo», y las opiniones de un perfil), `perfil_de`, `buscar_perfiles`, `borrar_cuenta` (borra la cuenta y todo lo suyo), `funciones_activas`, `terminar_funcion` (abre la pizarra con la hora del servidor) y `pizarra` (comentarios y valoraciones de la obra desde que empezó la función).

## Funciones en directo y pizarra

1. Con la cuenta de administración, en tu **perfil** → «Funciones en directo» → «+ Programar función»: obra (o «Obra nueva…» con título y género), fecha, hora, lugar y minutos que dura la pizarra.
2. A esa hora, la función sale **«En directo»** arriba de Obras en la app de todo el mundo, con el botón para valorar. Antes sale en «Próximas funciones».
3. Al acabar, pulsa **«Terminar obra»** (en tu perfil o en la tarjeta en directo, dos veces para confirmar). En tu móvil se abre la **cuenta atrás** con las cifras en vivo. En los móviles del público se abre sola la **pizarra**: valoraciones y comentarios en tiempo real, un campo para escribir y el botón para valorar.
4. Cuando acaba la cuenta atrás, la pizarra se cierra y ya no se puede comentar.

## Transmitir el móvil a un ordenador

1. En el ordenador, abre `https://txalometroa-escenario.netlify.app/#pantalla`: sale un código de 6 letras.
2. En el móvil: **Ajustes → Transmitir a un ordenador**, escribe el código y pulsa «Conectar».
3. El ordenador muestra en un marco de móvil lo mismo que ves en el móvil, en directo: cada pantalla, el desplazamiento, lo que escribes, la pizarra y la constelación (como imagen, una vez por segundo). El icono rojo de la cabecera indica que se está transmitiendo; tócalo para parar.

Los navegadores de móvil no dejan grabar la pantalla, así que no se envía vídeo: el móvil manda la página comprimida (unos pocos KB por cambio) por un canal de Supabase Realtime. No hace falta cuenta, pero sí Supabase configurado.

## Diferencias con la especificación definitiva

Esto es un primer paso hacia [`docs/version-definitiva.md`](../docs/version-definitiva.md). Todavía no incluye: butacas con QR (las valoraciones van por obra, no por función), perfiles privados, comentarios en el feed (solo en la pizarra), notificaciones, bloquear y denunciar, fotos de perfil ni inicio de sesión con Google. Las valoraciones del export histórico tampoco están en la base de datos: la nota pública de cada obra sigue saliendo del export, como antes.
