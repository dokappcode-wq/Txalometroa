-- Feed privado. Aplicar después de las dos migraciones de perfiles.
-- Se puede volver a ejecutar: no elimina perfiles ni publicaciones.
begin;
create schema if not exists txalo_privado;
revoke all on schema txalo_privado from public, anon;
grant usage on schema txalo_privado to authenticated;

create table if not exists public.feed_seguimientos (
 seguidor uuid references public.perfiles on delete cascade,
 seguido uuid references public.perfiles on delete cascade,
 estado text not null default 'pendiente' check (estado in ('pendiente','aceptado')),
 creado timestamptz not null default now(),
 primary key(seguidor,seguido), check(seguidor<>seguido)
);
create table if not exists public.feed_bloqueos (
 autor uuid references public.perfiles on delete cascade,
 bloqueado uuid references public.perfiles on delete cascade,
 creado timestamptz not null default now(), primary key(autor,bloqueado), check(autor<>bloqueado)
);
create table if not exists public.feed_publicaciones (
 id uuid primary key default gen_random_uuid(), autor uuid not null references public.perfiles on delete cascade,
 texto text not null check(length(btrim(texto)) between 1 and 2000),
 obra_id text check(obra_id is null or obra_id in ('makilhotsak','zorretan','atearen-bestaldean','bidaia','toto','tarara','seda','gazte','tonbola','zaparrada','txarriboda','sagartu','koadernoa-zuri')),
 spoiler boolean not null default false, creado timestamptz not null default now(), editado timestamptz
);
create table if not exists public.feed_aplausos (
 publicacion uuid references public.feed_publicaciones on delete cascade,
 autor uuid references public.perfiles on delete cascade, creado timestamptz not null default now(), primary key(publicacion,autor)
);
create table if not exists public.feed_comentarios (
 id uuid primary key default gen_random_uuid(), publicacion uuid not null references public.feed_publicaciones on delete cascade,
 autor uuid not null references public.perfiles on delete cascade,
 texto text not null check(length(btrim(texto)) between 1 and 600), creado timestamptz not null default now()
);
create table if not exists public.feed_denuncias (
 id uuid primary key default gen_random_uuid(), denunciante uuid not null references public.perfiles on delete cascade,
 publicacion uuid not null references public.feed_publicaciones on delete cascade,
 comentario uuid references public.feed_comentarios on delete cascade,
 motivo text not null check(motivo in ('ofensivo','spam','privacidad','otro')),
 contenido text not null, creado timestamptz not null default now(),
 estado text not null default 'pendiente' check(estado in ('pendiente','revisada'))
);
create unique index if not exists denuncia_publicacion_unica on public.feed_denuncias(denunciante,publicacion) where comentario is null;
create unique index if not exists denuncia_comentario_unica on public.feed_denuncias(denunciante,comentario) where comentario is not null;
create index if not exists feed_orden on public.feed_publicaciones(creado desc,id desc);
create index if not exists feed_autor on public.feed_publicaciones(autor,creado desc);
create index if not exists feed_solicitudes on public.feed_seguimientos(seguido,estado);
create index if not exists feed_comentarios_orden on public.feed_comentarios(publicacion,creado,id);

