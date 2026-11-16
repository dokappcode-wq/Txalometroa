import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll,afterAll,beforeEach,it,expect } from 'vitest';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const POST='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',COMMENT='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
let db:PGlite;
const migration=(file:string)=>readFileSync(new URL('./migrations/'+file,import.meta.url),'utf8');
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`);
 await db.exec(migration('202611130001_perfiles.sql'));await db.exec(migration('202611130002_cuentas.sql'));
 await db.exec(migration('202611160001_feed.sql'));await db.exec(migration('202611160002_dashboard.sql'));
 await db.exec(migration('202611160001_feed.sql'));await db.exec(migration('202611160002_dashboard.sql'));
},30000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
 await db.exec('delete from auth.users;delete from txalo_privado.invitaciones_admin;delete from txalo_privado.acciones_admin;');
 await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now()),($5,$6,now())',[A,'a@example.test',B,'b@example.test',C,'c@example.test']);
 await db.exec("update public.perfiles set nombre=case when id='"+A+"' then 'Ana' when id='"+B+"' then 'Beñat' else 'Cris' end,condiciones_version='revision-2026-11',condiciones_aceptadas=now();");
});
async function user<T=Record<string,unknown>>(id:string,sql:string,args:unknown[]=[]){
 await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
 try{return await db.query<T>(sql,args);}finally{await db.exec('reset role');}
}
async function rpc<T=unknown>(id:string,name:string,args:unknown[]=[]){const r=await user<{v:T}>(id,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as v`,args);return r.rows[0]?.v;}
const post=()=>rpc(A,'feed_publicar',[POST,'Mi opinión','bidaia',false]);
async function aceptar(){await rpc(B,'feed_seguir',[A]);await rpc(A,'feed_relacion',[B,'aceptar']);}
it('deniega acceso anónimo a tablas y RPC',async()=>{
 await db.exec('set role anon');try{await expect(db.exec('select public.feed_estado()')).rejects.toThrow(/permission denied/);await expect(db.exec('select * from public.feed_publicaciones')).rejects.toThrow(/permission denied/);}finally{await db.exec('reset role');}
});
it('requiere aceptación del dueño del perfil y protege también lecturas directas',async()=>{
 await post();expect(await rpc(B,'feed_leer')).toEqual([]);
 expect(await rpc(B,'feed_seguir',[A])).toBe('pendiente');await rpc(B,'feed_relacion',[A,'aceptar']);
 expect(await rpc(B,'feed_leer')).toEqual([]);expect((await user(B,'select * from public.feed_publicaciones')).rows).toEqual([]);
 await rpc(A,'feed_relacion',[B,'aceptar']);expect(await rpc<unknown[]>(B,'feed_leer')).toHaveLength(1);
 expect((await user(B,'select * from public.perfiles')).rows).toHaveLength(1);
});
it('no permite forjar publicaciones, relaciones ni permisos administrativos',async()=>{
 await expect(user(B,'insert into public.feed_publicaciones(autor,texto) values($1,$2)',[A,'falso'])).rejects.toThrow(/permission denied/);
 await expect(user(B,"update public.feed_seguimientos set estado='aceptado'")).rejects.toThrow(/permission denied/);
 await expect(user(B,'insert into txalo_privado.administradores(usuario) values($1)',[B])).rejects.toThrow(/permission denied/);
 await expect(user(B,"select txalo_privado.invitar_hikateat('b@example.test')")).rejects.toThrow(/permission denied/);
});
it('el bloqueo corta acceso y relaciones en ambos sentidos; desbloquear no las restaura',async()=>{
 await post();await aceptar();await rpc(B,'feed_comentar',[COMMENT,POST,'Un comentario']);
 await rpc(A,'feed_relacion',[B,'bloquear']);expect(await rpc(B,'feed_leer')).toEqual([]);
 expect(await rpc(B,'feed_comentarios_leer',[POST])).toEqual([]);expect(await rpc(B,'feed_persona',[A])).toBeNull();
 await expect(rpc(B,'feed_seguir',[A])).rejects.toThrow('PERSONA_NO_DISPONIBLE');
 await rpc(A,'feed_relacion',[B,'desbloquear']);expect(await rpc(B,'feed_leer')).toEqual([]);
});
it('seguir a un perfil abierto concede el acceso sin solicitud pendiente',async()=>{
 await db.query('update public.perfiles set privado=false where id=$1',[A]);await post();
 expect(await rpc(B,'feed_seguir',[A])).toBe('aceptado');expect(await rpc<unknown[]>(B,'feed_leer')).toHaveLength(1);
});
it('reintentos de publicación y aplausos no duplican datos',async()=>{
 await post();await post();await rpc(A,'feed_aplaudir',[POST,true]);await rpc(A,'feed_aplaudir',[POST,true]);
 const datos=await rpc<{aplausos:number}[]>(A,'feed_leer');expect(datos).toHaveLength(1);expect(datos[0].aplausos).toBe(1);
 await expect(rpc(A,'feed_publicar',[POST,'Texto diferente','bidaia',false])).rejects.toThrow('ENVIO_YA_EXISTE');
 await expect(rpc(B,'feed_publicar',[POST,'Texto falso','bidaia',false])).rejects.toThrow('NO_PERMITIDO');
});
it('solo el autor edita y elimina su publicación',async()=>{
 await post();await aceptar();await expect(rpc(B,'feed_editar',[POST,'Robado',null,false])).rejects.toThrow('NO_PERMITIDO');
 await rpc(B,'feed_borrar',[POST]);expect(await rpc<unknown[]>(A,'feed_leer')).toHaveLength(1);
 await rpc(A,'feed_editar',[POST,'Actualizado',null,true]);const p=await rpc<{texto:string;spoiler:boolean}[]>(A,'feed_leer');expect(p[0].texto).toBe('Actualizado');expect(p[0].spoiler).toBe(true);
 await rpc(A,'feed_borrar',[POST]);expect(await rpc(A,'feed_leer')).toEqual([]);
});
it('rechaza textos vacíos, obras falsas y publicaciones sin perfil completo',async()=>{
 await expect(rpc(A,'feed_publicar',[POST,'   ',null,false])).rejects.toThrow();
 await expect(rpc(A,'feed_publicar',[POST,'Opinión','obra-inventada',false])).rejects.toThrow();
 await db.query('update public.perfiles set condiciones_aceptadas=null where id=$1',[A]);await expect(post()).rejects.toThrow('PERFIL_INCOMPLETO');
});
it('pagina sin repetir ni perder publicaciones con la misma fecha',async()=>{
 await db.query("insert into public.feed_publicaciones(autor,texto,creado) select $1,'Texto '||n,'2026-11-01'::timestamptz from generate_series(1,25)n",[A]);
 const primera=await rpc<{id:string;creado:string}[]>(A,'feed_leer');expect(primera).toHaveLength(21);
 const cursor=primera[19];const segunda=await rpc<{id:string}[]>(A,'feed_leer',['todos',null,cursor.creado,cursor.id]);
 expect(new Set([...primera.slice(0,20),...segunda].map(p=>p.id)).size).toBe(25);expect(segunda).toHaveLength(5);
});
it('comentarios, denuncias y exportaciones respetan la audiencia y la identidad',async()=>{
 await post();await aceptar();await rpc(B,'feed_comentar',[COMMENT,POST,'Mi comentario']);await rpc(B,'feed_comentar',[COMMENT,POST,'Mi comentario']);
 expect(await rpc<unknown[]>(B,'feed_comentarios_leer',[POST])).toHaveLength(1);
 await expect(rpc(C,'feed_comentar',[crypto.randomUUID(),POST,'Ajeno'])).rejects.toThrow('NO_PERMITIDO');
 await rpc(B,'feed_denunciar',[POST,'ofensivo',null]);await rpc(B,'feed_denunciar',[POST,'ofensivo',null]);
 expect((await user(B,'select * from public.feed_denuncias')).rows).toHaveLength(1);expect((await user(A,'select * from public.feed_denuncias')).rows).toHaveLength(0);
 const datos=await rpc<{publicaciones:unknown[];comentarios:unknown[]}>(B,'feed_exportar');expect(datos.publicaciones).toEqual([]);expect(datos.comentarios).toHaveLength(1);
});
it('el dashboard exige un rol del servidor y reserva Hikateat hasta verificar el correo',async()=>{
 await expect(rpc(B,'admin_dashboard',[30])).rejects.toThrow('NO_PERMITIDO');expect(await rpc(B,'admin_estado')).toBe(false);
 await db.query('update auth.users set email_confirmed_at=null where id=$1',[B]);
 await db.query("select txalo_privado.invitar_hikateat('b@example.test')");expect(await rpc(B,'admin_estado')).toBe(false);
 await db.query('update auth.users set email_confirmed_at=now() where id=$1',[B]);expect(await rpc(B,'admin_estado')).toBe(true);
 expect((await user<{nombre:string}>(B,'select nombre from public.perfiles')).rows[0].nombre).toBe('Hikateat');
 expect(await rpc(A,'admin_estado')).toBe(false);
});
it('renombrarse Hikateat no concede permisos y una invitación consumida no se reutiliza',async()=>{
 await db.query("update public.perfiles set nombre='Hikateat' where id=$1",[C]);expect(await rpc(C,'admin_estado')).toBe(false);
 await db.query("select txalo_privado.invitar_hikateat('b@example.test')");await db.query('delete from auth.users where id=$1',[B]);
 await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[B,'b@example.test']);expect(await rpc(B,'admin_estado')).toBe(false);
});
it('los gráficos incluyen días vacíos, agregados reales y moderación autorizada',async()=>{
 await post();await aceptar();await rpc(B,'feed_denunciar',[POST,'spam',null]);await db.query("select txalo_privado.invitar_hikateat('c@example.test')");
 const panel=await rpc<{actividad:unknown[];resumen:{cuentas:number;publicaciones:number};denuncias:{id:string}[]}>(C,'admin_dashboard',[7]);
 expect(panel.actividad).toHaveLength(7);expect(panel.resumen.cuentas).toBe(3);expect(panel.resumen.publicaciones).toBe(1);expect(panel.denuncias).toHaveLength(1);
 await expect(rpc(B,'admin_moderar',[panel.denuncias[0].id,'retirar'])).rejects.toThrow('NO_PERMITIDO');
 await rpc(C,'admin_moderar',[panel.denuncias[0].id,'retirar']);expect(await rpc(A,'feed_leer')).toEqual([]);
 expect((await db.query('select * from txalo_privado.acciones_admin')).rows).toHaveLength(1);
});
it('el borrado de cuenta elimina también el contenido social y los privilegios',async()=>{
 await post();await aceptar();await rpc(B,'feed_comentar',[COMMENT,POST,'Mi comentario']);await db.query("select txalo_privado.invitar_hikateat('a@example.test')");
 await db.query('delete from auth.users where id=$1',[A]);
 expect((await db.query('select * from public.feed_publicaciones')).rows).toHaveLength(0);expect((await db.query('select * from public.feed_comentarios')).rows).toHaveLength(0);
 expect(await rpc(A,'admin_estado')).toBe(false);expect(await rpc(B,'feed_leer')).toEqual([]);
});
