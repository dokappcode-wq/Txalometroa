-- Txalometroa · perfiles y feed en Supabase
--
-- Cómo instalarlo: en el panel de Supabase, SQL Editor → New query, pega este fichero entero y pulsa Run.
-- Se puede volver a ejecutar: crea lo que falta y sustituye funciones y políticas.
--
-- Toda la seguridad está aquí (Row Level Security): la app usa la clave pública «anon»
-- y la base de datos solo deja a cada persona escribir lo suyo.

-- ================================================================ Tablas

-- Un perfil por cuenta de Supabase Auth.
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  usuario text not null unique check (usuario ~ '^[a-z0-9_]{3,20}$'),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 160),
  color text not null default '#c80000' check (color ~ '^#[0-9a-f]{6}$'),
  creado timestamptz not null default now()
);

-- Rol: 'admin' puede programar funciones en directo. Solo se cambia desde el panel de Supabase (SQL Editor):
--   update public.perfiles set rol = 'admin' where usuario = 'hika';
alter table public.perfiles add column if not exists rol text not null default 'publico' check (rol in ('publico', 'admin'));
revoke insert, update on public.perfiles from anon, authenticated;
grant insert (id, usuario, nombre, bio, color), update (usuario, nombre, bio, color) on public.perfiles to authenticated;

-- Una valoración por persona y obra (si vuelve a valorar, se sustituye).
-- obra = id del catálogo de la app (app/catalogo.json). Notas 0–10; 0 = sin contestar.
create table if not exists public.valoraciones (
  id bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  obra text not null check (obra ~ '^[a-z0-9-]{1,60}$'),
  gal1 smallint not null default 0 check (gal1 between 0 and 10),
  gal2 smallint not null default 0 check (gal2 between 0 and 10),
  gal3 smallint not null default 0 check (gal3 between 0 and 10),
  gal4 smallint not null default 0 check (gal4 between 0 and 10),
  gal5 smallint not null default 0 check (gal5 between 0 and 10),
  gal6 smallint not null default 0 check (gal6 between 0 and 10),
  gal7 smallint not null default 0 check (gal7 between 0 and 10),
  opinion text not null default '' check (char_length(opinion) <= 1500),
  lang text not null default 'eu' check (lang in ('eu', 'es')),
  creada timestamptz not null default now(),
  editada timestamptz not null default now(),
  unique (usuario_id, obra),
  check (gal1 + gal2 + gal3 + gal4 > 0)          -- como en la app: al menos una nota de GAL1–GAL4
);
create index if not exists valoraciones_editada on public.valoraciones (editada desc, id desc);

