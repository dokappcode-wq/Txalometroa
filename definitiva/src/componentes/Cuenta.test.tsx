// @vitest-environment jsdom
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
const auth=vi.hoisted(()=>({getSession:vi.fn(),onAuthStateChange:vi.fn(),signUp:vi.fn(),signInWithPassword:vi.fn(),resetPasswordForEmail:vi.fn()}));
vi.mock('../lib/supabase',()=>({supabase:{auth},googleHabilitado:false,gestionDatosHabilitada:false}));
import Cuenta from './Cuenta';
beforeEach(()=>{vi.clearAllMocks();auth.getSession.mockResolvedValue({data:{session:null}});auth.onAuthStateChange.mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}});});
afterEach(cleanup);
async function abrir(){render(<MemoryRouter><Cuenta t={es=>es}/></MemoryRouter>);await screen.findByRole('button',{name:'Entrar'});return userEvent.setup();}
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
