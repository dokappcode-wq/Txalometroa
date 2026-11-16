// @vitest-environment jsdom
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { render,screen,cleanup,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
const m=vi.hoisted(()=>({rpc:vi.fn(),getSession:vi.fn(),onAuthStateChange:vi.fn()}));
vi.mock('../lib/supabase',()=>({supabase:{rpc:m.rpc,auth:{getSession:m.getSession,onAuthStateChange:m.onAuthStateChange}}}));
import Feed from './Feed';
import Dashboard from './Dashboard';
const id='11111111-1111-4111-8111-111111111111';
const t=(es:string)=>es;
beforeEach(()=>{localStorage.clear();vi.resetAllMocks();m.getSession.mockResolvedValue({data:{session:{user:{id}}}});m.onAuthStateChange.mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}});m.rpc.mockImplementation(async(n:string)=>({data:n==='feed_estado'?{version:1,nombre:'Ana',puede_publicar:true}:n==='feed_relaciones'?{siguiendo:[],seguidores:[],solicitudes:[],bloqueados:[]}:[],error:null}));});
afterEach(cleanup);
it('ofrece entrar sin inventar publicaciones para un visitante',async()=>{m.getSession.mockResolvedValue({data:{session:null}});render(<MemoryRouter><Feed idioma="es" t={t}/></MemoryRouter>);expect(await screen.findByRole('link',{name:'Entrar o crear cuenta'})).toBeTruthy();expect(m.rpc).not.toHaveBeenCalled();});
it('conserva el borrador y el id de envío si falla la publicación',async()=>{
 const base=m.rpc.getMockImplementation()!;m.rpc.mockImplementation(async(n:string,p:unknown)=>n==='feed_publicar'?{data:null,error:{message:'network'}}:base(n,p));
 const u=userEvent.setup();render(<MemoryRouter><Feed idioma="es" t={t}/></MemoryRouter>);const campo=await screen.findByLabelText('Tu opinión');await u.type(campo,'Una obra que emociona');await u.click(screen.getByRole('button',{name:'Publicar'}));await screen.findByRole('alert');
 expect(campo).toHaveProperty('value','Una obra que emociona');const primero=m.rpc.mock.calls.find(c=>c[0]==='feed_publicar')![1];await u.click(screen.getByRole('button',{name:'Publicar'}));await waitFor(()=>expect(m.rpc.mock.calls.filter(c=>c[0]==='feed_publicar')).toHaveLength(2));expect(m.rpc.mock.calls.filter(c=>c[0]==='feed_publicar')[1][1].p_id).toBe(primero.p_id);expect(localStorage.getItem('txalo-feed-borrador:'+id)).toContain('Una obra que emociona');
});
it('avisa si el esquema del feed aún no está instalado',async()=>{m.rpc.mockResolvedValue({data:null,error:{code:'PGRST202'}});render(<MemoryRouter><Feed idioma="es" t={t}/></MemoryRouter>);expect(await screen.findByText('Tu feed está preparado.')).toBeTruthy();expect(screen.queryByRole('button',{name:'Publicar'})).toBeNull();});
it('no consulta métricas si la cuenta no es administradora',async()=>{m.rpc.mockResolvedValue({data:false,error:null});render(<MemoryRouter><Dashboard idioma="es" t={t}/></MemoryRouter>);await screen.findByText('Acceso reservado a Hikateat');expect(m.rpc).toHaveBeenCalledTimes(1);expect(m.rpc).toHaveBeenCalledWith('admin_estado',{});});
it('el administrador ve datos reales incluso cuando no hay actividad',async()=>{
 m.rpc.mockImplementation(async(n:string)=>({data:n==='admin_estado'?true:{desde:'2026-11-01',hasta:'2026-11-16',generado:'2026-11-16T12:00:00Z',resumen:{cuentas:2,privados:2,participantes:0,publicaciones:0,comentarios:0,aplausos:0,seguimientos:0,denuncias_pendientes:0},actividad:[{dia:'2026-11-16',publicaciones:0,comentarios:0,cuentas:0}],obras:[],denuncias:[]},error:null}));render(<MemoryRouter><Dashboard idioma="es" t={t}/></MemoryRouter>);await userEvent.setup().click(await screen.findByRole('button',{name:'Visión general'}));expect(await screen.findByText('No hay denuncias pendientes.')).toBeTruthy();expect(screen.getByText('2 perfiles privados de 2 cuentas.')).toBeTruthy();expect(screen.getByText('Todavía no hay publicaciones vinculadas a obras.')).toBeTruthy();
});

it('busca nombres en el servidor y envía solicitudes sin abrir publicaciones privadas',async()=>{
 const base=m.rpc.getMockImplementation()!;m.rpc.mockImplementation(async(n:string,p:unknown)=>n==='feed_buscar_usuarios'?{data:[{id:'22222222-2222-4222-8222-222222222222',nombre:'Beñat',privado:true,estado:null}],error:null}:n==='feed_seguir'?{data:'pendiente',error:null}:base(n,p));
 const u=userEvent.setup();render(<MemoryRouter><Feed idioma="es" t={t}/></MemoryRouter>);await u.type(await screen.findByLabelText('Buscar usuarios por nombre'),'Beñ');await u.click(screen.getByRole('button',{name:'Buscar usuarios'}));await screen.findByText('Beñat');expect(m.rpc).toHaveBeenCalledWith('feed_buscar_usuarios',{p_texto:'Beñ'});await u.click(screen.getByRole('button',{name:'Seguir'}));expect(await screen.findByRole('button',{name:'Solicitado'})).toHaveProperty('disabled',true);
});
it('distingue búsqueda no instalada de ningún resultado',async()=>{
 const base=m.rpc.getMockImplementation()!;m.rpc.mockImplementation(async(n:string,p:unknown)=>n==='feed_buscar_usuarios'?{data:null,error:{code:'PGRST202'}}:base(n,p));const u=userEvent.setup();render(<MemoryRouter><Feed idioma="es" t={t}/></MemoryRouter>);await u.type(await screen.findByLabelText('Buscar usuarios por nombre'),'Ana');await u.click(screen.getByRole('button',{name:'Buscar usuarios'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('pendiente de activar'));expect(screen.queryByText('No encontramos usuarios con ese nombre.')).toBeNull();
});

it('aplaude desde el contador sin duplicar reacciones',async()=>{
 const base=m.rpc.getMockImplementation()!;const post={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',autor:id,nombre:'Ana',texto:'Gran función',obra_id:null,spoiler:false,creado:'2026-11-16T10:00:00Z',editado:null,aplausos:0,aplaudida:false,comentarios:0};m.rpc.mockImplementation(async(n:string,p:unknown)=>n==='feed_leer'?{data:[post],error:null}:n==='feed_aplaudir'?(post.aplausos=1,post.aplaudida=true,{data:null,error:null}):base(n,p));const u=userEvent.setup();render(<MemoryRouter><Feed idioma="es" t={t}/></MemoryRouter>);const boton=await screen.findByRole('button',{name:'Aplaudir · 0 aplausos'});expect(boton.textContent).toContain('👏');await u.click(boton);expect(await screen.findByRole('button',{name:'Retirar aplauso · 1 aplausos'})).toHaveProperty('ariaPressed','true');expect(m.rpc).toHaveBeenCalledWith('feed_aplaudir',{p_id:post.id,p_activo:true});
});