create or replace function txalo_privado.bloqueado(p_otro uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.feed_bloqueos where (autor=auth.uid() and bloqueado=p_otro) or (autor=p_otro and bloqueado=auth.uid()));
$$;
create or replace function txalo_privado.visible_autor(p_autor uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (p_autor=auth.uid() or (
 not txalo_privado.bloqueado(p_autor) and exists(select 1 from public.feed_seguimientos where seguidor=auth.uid() and seguido=p_autor and estado='aceptado')));
$$;
create or replace function txalo_privado.visible_post(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.feed_publicaciones where id=p_id and txalo_privado.visible_autor(autor));
$$;
create or replace function txalo_privado.autor_activo() returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=auth.uid();
begin
 if v_id is null then raise exception 'SESION_REQUERIDA'; end if;
 perform 1 from public.perfiles where id=v_id and condiciones_aceptadas is not null and length(btrim(nombre))>0 for no key update;
 if not found then raise exception 'PERFIL_INCOMPLETO'; end if;
 return v_id;
end; $$;
revoke all on all functions in schema txalo_privado from public,anon,authenticated;
grant execute on function txalo_privado.bloqueado(uuid),txalo_privado.visible_autor(uuid),txalo_privado.visible_post(uuid) to authenticated;

alter table public.feed_seguimientos enable row level security;
alter table public.feed_bloqueos enable row level security;
alter table public.feed_publicaciones enable row level security;
alter table public.feed_aplausos enable row level security;
alter table public.feed_comentarios enable row level security;
alter table public.feed_denuncias enable row level security;
revoke all on public.feed_seguimientos,public.feed_bloqueos,public.feed_publicaciones,public.feed_aplausos,public.feed_comentarios,public.feed_denuncias from public,anon,authenticated;
grant select on public.feed_seguimientos,public.feed_bloqueos,public.feed_publicaciones,public.feed_aplausos,public.feed_comentarios,public.feed_denuncias to authenticated;
drop policy if exists relaciones_propias on public.feed_seguimientos;
create policy relaciones_propias on public.feed_seguimientos for select to authenticated using(seguidor=auth.uid() or seguido=auth.uid());
drop policy if exists bloqueos_propios on public.feed_bloqueos;
create policy bloqueos_propios on public.feed_bloqueos for select to authenticated using(autor=auth.uid());
drop policy if exists publicaciones_visibles on public.feed_publicaciones;
create policy publicaciones_visibles on public.feed_publicaciones for select to authenticated using(txalo_privado.visible_autor(autor));
drop policy if exists aplausos_visibles on public.feed_aplausos;
create policy aplausos_visibles on public.feed_aplausos for select to authenticated using(autor=auth.uid() or (txalo_privado.visible_post(publicacion) and not txalo_privado.bloqueado(autor)));
drop policy if exists comentarios_visibles on public.feed_comentarios;
create policy comentarios_visibles on public.feed_comentarios for select to authenticated using(autor=auth.uid() or (txalo_privado.visible_post(publicacion) and not txalo_privado.bloqueado(autor)));
drop policy if exists denuncias_propias on public.feed_denuncias;
create policy denuncias_propias on public.feed_denuncias for select to authenticated using(denunciante=auth.uid());

create or replace function public.feed_estado() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',1,'nombre',p.nombre,'puede_publicar',p.condiciones_aceptadas is not null and length(btrim(p.nombre))>0) from public.perfiles p where p.id=auth.uid();
$$;
create or replace function public.feed_persona(p_codigo uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'nombre',p.nombre,'privado',p.privado,
 'estado',(select s.estado from public.feed_seguimientos s where s.seguidor=auth.uid() and s.seguido=p.id))
 from public.perfiles p where auth.uid() is not null and p.id=p_codigo and p.id<>auth.uid()
 and p.condiciones_aceptadas is not null and length(btrim(p.nombre))>0 and not txalo_privado.bloqueado(p.id);
$$;
create or replace function public.feed_relaciones() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'siguiendo',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'nombre',p.nombre,'estado',s.estado) order by s.creado desc) from public.feed_seguimientos s join public.perfiles p on p.id=s.seguido where s.seguidor=auth.uid() and not txalo_privado.bloqueado(p.id)),'[]'::jsonb),
 'solicitudes',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'nombre',p.nombre,'estado',s.estado) order by s.creado desc) from public.feed_seguimientos s join public.perfiles p on p.id=s.seguidor where s.seguido=auth.uid() and s.estado='pendiente' and not txalo_privado.bloqueado(p.id)),'[]'::jsonb),
 'seguidores',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'nombre',p.nombre,'estado',s.estado)) from public.feed_seguimientos s join public.perfiles p on p.id=s.seguidor where s.seguido=auth.uid() and s.estado='aceptado' and not txalo_privado.bloqueado(p.id)),'[]'::jsonb),
 'bloqueados',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'nombre',p.nombre)) from public.feed_bloqueos b join public.perfiles p on p.id=b.bloqueado where b.autor=auth.uid()),'[]'::jsonb));
$$;
create or replace function public.feed_seguir(p_persona uuid) returns text
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=txalo_privado.autor_activo(); v_estado text; v_privado boolean;
begin
 if p_persona=v_id or txalo_privado.bloqueado(p_persona) then raise exception 'PERSONA_NO_DISPONIBLE'; end if;
 -- Mismo orden que bloquear para impedir crear una relación a la vez que un bloqueo.
 perform pg_advisory_xact_lock(hashtextextended(least(v_id::text,p_persona::text)||greatest(v_id::text,p_persona::text),0));
 if txalo_privado.bloqueado(p_persona) then raise exception 'PERSONA_NO_DISPONIBLE'; end if;
 select estado into v_estado from public.feed_seguimientos where seguidor=v_id and seguido=p_persona;
 if found then return v_estado; end if;
 select privado into v_privado from public.perfiles where id=p_persona and condiciones_aceptadas is not null and length(btrim(nombre))>0;
 if not found then raise exception 'PERSONA_NO_DISPONIBLE'; end if;
 if (select count(*) from public.feed_seguimientos where seguidor=v_id and creado>now()-interval '1 hour')>=20 then raise exception 'DEMASIADOS_INTENTOS'; end if;
 v_estado:=case when v_privado then 'pendiente' else 'aceptado' end;
 insert into public.feed_seguimientos(seguidor,seguido,estado) values(v_id,p_persona,v_estado);
 return v_estado;