create table if not exists public.seguimientos (
  seguidor uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  seguido uuid not null references public.perfiles (id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (seguidor, seguido),
  check (seguidor <> seguido)
);
create index if not exists seguimientos_seguido on public.seguimientos (seguido);

-- «Txalo» (me gusta) a una valoración.
create table if not exists public.txaloak (
  usuario_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  valoracion_id bigint not null references public.valoraciones (id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (usuario_id, valoracion_id)
);
create index if not exists txaloak_valoracion on public.txaloak (valoracion_id);

-- Al editar una valoración sube arriba del feed.
create or replace function public.marcar_editada() returns trigger language plpgsql set search_path = '' as $$
begin new.editada := now(); return new; end $$;
drop trigger if exists valoraciones_editada_trg on public.valoraciones;
create trigger valoraciones_editada_trg before update on public.valoraciones for each row execute function public.marcar_editada();

-- ================================================================ Permisos (RLS)
-- Todo es público para leer (perfiles y opiniones); cada uno solo escribe lo suyo.

alter table public.perfiles enable row level security;
alter table public.valoraciones enable row level security;
alter table public.seguimientos enable row level security;
alter table public.txaloak enable row level security;

drop policy if exists "perfiles: leer" on public.perfiles;
drop policy if exists "perfiles: crear el mío" on public.perfiles;
drop policy if exists "perfiles: editar el mío" on public.perfiles;
create policy "perfiles: leer" on public.perfiles for select using (true);
create policy "perfiles: crear el mío" on public.perfiles for insert to authenticated with check (id = auth.uid());
create policy "perfiles: editar el mío" on public.perfiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "valoraciones: leer" on public.valoraciones;
drop policy if exists "valoraciones: crear las mías" on public.valoraciones;
drop policy if exists "valoraciones: editar las mías" on public.valoraciones;
drop policy if exists "valoraciones: borrar las mías" on public.valoraciones;
create policy "valoraciones: leer" on public.valoraciones for select using (true);
create policy "valoraciones: crear las mías" on public.valoraciones for insert to authenticated with check (usuario_id = auth.uid());
create policy "valoraciones: editar las mías" on public.valoraciones for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "valoraciones: borrar las mías" on public.valoraciones for delete to authenticated using (usuario_id = auth.uid());

drop policy if exists "seguimientos: leer" on public.seguimientos;
drop policy if exists "seguimientos: seguir" on public.seguimientos;
drop policy if exists "seguimientos: dejar de seguir" on public.seguimientos;
create policy "seguimientos: leer" on public.seguimientos for select using (true);
create policy "seguimientos: seguir" on public.seguimientos for insert to authenticated with check (seguidor = auth.uid());
create policy "seguimientos: dejar de seguir" on public.seguimientos for delete to authenticated using (seguidor = auth.uid());

drop policy if exists "txaloak: leer" on public.txaloak;
drop policy if exists "txaloak: dar" on public.txaloak;
drop policy if exists "txaloak: quitar" on public.txaloak;
create policy "txaloak: leer" on public.txaloak for select using (true);
create policy "txaloak: dar" on public.txaloak for insert to authenticated with check (usuario_id = auth.uid());
create policy "txaloak: quitar" on public.txaloak for delete to authenticated using (usuario_id = auth.uid());

-- ================================================================ Funciones que usa la app

-- Feed: valoraciones con su autor y sus txalos, de la más reciente a la más antigua.
-- modo 'jarraitzen' = solo las mías y las de quien sigo; de_usuario = solo las de ese perfil.
-- Paginación: pasa en «antes» la fecha «editada» de la última que ya tienes.
create or replace function public.muro(modo text default 'denak', de_usuario text default null, antes timestamptz default null, limite int default 20)
returns table (id bigint, obra text, nota numeric, gal1 smallint, gal2 smallint, gal3 smallint, gal4 smallint, opinion text,
               creada timestamptz, editada timestamptz, usuario text, nombre text, color text, txaloak bigint, txalo_mio boolean, mia boolean)
language sql stable security invoker set search_path = public as $$
  select v.id, v.obra,
         (select round(avg(x), 2) from unnest(array[v.gal1, v.gal2, v.gal3, v.gal4]) x where x > 0),
         v.gal1, v.gal2, v.gal3, v.gal4, v.opinion, v.creada, v.editada, p.usuario, p.nombre, p.color,
         (select count(*) from txaloak t where t.valoracion_id = v.id),
         exists (select 1 from txaloak t where t.valoracion_id = v.id and t.usuario_id = auth.uid()),
         v.usuario_id = auth.uid()
  from valoraciones v join perfiles p on p.id = v.usuario_id
  where (antes is null or v.editada < antes)
    and (de_usuario is null or p.usuario = de_usuario)
    and (modo <> 'jarraitzen' or v.usuario_id = auth.uid()
         or v.usuario_id in (select s.seguido from seguimientos s where s.seguidor = auth.uid()))
  order by v.editada desc, v.id desc
  limit least(greatest(coalesce(limite, 20), 1), 50);
$$;

-- Ficha de un perfil con sus cifras y si yo le sigo.
create or replace function public.perfil_de(p_usuario text)
returns table (id uuid, usuario text, nombre text, bio text, color text, creado timestamptz,
               valoraciones bigint, seguidores bigint, siguiendo bigint, lo_sigo boolean, es_yo boolean)
language sql stable security invoker set search_path = public as $$
  select p.id, p.usuario, p.nombre, p.bio, p.color, p.creado,
         (select count(*) from valoraciones v where v.usuario_id = p.id),
         (select count(*) from seguimientos s where s.seguido = p.id),
         (select count(*) from seguimientos s where s.seguidor = p.id),
         exists (select 1 from seguimientos s where s.seguido = p.id and s.seguidor = auth.uid()),
         p.id = auth.uid()
  from perfiles p where p.usuario = lower(p_usuario);
$$;

-- Buscar gente por usuario o nombre.
create or replace function public.buscar_perfiles(q text)
returns table (usuario text, nombre text, color text, lo_sigo boolean)
language sql stable security invoker set search_path = public as $$
  select p.usuario, p.nombre, p.color,
         exists (select 1 from seguimientos s where s.seguido = p.id and s.seguidor = auth.uid())
  from perfiles p
  where char_length(btrim(q)) >= 2
    and (p.usuario ilike '%' || replace(replace(btrim(q), '%', ''), '_', '\_') || '%'
         or p.nombre ilike '%' || replace(replace(btrim(q), '%', ''), '_', '\_') || '%')
  order by p.usuario
  limit 20;
$$;

-- Borrar mi cuenta y todo lo mío (RGPD). Borra el usuario de Auth; lo demás cae en cascada.
create or replace function public.borrar_cuenta() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.borrar_cuenta() from public, anon;
grant execute on function public.borrar_cuenta() to authenticated;

-- ================================================================ Funciones en directo y pizarra
-- Hika (rol admin) programa una función con fecha y hora. A esa hora sale «en directo» en la app.
-- Al pulsar «Terminar obra» se abre la pizarra durante «minutos_pizarra»: el público ve en vivo
-- las valoraciones y los comentarios, y quien la terminó ve la cuenta atrás.

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

create table if not exists public.funciones (
  id bigint generated always as identity primary key,
  obra text check (obra ~ '^[a-z0-9-]{1,60}$'),               -- obra del catálogo, o null si es una obra nueva
  titulo text not null default '' check (char_length(titulo) <= 80),   -- título de la obra nueva
  genero text not null default 'drama' check (genero ~ '^[a-z]{1,20}$'),
  lugar text not null default '' check (char_length(lugar) <= 80),
  empieza timestamptz not null,
  minutos_pizarra smallint not null default 10 check (minutos_pizarra between 1 and 120),
  estado text not null default 'programada' check (estado in ('programada', 'pizarra')),
  terminada_en timestamptz,
  pizarra_hasta timestamptz,
  creada_por uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  creada timestamptz not null default now(),
  check (obra is not null or char_length(btrim(titulo)) > 0)
);
create index if not exists funciones_empieza on public.funciones (empieza);
-- «Borrar pizarra»: desde este momento la pizarra empieza de cero.
alter table public.funciones add column if not exists pizarra_borrada timestamptz;

create table if not exists public.comentarios (
  id bigint generated always as identity primary key,
  funcion_id bigint not null references public.funciones (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 280),
  creado timestamptz not null default now()
);
create index if not exists comentarios_funcion on public.comentarios (funcion_id, creado);

alter table public.funciones enable row level security;
alter table public.comentarios enable row level security;

drop policy if exists "funciones: leer" on public.funciones;
drop policy if exists "funciones: crear (admin)" on public.funciones;
drop policy if exists "funciones: editar (admin)" on public.funciones;
drop policy if exists "funciones: borrar (admin)" on public.funciones;
create policy "funciones: leer" on public.funciones for select using (true);
create policy "funciones: crear (admin)" on public.funciones for insert to authenticated with check (public.es_admin() and creada_por = auth.uid());
create policy "funciones: editar (admin)" on public.funciones for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "funciones: borrar (admin)" on public.funciones for delete to authenticated using (public.es_admin());

-- Comentar solo mientras la pizarra está abierta.
drop policy if exists "comentarios: leer" on public.comentarios;
drop policy if exists "comentarios: escribir en la pizarra" on public.comentarios;
drop policy if exists "comentarios: borrar los míos" on public.comentarios;
create policy "comentarios: leer" on public.comentarios for select using (true);
create policy "comentarios: escribir en la pizarra" on public.comentarios for insert to authenticated with check (
  usuario_id = auth.uid() and exists (select 1 from public.funciones f where f.id = funcion_id and f.estado = 'pizarra' and now() < f.pizarra_hasta));
create policy "comentarios: borrar los míos" on public.comentarios for delete to authenticated using (usuario_id = auth.uid() or public.es_admin());

-- Funciones de hoy y próximas (y las pizarras de la última hora).
create or replace function public.funciones_activas()
returns setof public.funciones
language sql stable security invoker set search_path = public as $$
  select * from funciones
  where empieza > now() - interval '12 hours' or (estado = 'pizarra' and pizarra_hasta > now() - interval '1 hour')
  order by empieza limit 30;
$$;

-- «Terminar obra»: abre la pizarra con la hora del servidor (igual para todos los móviles).
create or replace function public.terminar_funcion(p_id bigint)
returns setof public.funciones
language sql volatile security invoker set search_path = public as $$
  update funciones set estado = 'pizarra', terminada_en = now(), pizarra_hasta = now() + make_interval(mins => minutos_pizarra)
  where id = p_id and estado = 'programada'
  returning *;
$$;

-- «Borrar pizarra» (admin): borra los comentarios y deja de mostrar las valoraciones anteriores.
-- Las valoraciones no se borran: siguen en el feed y en el perfil de cada persona.
create or replace function public.borrar_pizarra(p_id bigint)
returns setof public.funciones
language plpgsql volatile security invoker set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'solo admin' using errcode = '42501'; end if;
  delete from comentarios where funcion_id = p_id;
  return query update funciones set pizarra_borrada = now() where id = p_id returning *;
end $$;

-- Lo que sale en la pizarra: comentarios y valoraciones de la obra desde que empezó la función.
create or replace function public.pizarra(p_funcion bigint)
returns table (tipo text, id bigint, texto text, nota numeric, usuario text, nombre text, color text, creado timestamptz)
language sql stable security invoker set search_path = public as $$
  with f as (select * from funciones where id = p_funcion)
  select 'iruzkina', c.id, c.texto, null::numeric, p.usuario, p.nombre, p.color, c.creado
  from comentarios c join perfiles p on p.id = c.usuario_id, f where c.funcion_id = f.id and c.creado > coalesce(f.pizarra_borrada, '-infinity')
  union all
  select 'balorazioa', v.id, v.opinion,
         (select round(avg(x), 2) from unnest(array[v.gal1, v.gal2, v.gal3, v.gal4]) x where x > 0),
         p.usuario, p.nombre, p.color, v.editada
  from valoraciones v join perfiles p on p.id = v.usuario_id, f
  where v.obra = coalesce(f.obra, 'zuzen-' || f.id) and v.editada >= greatest(f.empieza, coalesce(f.pizarra_borrada, f.empieza))
  order by 8 desc
  limit 200;
$$;

-- ================================================================ Permisos de acceso (Data API)
-- Los proyectos nuevos de Supabase no dan permisos automáticos sobre las tablas nuevas:
-- se dan aquí, y las políticas RLS de arriba deciden qué filas puede ver o tocar cada uno.
grant usage on schema public to anon, authenticated;
grant select on public.perfiles, public.valoraciones, public.seguimientos, public.txaloak, public.funciones, public.comentarios to anon, authenticated;
grant insert, update, delete on public.valoraciones, public.seguimientos, public.txaloak, public.funciones, public.comentarios to authenticated;
revoke insert, update on public.perfiles from anon, authenticated;
grant insert (id, usuario, nombre, bio, color), update (usuario, nombre, bio, color) on public.perfiles to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on function public.muro(text, text, timestamptz, int), public.perfil_de(text), public.buscar_perfiles(text),
  public.funciones_activas(), public.pizarra(bigint), public.es_admin() to anon, authenticated;
grant execute on function public.terminar_funcion(bigint), public.borrar_pizarra(bigint) to authenticated;

-- Tiempo real: la app se entera al momento de las funciones, los comentarios y las valoraciones nuevas.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['funciones', 'comentarios', 'valoraciones'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
