// @vitest-environment jsdom
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { render,screen,cleanup,act,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
const mocks=vi.hoisted(()=>({
 auth:{getSession:vi.fn(),onAuthStateChange:vi.fn(),signUp:vi.fn(),signInWithPassword:vi.fn(),resetPasswordForEmail:vi.fn(),resend:vi.fn(),signOut:vi.fn()},
 invoke:vi.fn(),single:vi.fn(),update:vi.fn(),eq:vi.fn(),exportar:vi.fn(),descargar:vi.fn(),
}));
vi.mock('../lib/supabase',()=>({supabase:{auth:mocks.auth,rpc:()=>Promise.resolve({data:false,error:null}),functions:{invoke:mocks.invoke},from:()=>({select:()=>({eq:mocks.eq}),update:mocks.update})},googleHabilitado:false}));
vi.mock('../lib/datosCuenta',()=>({exportarCuenta:mocks.exportar,descargarDatos:mocks.descargar}));
import Cuenta from './Cuenta';
const auth=mocks.auth;
const perfil={id:'usuario-a',nombre:'Ana',privado:true,idioma:'es',avatar_path:null,condiciones_version:'revision-2026-11',condiciones_aceptadas:'2026-11-01'};
const sesion={user:{id:perfil.id,email:'prueba@example.com'}};
beforeEach(()=>{
 vi.resetAllMocks();
 auth.getSession.mockResolvedValue({data:{session:null}});
 auth.onAuthStateChange.mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}});
 mocks.invoke.mockResolvedValue({data:{version:1,eliminar:true},error:null});
 mocks.single.mockResolvedValue({data:perfil,error:null});mocks.eq.mockReturnValue({single:mocks.single});
 mocks.update.mockReturnValue({eq:()=>({select:()=>({single:mocks.single})})});
 auth.signOut.mockResolvedValue({error:null});
});
afterEach(cleanup);
async function abrir(){render(<MemoryRouter><Cuenta t={es=>es}/></MemoryRouter>);await screen.findByRole('button',{name:'Entrar'});return userEvent.setup();}
async function abrirPerfil(){auth.getSession.mockResolvedValue({data:{session:sesion}});render(<MemoryRouter><Cuenta t={es=>es}/></MemoryRouter>);await screen.findByLabelText('Nombre visible');return userEvent.setup();}
it('registra con enlace de confirmación sin afirmar que el correo está verificado',async()=>{
 auth.signUp.mockResolvedValue({error:null});const u=await abrir();await u.click(screen.getByText('¿Es tu primera vez? Crea una cuenta'));
 await u.type(screen.getByLabelText('Correo electrónico'),'prueba@example.com');await u.type(screen.getByLabelText(/^Contraseña/),'Clave-prueba-123');await u.click(screen.getByRole('button',{name:'Crear cuenta'}));
 expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({email:'prueba@example.com',options:{emailRedirectTo:location.origin+'/perfil'}}));
 expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('Revisa tu correo'));
});
it('recupera acceso sin revelar si una cuenta existe',async()=>{
 auth.resetPasswordForEmail.mockResolvedValue({error:null});const u=await abrir();await u.click(screen.getByText('He olvidado mi contraseña'));
 await u.type(screen.getByLabelText('Correo electrónico'),'prueba@example.com');await u.click(screen.getByRole('button',{name:'Enviar enlace'}));
 expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('prueba@example.com',{redirectTo:location.origin+'/perfil?recuperar=1'});
 expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('Si existe una cuenta'));
});
it('muestra errores de acceso sin exponer detalles del servidor',async()=>{
 auth.signInWithPassword.mockResolvedValue({error:{code:'invalid_credentials',message:'internal diagnostic'}});const u=await abrir();
 await u.type(screen.getByLabelText('Correo electrónico'),'prueba@example.com');await u.type(screen.getByLabelText(/^Contraseña/),'incorrecta');await u.click(screen.getByRole('button',{name:'Entrar'}));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','El correo o la contraseña no son correctos.');expect(screen.queryByText('internal diagnostic')).toBeNull();
});
it('reenvía confirmación sin enumerar cuentas y evita repetir el envío inmediatamente',async()=>{
 auth.resend.mockResolvedValue({error:null});const u=await abrir();await u.click(screen.getByText('No he recibido la confirmación'));
 await u.type(screen.getByLabelText('Correo electrónico'),'prueba@example.com');await u.click(screen.getByRole('button',{name:'Reenviar enlace'}));
 expect(auth.resend).toHaveBeenCalledWith({type:'signup',email:'prueba@example.com',options:{emailRedirectTo:location.origin+'/perfil'}});
 expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('Si esa cuenta necesita confirmación'));
 expect(screen.getByRole('button',{name:/Podrás reenviar en/})).toHaveProperty('disabled',true);
});
it('un fallo de exportación no dispara una descarga ni declara éxito',async()=>{
 mocks.exportar.mockRejectedValue(new Error('network'));const u=await abrirPerfil();await u.click(screen.getByRole('button',{name:'Descargar mis datos'}));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('No hay conexión'));
 expect(mocks.descargar).not.toHaveBeenCalled();
});
it('una respuesta de exportación completa inicia la descarga',async()=>{
 const datos={formato:'txalometroa-cuenta',perfil};mocks.exportar.mockResolvedValue(datos);const u=await abrirPerfil();await u.click(screen.getByRole('button',{name:'Descargar mis datos'}));
 expect(mocks.descargar).toHaveBeenCalledWith(datos);
 expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('Descarga preparada'));
});
it('no presenta un borrado operativo si el servidor no está desplegado',async()=>{
 mocks.invoke.mockResolvedValue({error:new Error('no desplegado')});await abrirPerfil();
 expect(await screen.findByText('El borrado de cuenta está pendiente de activar durante esta revisión.')).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Borrar mi cuenta'})).toBeNull();
 expect(screen.getByRole('button',{name:'Descargar mis datos'})).toHaveProperty('disabled',false);
});
it('pide confirmación y contraseña y mantiene la cuenta si el servidor rechaza el borrado',async()=>{
 const u=await abrirPerfil();await u.click(await screen.findByRole('button',{name:'Borrar mi cuenta'}));
 expect(screen.getByRole('button',{name:'Borrar definitivamente'})).toHaveProperty('disabled',true);
 await u.type(screen.getByLabelText('Confirmación'),'BORRAR');await u.type(screen.getByLabelText('Contraseña actual'),'equivocada');
 mocks.invoke.mockResolvedValueOnce({error:{context:{json:async()=>({codigo:'clave_incorrecta'})}}});
 await u.click(screen.getByRole('button',{name:'Borrar definitivamente'}));
 expect(mocks.invoke).toHaveBeenLastCalledWith('cuenta',{body:{accion:'eliminar',confirmar:true,clave_actual:'equivocada'}});
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('No se ha borrado la cuenta'));
 expect(auth.signOut).not.toHaveBeenCalled();expect(screen.getByLabelText('Contraseña actual')).toHaveProperty('value','');
});
it('borra el estado local solo tras confirmación del servidor',async()=>{
 const u=await abrirPerfil();await u.click(await screen.findByRole('button',{name:'Borrar mi cuenta'}));
 await u.type(screen.getByLabelText('Confirmación'),'BORRAR');await u.type(screen.getByLabelText('Contraseña actual'),'correcta');
 mocks.invoke.mockResolvedValueOnce({data:{eliminada:true},error:null});await u.click(screen.getByRole('button',{name:'Borrar definitivamente'}));
 expect(await screen.findByRole('status')).toHaveProperty('textContent','Tu cuenta, tu perfil y tus fotos se han borrado.');
 expect(auth.signOut).toHaveBeenCalledWith({scope:'local'});expect(screen.queryByDisplayValue('Ana')).toBeNull();
});
it('no guarda nombres compuestos solo de espacios',async()=>{
 const u=await abrirPerfil();await u.clear(screen.getByLabelText('Nombre visible'));await u.type(screen.getByLabelText('Nombre visible'),'   ');await u.click(screen.getByRole('button',{name:'Guardar perfil'}));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','Escribe un nombre que no esté vacío.');expect(mocks.update).not.toHaveBeenCalled();
});
it('descarta una exportación pendiente cuando cambia de cuenta en otra pestaña',async()=>{
 let resolver:(v:unknown)=>void=()=>{};mocks.exportar.mockImplementation(()=>new Promise(r=>{resolver=r;}));
 const u=await abrirPerfil();await u.click(screen.getByRole('button',{name:'Descargar mis datos'}));
 const listener=auth.onAuthStateChange.mock.calls[0][0];
 mocks.single.mockResolvedValue({data:{...perfil,id:'usuario-b',nombre:'Beñat'},error:null});
 await act(async()=>listener('SIGNED_IN',{user:{id:'usuario-b',email:'b@example.com'}}));
 await screen.findByDisplayValue('Beñat');
 await act(async()=>resolver({perfil}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Descargar mis datos'})).toHaveProperty('disabled',false));
 expect(mocks.descargar).not.toHaveBeenCalled();expect(screen.queryByDisplayValue('Ana')).toBeNull();
});
it('explica cuando el servicio rechaza el destinatario sin afirmar que se envió un correo',async()=>{
 auth.resend.mockResolvedValue({error:{code:'email_address_not_authorized',message:'Email not authorized'}});const u=await abrir();await u.click(screen.getByText('No he recibido la confirmación'));await u.type(screen.getByLabelText('Correo electrónico'),'prueba@example.com');await u.click(screen.getByRole('button',{name:'Reenviar enlace'}));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('La administración debe configurar el envío de correos'));
 expect(screen.queryByRole('status')).toBeNull();
});
it('explica el límite de correos sin prometer un envío ni un plazo incorrecto',async()=>{
 auth.resend.mockResolvedValue({error:{code:'over_email_send_rate_limit'}});const u=await abrir();await u.click(screen.getByText('No he recibido la confirmación'));await u.type(screen.getByLabelText('Correo electrónico'),'prueba@example.com');await u.click(screen.getByRole('button',{name:'Reenviar enlace'}));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('Se ha alcanzado el límite de correos'));
 expect(screen.queryByRole('status')).toBeNull();
});

it('entra directamente tras registrarse cuando Supabase devuelve sesión sin confirmación',async()=>{
 auth.signUp.mockResolvedValue({data:{session:sesion},error:null});const u=await abrir();await u.click(screen.getByText('¿Es tu primera vez? Crea una cuenta'));await u.type(screen.getByLabelText('Correo electrónico'),'prueba@example.com');await u.type(screen.getByLabelText(/^Contraseña/),'Clave-prueba-123');await u.click(screen.getByRole('button',{name:'Crear cuenta'}));expect(await screen.findByLabelText('Nombre visible')).toHaveProperty('value','Ana');expect(screen.queryByText(/Revisa tu correo/)).toBeNull();
});
