begin;

create table public.opiniones (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  obra_id text not null check (obra_id ~ '^[a-z0-9-]{1,80}$'),
  texto text not null check (char_length(texto) <= 2000 and texto ~ '[^[:space:]]'),
  creada_en timestamptz not null default now(),
  primary key (usuario_id, id)
);

create index opiniones_feed on public.opiniones (usuario_id, creada_en desc, id desc);
alter table public.opiniones enable row level security;

revoke all on public.opiniones from public, anon, authenticated;
grant select on public.opiniones to authenticated;
grant insert (usuario_id, id, obra_id, texto) on public.opiniones to authenticated;

create policy leer_opiniones_propias on public.opiniones for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy insertar_opiniones_propias on public.opiniones for insert to authenticated
  with check (usuario_id = (select auth.uid()));

commit;
