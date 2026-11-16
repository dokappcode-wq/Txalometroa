import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,it,expect} from 'vitest';
let db:PGlite;
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`);
 for(const f of ['202611130001_perfiles.sql','202611130002_cuentas.sql','202611160001_feed.sql','202611160002_dashboard.sql','202611160003_busqueda_registro.sql','202611160003_busqueda_registro.sql'])await db.exec(readFileSync(new URL('./migrations/'+f,import.meta.url),'utf8'));
 await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())',[A,'a@example.test',B,'b@example.test']);await db.query("update public.perfiles set nombre=case when id=$1 then 'Ana' else 'Beñat' end,condiciones_aceptadas=now()",[A]);
},30000);
afterAll(async()=>{await db?.close();});
async function buscar(texto:string){await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[A]);try{return (await db.query<{r:{id:string;nombre:string;privado:boolean}[]}>('select public.feed_buscar_usuarios($1) r',[texto])).rows[0].r;}finally{await db.exec('reset role');}}
it('busca nombres privados con mínimos datos y evita patrones de enumeración',async()=>{
 expect(await buscar('BEÑ')).toEqual([{id:B,nombre:'Beñat',privado:true,estado:null}]);expect(await buscar('Ana')).toEqual([]);expect(await buscar('b@example.test')).toEqual([]);expect(await buscar('%_')).toEqual([]);expect(await buscar('B')).toEqual([]);
 await db.exec('set role anon');try{await expect(db.exec("select public.feed_buscar_usuarios('Be')")).rejects.toThrow(/permission denied/);}finally{await db.exec('reset role');}
});
it('respeta bloqueos en ambos sentidos y perfiles incompletos',async()=>{
 for(const [autor,bloqueado] of [[A,B],[B,A]]){await db.query('insert into public.feed_bloqueos(autor,bloqueado) values($1,$2)',[autor,bloqueado]);expect(await buscar('Be')).toEqual([]);await db.exec('delete from public.feed_bloqueos');}
 await db.query('update public.perfiles set condiciones_aceptadas=null where id=$1',[B]);expect(await buscar('Be')).toEqual([]);await db.query('update public.perfiles set condiciones_aceptadas=now() where id=$1',[B]);
});
it('no concede administración por un correo autoconfirmado y reserva la concesión al dueño del proyecto',async()=>{
 await db.query("insert into txalo_privado.invitaciones_admin(correo) values('b@example.test')");await db.query('update auth.users set email_confirmed_at=now() where id=$1',[B]);expect((await db.query('select * from txalo_privado.administradores')).rows).toHaveLength(0);
 await db.exec('set role authenticated');try{await expect(db.query('select txalo_privado.designar_hikateat($1)',[B])).rejects.toThrow(/permission denied/);}finally{await db.exec('reset role');}
 await db.query('select txalo_privado.designar_hikateat($1)',[B]);expect((await db.query('select usuario from txalo_privado.administradores')).rows).toEqual([{usuario:B}]);
});
