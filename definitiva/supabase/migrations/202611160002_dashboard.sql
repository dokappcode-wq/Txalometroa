-- Dashboard y moderación. Requiere instalar-feed.sql.
begin;
create table if not exists txalo_privado.administradores (
 usuario uuid primary key references auth.users on delete cascade, creado timestamptz not null default now()
);
create table if not exists txalo_privado.invitaciones_admin (
 correo text primary key, creado timestamptz not null default now()
);
create table if not exists txalo_privado.acciones_admin (
 id bigint generated always as identity primary key,
 administrador uuid references auth.users on delete set null,
 accion text not null, denuncia uuid, creado timestamptz not null default now()
);
revoke all on txalo_privado.administradores,txalo_privado.invitaciones_admin,txalo_privado.acciones_admin from public,anon,authenticated;
create or replace function txalo_privado.es_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from txalo_privado.administradores where usuario=auth.uid());
$$;
revoke all on function txalo_privado.es_admin() from public,anon,authenticated;
create or replace function public.admin_estado() returns boolean language sql stable security definer set search_path='' as $$
 select txalo_privado.es_admin();
$$;
-- Solo el administrador del proyecto puede reservar el correo. No crea contraseñas.
create or replace function txalo_privado.invitar_hikateat(p_correo text) returns text language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_correo text:=lower(btrim(p_correo));
begin
 if v_correo is null or v_correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'CORREO_NO_VALIDO';end if;
 select id into v_id from auth.users where lower(email)=v_correo and email_confirmed_at is not null;
 if v_id is not null then
  insert into txalo_privado.administradores(usuario) values(v_id) on conflict do nothing;
  update public.perfiles set nombre='Hikateat' where id=v_id;
  delete from txalo_privado.invitaciones_admin where correo=v_correo;
  return 'Hikateat activado en la cuenta verificada';
 end if;
 insert into txalo_privado.invitaciones_admin(correo) values(v_correo) on conflict do nothing;
 return 'Reservado: registrarse y confirmar el correo para activar Hikateat';
end; $$;
create or replace function txalo_privado.activar_hikateat_verificado() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null then
  delete from txalo_privado.invitaciones_admin where correo=lower(new.email);
  if found then
   insert into txalo_privado.administradores(usuario) values(new.id) on conflict do nothing;
   update public.perfiles set nombre='Hikateat' where id=new.id;
  end if;
 end if;
 return new;
end; $$;
drop trigger if exists txalo_admin_usuario on auth.users;
create trigger txalo_admin_usuario after insert or update of email_confirmed_at,email on auth.users for each row execute function txalo_privado.activar_hikateat_verificado();
revoke all on function txalo_privado.invitar_hikateat(text),txalo_privado.activar_hikateat_verificado() from public,anon,authenticated;

create or replace function public.admin_dashboard(p_dias integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_hoy date:=(now() at time zone 'Europe/Madrid')::date; v_inicio date; v_resultado jsonb;
begin
 if not txalo_privado.es_admin() then raise exception 'NO_PERMITIDO';end if;
 if p_dias not in (7,30,90) or p_dias is null then raise exception 'PERIODO_NO_VALIDO';end if;
 v_inicio:=v_hoy-p_dias+1;
 select jsonb_build_object('desde',v_inicio,'hasta',v_hoy,'generado',now(),
 'resumen',jsonb_build_object(
  'cuentas',(select count(*) from public.perfiles),
  'privados',(select count(*) from public.perfiles where privado),
  'publicaciones',(select count(*) from public.feed_publicaciones where (creado at time zone 'Europe/Madrid')::date between v_inicio and v_hoy),
  'comentarios',(select count(*) from public.feed_comentarios where (creado at time zone 'Europe/Madrid')::date between v_inicio and v_hoy),
  'aplausos',(select count(*) from public.feed_aplausos where (creado at time zone 'Europe/Madrid')::date between v_inicio and v_hoy),
  'participantes',(select count(distinct autor) from (
   select autor from public.feed_publicaciones where (creado at time zone 'Europe/Madrid')::date between v_inicio and v_hoy union all
   select autor from public.feed_comentarios where (creado at time zone 'Europe/Madrid')::date between v_inicio and v_hoy union all
   select autor from public.feed_aplausos where (creado at time zone 'Europe/Madrid')::date between v_inicio and v_hoy) a),
  'seguimientos',(select count(*) from public.feed_seguimientos where estado='aceptado'),
  'denuncias_pendientes',(select count(*) from public.feed_denuncias where estado='pendiente')),
 'actividad',(select jsonb_agg(jsonb_build_object('dia',dia::date,
  'publicaciones',(select count(*) from public.feed_publicaciones where (creado at time zone 'Europe/Madrid')::date=dia::date),
  'comentarios',(select count(*) from public.feed_comentarios where (creado at time zone 'Europe/Madrid')::date=dia::date),
  'cuentas',(select count(*) from public.perfiles where (creado at time zone 'Europe/Madrid')::date=dia::date)) order by dia)
  from generate_series(v_inicio::timestamp,v_hoy::timestamp,interval '1 day') dia),
 'obras',coalesce((select jsonb_agg(jsonb_build_object('obra_id',o.obra_id,'publicaciones',o.total,'comentarios',o.comentarios,'aplausos',o.aplausos) order by o.total desc,o.obra_id)
  from(select p.obra_id,count(*) as total,
   sum((select count(*) from public.feed_comentarios c where c.publicacion=p.id)) as comentarios,
   sum((select count(*) from public.feed_aplausos a where a.publicacion=p.id)) as aplausos
   from public.feed_publicaciones p where p.obra_id is not null and (p.creado at time zone 'Europe/Madrid')::date between v_inicio and v_hoy group by p.obra_id)o),'[]'::jsonb),
 'denuncias',coalesce((select jsonb_agg(d order by d.creado) from (
  select r.id,r.publicacion,r.comentario,r.motivo,r.contenido,r.creado,p.nombre as autor
  from public.feed_denuncias r join public.feed_publicaciones f on f.id=r.publicacion
  left join public.feed_comentarios c on c.id=r.comentario join public.perfiles p on p.id=coalesce(c.autor,f.autor)
  where r.estado='pendiente' order by r.creado limit 50)d),'[]'::jsonb)) into v_resultado;
 return v_resultado;
end; $$;
create or replace function public.admin_moderar(p_denuncia uuid,p_accion text) returns void
language plpgsql security definer set search_path='' as $$
declare v_post uuid;v_comentario uuid;
begin
 if not txalo_privado.es_admin() then raise exception 'NO_PERMITIDO';end if;
 if p_accion not in ('descartar','retirar') or p_accion is null then raise exception 'ACCION_NO_VALIDA';end if;
 select publicacion,comentario into v_post,v_comentario from public.feed_denuncias where id=p_denuncia and estado='pendiente' for update;
 if not found then return;end if;
 insert into txalo_privado.acciones_admin(administrador,accion,denuncia) values(auth.uid(),p_accion,p_denuncia);
 if p_accion='descartar' then update public.feed_denuncias set estado='revisada' where id=p_denuncia;
 elsif v_comentario is not null then delete from public.feed_comentarios where id=v_comentario;
 else delete from public.feed_publicaciones where id=v_post;end if;
end; $$;
revoke all on function public.admin_estado(),public.admin_dashboard(integer),public.admin_moderar(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_estado(),public.admin_dashboard(integer),public.admin_moderar(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