end; $$;
create or replace function public.feed_relacion(p_persona uuid,p_accion text) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=txalo_privado.autor_activo();
begin
 if p_persona=v_id then raise exception 'ACCION_NO_VALIDA'; end if;
 perform pg_advisory_xact_lock(hashtextextended(least(v_id::text,p_persona::text)||greatest(v_id::text,p_persona::text),0));
 if p_accion='aceptar' then
  if txalo_privado.bloqueado(p_persona) then raise exception 'PERSONA_NO_DISPONIBLE'; end if;
  update public.feed_seguimientos set estado='aceptado' where seguido=v_id and seguidor=p_persona;
 elsif p_accion='rechazar' or p_accion='quitar_seguidor' then delete from public.feed_seguimientos where seguido=v_id and seguidor=p_persona;
 elsif p_accion='dejar' then delete from public.feed_seguimientos where seguidor=v_id and seguido=p_persona;
 elsif p_accion='bloquear' then
  insert into public.feed_bloqueos(autor,bloqueado) values(v_id,p_persona) on conflict do nothing;
  delete from public.feed_seguimientos where (seguidor=v_id and seguido=p_persona) or (seguidor=p_persona and seguido=v_id);
 elsif p_accion='desbloquear' then delete from public.feed_bloqueos where autor=v_id and bloqueado=p_persona;
 else raise exception 'ACCION_NO_VALIDA'; end if;
end; $$;

create or replace function public.feed_leer(p_filtro text default 'todos',p_obra text default null,p_fecha timestamptz default null,p_id uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',p.id,'autor',p.autor,'nombre',p.nombre,'texto',p.texto,'obra_id',p.obra_id,'spoiler',p.spoiler,'creado',p.creado,'editado',p.editado,
 'aplausos',(select count(*) from public.feed_aplausos a where a.publicacion=p.id and not txalo_privado.bloqueado(a.autor)),
 'aplaudida',exists(select 1 from public.feed_aplausos a where a.publicacion=p.id and a.autor=auth.uid()),
 'comentarios',(select count(*) from public.feed_comentarios c where c.publicacion=p.id and not txalo_privado.bloqueado(c.autor))) order by p.creado desc,p.id desc),'[]'::jsonb)
 from (select f.*,u.nombre from public.feed_publicaciones f join public.perfiles u on u.id=f.autor
 where txalo_privado.visible_autor(f.autor) and (p_obra is null or f.obra_id=p_obra)
 and (p_filtro='todos' or (p_filtro='amigos' and f.autor<>auth.uid()) or (p_filtro='mias' and f.autor=auth.uid()))
 and (p_fecha is null or (f.creado,f.id)<(p_fecha,p_id)) order by f.creado desc,f.id desc limit 21) p;
$$;
create or replace function public.feed_publicar(p_id uuid,p_texto text,p_obra text default null,p_spoiler boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=txalo_privado.autor_activo(); v_autor uuid;
begin
 select autor into v_autor from public.feed_publicaciones where id=p_id;
 if found then
  if v_autor<>v_id then raise exception 'NO_PERMITIDO'; end if;
  if exists(select 1 from public.feed_publicaciones where id=p_id and (texto,obra_id,spoiler) is distinct from (btrim(p_texto),p_obra,p_spoiler)) then raise exception 'ENVIO_YA_EXISTE'; end if;
  return p_id; -- Reintentar un envío no publica otra vez ni altera el original.
 end if;
 if (select count(*) from public.feed_publicaciones where autor=v_id and creado>now()-interval '1 minute')>=6 then raise exception 'DEMASIADOS_INTENTOS'; end if;
 insert into public.feed_publicaciones(id,autor,texto,obra_id,spoiler) values(p_id,v_id,btrim(p_texto),p_obra,p_spoiler);
 return p_id;
end; $$;
create or replace function public.feed_editar(p_id uuid,p_texto text,p_obra text,p_spoiler boolean) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=txalo_privado.autor_activo();
begin
 update public.feed_publicaciones set texto=btrim(p_texto),obra_id=p_obra,spoiler=p_spoiler,editado=now() where id=p_id and autor=v_id;
 if not found then raise exception 'NO_PERMITIDO'; end if;
end; $$;
create or replace function public.feed_borrar(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=txalo_privado.autor_activo();
begin
 delete from public.feed_publicaciones where id=p_id and autor=v_id;
end; $$;
create or replace function public.feed_aplaudir(p_id uuid,p_activo boolean) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=txalo_privado.autor_activo();
begin
 if not txalo_privado.visible_post(p_id) then raise exception 'NO_PERMITIDO'; end if;
 if p_activo then insert into public.feed_aplausos(publicacion,autor) values(p_id,v_id) on conflict do nothing;
 else delete from public.feed_aplausos where publicacion=p_id and autor=v_id; end if;
end; $$;
create or replace function public.feed_comentarios_leer(p_id uuid,p_fecha timestamptz default null,p_cursor uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'autor',c.autor,'nombre',c.nombre,'texto',c.texto,'creado',c.creado) order by c.creado,c.id),'[]'::jsonb)
 from(select c.*,p.nombre from public.feed_comentarios c join public.perfiles p on p.id=c.autor where c.publicacion=p_id and txalo_privado.visible_post(p_id) and not txalo_privado.bloqueado(c.autor)
 and (p_fecha is null or (c.creado,c.id)>(p_fecha,p_cursor)) order by c.creado,c.id limit 21)c;
