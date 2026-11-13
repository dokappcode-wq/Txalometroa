begin;
alter table public.perfiles add column avatar_path text;
alter table public.perfiles add column condiciones_version text;
alter table public.perfiles add column condiciones_aceptadas timestamptz;
alter table public.perfiles add constraint avatar_propio check (avatar_path is null or avatar_path like id::text || '/%');

-- Revocar también los privilegios por defecto del esquema de Supabase.
revoke all on public.perfiles from anon, authenticated;
grant select on public.perfiles to authenticated;
grant update(nombre,privado,idioma,avatar_path) on public.perfiles to authenticated;
drop policy editar_propio on public.perfiles;
create policy editar_propio on public.perfiles for update to authenticated
 using(id=auth.uid() and condiciones_aceptadas is not null)
 with check(id=auth.uid() and condiciones_aceptadas is not null);

create function public.aceptar_condiciones(p_version text, p_acepta boolean, p_edad boolean)
 returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sesión requerida'; end if;
 if p_version is distinct from 'revision-2026-11' or p_acepta is distinct from true or p_edad is distinct from true then
  raise exception 'Confirmación requerida';
 end if;
 update public.perfiles set condiciones_version=p_version, condiciones_aceptadas=coalesce(condiciones_aceptadas,now()) where id=auth.uid();
 if not found then raise exception 'Perfil no encontrado'; end if;
end; $$;
revoke all on function public.aceptar_condiciones(text,boolean,boolean) from public,anon;
grant execute on function public.aceptar_condiciones(text,boolean,boolean) to authenticated;

-- Cubre cuentas creadas antes de aplicar la primera migración.
insert into public.perfiles(id) select id from auth.users on conflict(id) do nothing;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('avatares','avatares',false,2097152,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy avatar_lectura on storage.objects for select to authenticated using(
 bucket_id='avatares' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.perfiles where id=auth.uid()));
create policy avatar_alta on storage.objects for insert to authenticated with check(
 bucket_id='avatares' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.perfiles where id=auth.uid() and condiciones_aceptadas is not null));
create policy avatar_borrar on storage.objects for delete to authenticated using(
 bucket_id='avatares' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
