# Versión definitiva: especificación técnica

Guía para programar la app definitiva a partir del prototipo. El alcance y el precio están en [presupuesto.md](presupuesto.md): **135 h** (40 de diseño y 95 de programación), en unas 6 semanas.

## Qué cambia respecto al prototipo

| | Prototipo | Versión definitiva |
| --- | --- | --- |
| Datos | En el navegador de cada persona | Base de datos compartida (Supabase) |
| Entrada de datos | Export manual del WordPress | La propia app sustituye al formulario |
| Usuarios | Anónimos | Cuentas, perfiles y red social |
| Butacas | Simulación | Check-in real con un QR en cada butaca, en tiempo real |
| Publicación en la web | Copiar y pegar un bloque HTML | La web de Hika lee las reseñas sola |
| Gestión | Ajustes y JSON | Panel de administración para Hika |

## Tecnología

| Pieza | Elección | Por qué |
| --- | --- | --- |
| App | React + TypeScript con Vite, como PWA (`vite-plugin-pwa`) | Instalable desde la web, sin tiendas; Claude Code la escribe con soltura |
| Rutas | React Router | Una URL por pantalla (necesaria para los QR y para compartir) |
| Datos en el cliente | Cliente oficial `@supabase/supabase-js` | Consultas, sesión y tiempo real |
| Backend | Supabase: Postgres, Auth, Realtime, Storage, Edge Functions | Todo en un servicio, con permisos en la base de datos |
| Alojamiento | Netlify | Donde ya está el prototipo, con HTTPS |
| Anti-bots | Cloudflare Turnstile | Sin captchas molestos |
| Errores | Sentry (plan gratuito) | Avisos cuando la app falla en un móvil |
| Región de datos | Supabase en la UE (Fráncfort) | RGPD |

Las piezas visuales (`svgLogoLiquido`, `svgMascara`, `LOGO`), la lógica de métricas y el diseño se reutilizan del prototipo (ver más abajo).

## Arquitectura

```
Público (móvil) ──┐
Hika (panel)     ─┼──► App PWA en Netlify ──► Supabase (Auth · Postgres + RLS · Realtime · Storage)
QR de la butaca  ─┘                                   │
                                                      └──► Web de Hika (WordPress) lee las reseñas publicadas
```

- Toda la seguridad vive en Supabase con **Row Level Security**: la app no puede saltársela aunque alguien modifique el código del navegador.
- La web de Hika no necesita cuenta: lee una **vista pública** (`obra_resena`) con la clave anónima de Supabase, o una Edge Function que devuelve el HTML del bloque.

## Modelo de datos

Borrador de tablas en Postgres (esquema `public`). Los nombres van en castellano, como el prototipo.

```sql
-- Perfiles: uno por cuenta de Supabase Auth
create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  usuario text unique not null check (usuario ~ '^[a-z0-9_]{3,20}$'),
  nombre text not null,
  avatar_url text,
  idioma text not null default 'eu' check (idioma in ('eu', 'es')),
  privado boolean not null default false,
  rol text not null default 'publico' check (rol in ('publico', 'admin')),
  creado timestamptz not null default now()
);

create table generos (
  id text primary key,                 -- 'drama', 'komedia', …
  eu text not null, es text not null, color text not null
);

create table obras (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- 'zorretan'
  titulo_eu text not null, titulo_es text not null,
  urtea int, genero text references generos,
  imagen_url text,
  activa boolean not null default true,     -- aparece para valorar
  wp_post_eu int, wp_post_es int            -- enlace con la web de Hika
);

create table salas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null, localidad text not null
);

create table butacas (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references salas on delete cascade,
  fila text not null, numero int not null,
  qr_token text unique not null default encode(gen_random_bytes(12), 'hex'),
  unique (sala_id, fila, numero)
);

create table funciones (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras,
  sala_id uuid not null references salas,
  empieza timestamptz not null
);

-- Una valoración por persona y función (y como mucho una sin función por obra)
create table valoraciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles on delete cascade,
  obra_id uuid not null references obras,
  funcion_id uuid references funciones,
  gal1 smallint check (gal1 between 1 and 10),
  gal2 smallint check (gal2 between 1 and 10),
  gal3 smallint check (gal3 between 1 and 10),
  gal4 smallint check (gal4 between 1 and 10),
  gal5 smallint check (gal5 between 1 and 10),
  gal6 smallint check (gal6 between 1 and 10),
  gal7 smallint check (gal7 between 1 and 10),
  emocion text check (emocion in ('barre', 'negar', 'biak', 'ez')),
  respuestas jsonb not null default '{}',   -- zertaz, pertsonaia, gatazka, konpondu, unea, hunkitu
  publica boolean not null default true,    -- sale como reseña en la red social
  idioma text not null,
  creada timestamptz not null default now(),
  check (coalesce(gal1, gal2, gal3, gal4) is not null),
  unique (usuario_id, funcion_id)
);

-- Las 546 valoraciones históricas del export, sin usuario
create table valoraciones_historicas (
  id int primary key,                  -- ID del export
  obra_id uuid not null references obras,
  cuando timestamptz not null, idioma text,
  gal1 smallint, gal2 smallint, gal3 smallint, gal4 smallint, gal5 smallint, gal6 smallint, gal7 smallint
);

-- Red social
create table seguimientos (
  seguidor uuid references perfiles on delete cascade,
  seguido uuid references perfiles on delete cascade,
  creado timestamptz not null default now(),
  primary key (seguidor, seguido), check (seguidor <> seguido)
);
create table comentarios (
  id uuid primary key default gen_random_uuid(),
  valoracion_id uuid not null references valoraciones on delete cascade,
  usuario_id uuid not null references perfiles on delete cascade,
  texto text not null check (length(texto) between 1 and 600),
  creado timestamptz not null default now(),
  oculto boolean not null default false     -- moderación
);
create table megustas (
  usuario_id uuid references perfiles on delete cascade,
  valoracion_id uuid references valoraciones on delete cascade,
  primary key (usuario_id, valoracion_id)
);
create table bloqueos (
  bloqueador uuid references perfiles on delete cascade,
  bloqueado uuid references perfiles on delete cascade,
  primary key (bloqueador, bloqueado)
);
create table denuncias (
  id uuid primary key default gen_random_uuid(),
  denunciante uuid not null references perfiles,
  tipo text not null check (tipo in ('valoracion', 'comentario', 'perfil')),
  objetivo uuid not null, motivo text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'resuelta', 'descartada')),
  creada timestamptz not null default now()
);
create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles on delete cascade,
  tipo text not null,                       -- 'seguidor', 'megusta', 'comentario'
  datos jsonb not null default '{}',
  leida timestamptz, creada timestamptz not null default now()
);

-- Butacas en directo: una persona por butaca y función
create table ocupaciones (
  funcion_id uuid references funciones on delete cascade,
  butaca_id uuid references butacas,
  usuario_id uuid references perfiles on delete cascade,
  creada timestamptz not null default now(),
  primary key (funcion_id, butaca_id),
  unique (funcion_id, usuario_id)
);
```

