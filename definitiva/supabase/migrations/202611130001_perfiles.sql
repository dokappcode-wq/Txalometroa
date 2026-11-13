create table public.perfiles (
 id uuid primary key references auth.users on delete cascade,
 nombre text not null default '' check(length(nombre)<=80),
 privado boolean not null default true,
 idioma text not null default 'es' check(idioma in ('es','eu')),
 creado timestamptz not null default now()
);
alter table public.perfiles enable row level security;
create policy leer_propio on public.perfiles for select to authenticated using(id=auth.uid());
create policy editar_propio on public.perfiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
revoke all on public.perfiles from anon;
grant select, update(nombre,privado,idioma) on public.perfiles to authenticated;
create function public.crear_perfil() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.perfiles(id) values(new.id);
 return new;
end;
$$;
create trigger nuevo_usuario after insert on auth.users for each row execute function public.crear_perfil();
revoke execute on function public.crear_perfil() from public;
