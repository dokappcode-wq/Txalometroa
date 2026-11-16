-- Requiere las migraciones del feed y dashboard. No elimina cuentas ni contenido.
-- Aplicar ANTES de desactivar Confirm email: la administración se concede manualmente.
begin;
create or replace function public.feed_buscar_usuarios(p_texto text) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'nombre',r.nombre,'privado',r.privado,'estado',r.estado) order by lower(r.nombre),r.id),'[]'::jsonb)
 from (
  select p.id,p.nombre,p.privado,
   (select s.estado from public.feed_seguimientos s where s.seguidor=auth.uid() and s.seguido=p.id) estado
  from public.perfiles p
  where auth.uid() is not null and p.id<>auth.uid()
   and length(btrim(p_texto)) between 2 and 60
   and p.condiciones_aceptadas is not null and length(btrim(p.nombre))>0
   and not txalo_privado.bloqueado(p.id)
   and strpos(lower(p.nombre),lower(btrim(p_texto)))>0
  order by lower(p.nombre),p.id limit 20
 ) r;
$$;
revoke all on function public.feed_buscar_usuarios(text) from public,anon,authenticated;
grant execute on function public.feed_buscar_usuarios(text) to authenticated;
-- email_confirmed_at también se rellena automáticamente al desactivar Confirm email.
-- Por ello no debe conceder privilegios a quien registre un correo reservado.
drop trigger if exists txalo_admin_usuario on auth.users;
create or replace function txalo_privado.invitar_hikateat(p_correo text) returns text
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_correo text:=lower(btrim(p_correo));
begin
 if v_correo is null or v_correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'CORREO_NO_VALIDO';end if;
 select id into v_id from auth.users where lower(email)=v_correo;
 if v_id is null then return 'Crea primero la cuenta. Después, su propietario debe conceder el rol por UUID desde SQL Editor.';end if;
 return 'Cuenta localizada. Comprueba su identidad y ejecuta txalo_privado.designar_hikateat con el UUID: '||v_id;
end; $$;
create or replace function txalo_privado.designar_hikateat(p_usuario uuid) returns text
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=p_usuario) then raise exception 'CUENTA_NO_EXISTE';end if;
 insert into txalo_privado.administradores(usuario) values(p_usuario) on conflict do nothing;
 update public.perfiles set nombre='Hikateat' where id=p_usuario;
 delete from txalo_privado.invitaciones_admin where correo in(select lower(email) from auth.users where id=p_usuario);
 return 'Hikateat activado en la cuenta seleccionada';
end; $$;
revoke all on function txalo_privado.invitar_hikateat(text),txalo_privado.designar_hikateat(uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