**Vistas:**

- `obra_resena`: por obra, número de valoraciones, nota media de GAL1–GAL4, media de cada pregunta y % que la recomendaría. Junta `valoraciones` y `valoraciones_historicas`. Las fórmulas son las de `metricas` y `metricasPregunta` en `app/nucleo.js`. Es la que lee la web de Hika.
- `wrapped_mundial`: totales, ranking de obras, hora punta, reparto eu/es y noche récord.

## Permisos (RLS)

| Tabla | Leer | Escribir |
| --- | --- | --- |
| `perfiles` | Todos los públicos; los privados, solo quien les sigue | Cada uno el suyo; `rol` solo un admin |
| `obras`, `generos`, `salas`, `funciones` | Todos | Solo admin |
| `butacas` | Todos, **sin `qr_token`** (columna oculta con una vista) | Solo admin |
| `valoraciones` | Las públicas de perfiles visibles y no bloqueados; las propias siempre | Insertar y editar las propias; borrar las propias o admin |
| `valoraciones_historicas` | Solo a través de las vistas | Solo admin (importación) |
| `seguimientos`, `megustas`, `bloqueos` | Los que te afectan | Los propios |
| `comentarios` | Los no ocultos de valoraciones que puedes ver | Insertar los propios; ocultar solo admin |
| `denuncias` | Las propias; todas si admin | Insertar los propios; cambiar estado solo admin |
| `notificaciones` | Las propias | Las crea un trigger; marcar como leída la propia |
| `ocupaciones` | Todos, por función (para el mapa) | Solo con la función `sentarse` (abajo) |

## Pantallas

**Público**

1. Bienvenida, registro e inicio de sesión (email o Google), con consentimiento RGPD y edad mínima de 14 años.
2. Obras: activas con el logo líquido, y el repertorio.
3. Ficha de obra: nota del público, máscaras por aspecto, reseñas públicas y botón TXALOTU.
4. Valorar: los 3 pasos del prototipo (máscaras, emociones, palabras) y el resultado.
5. Muro: actividad de quien sigues (valoraciones, comentarios).
6. Perfil: tus obras, tu constelación, seguidores y seguidos, y editar perfil.
7. Constelación.
8. Wrapped mundial y personal, con compartir como imagen.
9. Butacas: el mapa de la función en directo.
10. Notificaciones.
11. Ajustes: idioma, privacidad, descargar tus datos, borrar la cuenta y cerrar sesión.

**Hika (rol admin)**

12. Obras: alta y edición, con foto (Supabase Storage), género, títulos eu/es y enlace con los posts de WordPress.
13. Salas y butacas: crear una sala por filas y números, e imprimir sus QR.
14. Funciones: obra, sala, fecha y hora.
15. Moderación: denuncias, y ocultar o borrar contenido.
16. Estadísticas: el informe de la app de análisis del prototipo (`htmlInforme`), ahora desde la base de datos, con exportación CSV.

## Flujos clave

### QR de butaca