$$;
create or replace function public.feed_comentar(p_id uuid,p_publicacion uuid,p_texto text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=txalo_privado.autor_activo(); v_autor uuid;
begin
 if not txalo_privado.visible_post(p_publicacion) then raise exception 'NO_PERMITIDO'; end if;
 select autor into v_autor from public.feed_comentarios where id=p_id;
 if found then
  if v_autor<>v_id then raise exception 'NO_PERMITIDO'; end if;
  if exists(select 1 from public.feed_comentarios where id=p_id and (texto,publicacion) is distinct from (btrim(p_texto),p_publicacion)) then raise exception 'ENVIO_YA_EXISTE'; end if;
  return p_id;
 end if;
 if (select count(*) from public.feed_comentarios where autor=v_id and creado>now()-interval '1 minute')>=20 then raise exception 'DEMASIADOS_INTENTOS'; end if;
 insert into public.feed_comentarios(id,publicacion,autor,texto) values(p_id,p_publicacion,v_id,btrim(p_texto));return p_id;
end; $$;
create or replace function public.feed_comentario_borrar(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=txalo_privado.autor_activo();
begin
 delete from public.feed_comentarios c where c.id=p_id and (c.autor=v_id or exists(select 1 from public.feed_publicaciones p where p.id=c.publicacion and p.autor=v_id));
end; $$;
create or replace function public.feed_denunciar(p_publicacion uuid,p_motivo text,p_comentario uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=txalo_privado.autor_activo(); v_texto text;
begin
 if not txalo_privado.visible_post(p_publicacion) then raise exception 'NO_PERMITIDO'; end if;
 if p_comentario is null then select texto into v_texto from public.feed_publicaciones where id=p_publicacion;
 else select texto into v_texto from public.feed_comentarios where id=p_comentario and publicacion=p_publicacion and not txalo_privado.bloqueado(autor);end if;
 if v_texto is null then raise exception 'NO_PERMITIDO'; end if;
 insert into public.feed_denuncias(denunciante,publicacion,comentario,motivo,contenido) values(v_id,p_publicacion,p_comentario,p_motivo,v_texto) on conflict do nothing;
end; $$;
create or replace function public.feed_exportar() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('publicaciones',coalesce((select jsonb_agg(p) from public.feed_publicaciones p where p.autor=auth.uid()),'[]'::jsonb),
 'comentarios',coalesce((select jsonb_agg(c) from public.feed_comentarios c where c.autor=auth.uid()),'[]'::jsonb),
 'aplausos',coalesce((select jsonb_agg(a) from public.feed_aplausos a where a.autor=auth.uid()),'[]'::jsonb),
 'siguiendo',coalesce((select jsonb_agg(s) from public.feed_seguimientos s where s.seguidor=auth.uid()),'[]'::jsonb),
 'seguidores',coalesce((select jsonb_agg(s) from public.feed_seguimientos s where s.seguido=auth.uid()),'[]'::jsonb),
 'bloqueos',coalesce((select jsonb_agg(b) from public.feed_bloqueos b where b.autor=auth.uid()),'[]'::jsonb),
 'denuncias',coalesce((select jsonb_agg(d) from public.feed_denuncias d where d.denunciante=auth.uid()),'[]'::jsonb));
$$;
-- Cerrar permisos por defecto en cada RPC; no modifica otras funciones del proyecto.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as firma from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'feed\_%' escape '\' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.firma);
  execute format('grant execute on function %s to authenticated',f.firma);
 end loop;
end; $$;
notify pgrst,'reload schema';
commit;

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
