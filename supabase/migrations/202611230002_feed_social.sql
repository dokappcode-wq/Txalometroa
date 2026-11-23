begin;

-- Las opiniones anteriores conservan su visibilidad.
alter table public.opiniones
  add column publicada boolean not null default false,
  add column nota smallint check (nota between 1 and 10);
grant insert (publicada, nota) on public.opiniones to authenticated;
create policy leer_opiniones_publicadas on public.opiniones for select to authenticated using (publicada);
create index opiniones_social_orden on public.opiniones (creada_en desc, id desc, usuario_id desc) where publicada;

create table public.comentarios_opinion (
  id uuid primary key,
  autor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opinion_usuario uuid not null,
  opinion_id uuid not null,
  texto text not null check (char_length(texto) <= 600 and texto ~ '[^[:space:]]'),
  creada_en timestamptz not null default now(),
  foreign key (opinion_usuario, opinion_id) references public.opiniones(usuario_id, id) on delete cascade
);
create index comentarios_opinion_hilo on public.comentarios_opinion (opinion_usuario, opinion_id, creada_en desc, id desc);

create table public.likes_opinion (
  autor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opinion_usuario uuid not null,
  opinion_id uuid not null,
  primary key (opinion_usuario, opinion_id, autor_id),
  foreign key (opinion_usuario, opinion_id) references public.opiniones(usuario_id, id) on delete cascade
);

alter table public.comentarios_opinion enable row level security;
alter table public.likes_opinion enable row level security;
revoke all on public.comentarios_opinion, public.likes_opinion from public, anon, authenticated;
grant select on public.comentarios_opinion, public.likes_opinion to authenticated;
grant insert (id, opinion_usuario, opinion_id, texto) on public.comentarios_opinion to authenticated;
grant insert (opinion_usuario, opinion_id) on public.likes_opinion to authenticated;
grant delete on public.likes_opinion to authenticated;

create policy leer_hilos on public.comentarios_opinion for select to authenticated
  using (exists (select 1 from public.opiniones o where o.usuario_id = opinion_usuario and o.id = opinion_id and o.publicada));
create policy comentar_publicadas on public.comentarios_opinion for insert to authenticated
  with check (autor_id = (select auth.uid()) and exists (
    select 1 from public.opiniones o where o.usuario_id = opinion_usuario and o.id = opinion_id and o.publicada));
create policy leer_likes_propios on public.likes_opinion for select to authenticated using (autor_id = (select auth.uid()));
create policy dar_like_publicadas on public.likes_opinion for insert to authenticated
  with check (autor_id = (select auth.uid()) and exists (
    select 1 from public.opiniones o where o.usuario_id = opinion_usuario and o.id = opinion_id and o.publicada));
create policy quitar_like_propio on public.likes_opinion for delete to authenticated using (autor_id = (select auth.uid()));

-- Devuelve el total sin exponer quién ha dado like.
create function public.feed_social(antes timestamptz default null, id_anterior uuid default null, autor_anterior uuid default null)
returns table (usuario_id uuid, id uuid, obra_id text, texto text, nota smallint,
  creada_en timestamptz, likes bigint, comentarios bigint, gustado boolean)
language sql stable security definer set search_path = '' as $$
  select o.usuario_id, o.id, o.obra_id, o.texto, o.nota, o.creada_en,
    (select count(*) from public.likes_opinion l where (l.opinion_usuario, l.opinion_id) = (o.usuario_id, o.id)),
    (select count(*) from public.comentarios_opinion c where (c.opinion_usuario, c.opinion_id) = (o.usuario_id, o.id)),
    exists (select 1 from public.likes_opinion l where (l.opinion_usuario, l.opinion_id, l.autor_id) = (o.usuario_id, o.id, auth.uid()))
  from public.opiniones o
  where auth.uid() is not null and o.publicada
    and (antes is null or (o.creada_en, o.id, o.usuario_id) < (antes, id_anterior, autor_anterior))
  order by o.creada_en desc, o.id desc, o.usuario_id desc limit 21;
$$;
revoke all on function public.feed_social(timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function public.feed_social(timestamptz, uuid, uuid) to authenticated;

commit;