1. Cada butaca tiene un QR con `https://<app>/b/<qr_token>`.
2. Al abrirlo, la app pide iniciar sesión si hace falta y llama a la función de base de datos `sentarse(qr_token)`.
3. `sentarse` busca la función que se está celebrando en esa sala (de 60 minutos antes a 30 minutos después del inicio) e inserta en `ocupaciones`. Si la butaca ya está ocupada o la persona ya está sentada en esa función, devuelve un error.
4. El mapa de butacas está suscrito por Supabase Realtime a `ocupaciones` de esa función y enciende cada butaca al momento.
5. Al terminar la función, la app propone valorar esa función, con la `funcion_id` ya puesta.

### Publicación en la web de Hika

- Un shortcode `[txalometroa obra="zorretan" lang="eu"]` en un plugin mínimo de WordPress, o un bloque HTML con un pequeño script, lee `obra_resena` y pinta la reseña.
- El HTML y el CSS son los de `bloqueWordpress` en `app/nucleo.js`, con el logo líquido.
- El botón TXALOTU de la web enlaza a `https://<app>/obra/<slug>`.

### Importar el histórico

Un script (puede partir de `analizar.py`) lee el export, aplica la misma limpieza (vacíos, sin obra, duplicados, 0 = no contestada) e inserta en `valoraciones_historicas`. Son 546 filas. Hay que comprobar que la nota de cada obra sale igual que en el prototipo: 9,56, 9,16, 9,58 y 9,25.

## Seguridad y RGPD

- [ ] RLS activado en todas las tablas, con una prueba por política (un usuario no puede leer ni escribir lo de otro).
- [ ] La clave `service_role` de Supabase nunca llega al navegador; solo se usa en Edge Functions.
- [ ] Turnstile en el registro y al valorar; límite de valoraciones por minuto.
- [ ] Validación de longitudes y rangos en la base de datos (los `check` del modelo), no solo en la app.
- [ ] Consentimiento al registrarse, política de privacidad y condiciones (redactadas por un asesor), edad mínima de 14 años.
- [ ] Descargar todos tus datos (JSON) y borrar la cuenta en cascada.
- [ ] Copias diarias (Supabase Pro), HTTPS y avisos de error con Sentry.
- [ ] Denunciar, bloquear y moderar desde el panel.

## Qué se reutiliza del prototipo

| Del prototipo | En la versión definitiva |
| --- | --- |
| `svgLogoLiquido`, `svgMascara`, `LOGO` (`app/nucleo.js`) | Componentes React `<LogoLiquido nota>` y `<Mascara k relleno>` |
| Entrada de máscaras (`htmlMaskarak`, `ponerNota` en `movil/index.src.html`) | Componente `<NotaConMascaras>`, con la misma accesibilidad (`role="slider"`, flechas) |
| Constelación (`calcularNodos`, `calcularLineas`, `hasiZerua`) | Igual, con los datos de la base de datos |
| Wrapped (`diapositivasMundial`, `diapositivasPersonal`) | Igual; el mundial, desde la vista `wrapped_mundial` |
| Métricas (`metricas`, `metricasPregunta`) | Fórmulas de las vistas SQL |
| `bloqueWordpress` | HTML del shortcode de WordPress |
| Paleta, tipografía e iconos | [diseno.md](diseno.md) y `movil/icons/` |
| Textos eu/es (objeto `T` en `movil/index.src.html`) | Ficheros de traducción `eu.json` y `es.json` |

## Fases

| Fase | Horas | Hecho cuando |
| --- | --- | --- |
| Análisis con Hika | 8 | Géneros confirmados, plano de salas, textos legales encargados |
| Diseño en Figma | 32 | Pantallas de público y admin aprobadas por Hika |
| Base técnica | 9 | Repositorio, Supabase en la UE, tablas, RLS y despliegue automático en Netlify |
| Cuentas y perfiles | 10 | Registro, inicio de sesión, perfil, privacidad, descargar y borrar datos |
| Valorar con máscaras | 10 | Los 3 pasos guardan en `valoraciones`, con una por función |
| Red social | 23 | Seguir, muro, reseñas públicas, comentarios, me gusta, notificaciones, denunciar y bloquear |
| Constelación y Wrapped | 9 | Desde la base de datos; compartir como imagen |
| Butacas con QR | 14 | `sentarse`, mapa en tiempo real y QR imprimibles |
| Panel de Hika | 14 | Obras, salas, funciones, moderación y estadísticas |
| Reseñas en la web de Hika | 6 | Shortcode en WordPress con el logo líquido; TXALOTU enlaza a la app |

## Preguntas abiertas

- ¿Quién instala el plugin de WordPress (el shortcode)? ¿Tenemos acceso de administrador a la web?
- ¿Cuántas salas y con qué plano? ¿Las butacas tienen numeración fija?
- ¿Se mantiene la pregunta GAL7 (programación local) cuando ya sabemos la sala de cada función?
- ¿Se pide el móvil o solo el email al registrarse?
- ¿Las reseñas son públicas por defecto o privadas?
