import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exportarCuenta } from './datosCuenta';

const usuario = { id: 'usuario-a', email: 'a@example.com', created_at: '2026-11-01', email_confirmed_at: '2026-11-02', access_token: 'no-exportar' };
const perfil = { id: usuario.id, nombre: 'Ana', idioma: 'es', privado: true, avatar_path: null, condiciones_version: 'revision-2026-11', condiciones_aceptadas: '2026-11-02', creado: '2026-11-01' };
function cliente(foto = false) {
  const getUser = vi.fn().mockResolvedValue({ data: { user: usuario }, error: null });
  const single = vi.fn().mockResolvedValue({ data: { ...perfil, avatar_path: foto ? 'usuario-a/foto.png' : null }, error: null });
  const eq = vi.fn().mockReturnValue({ single });
  const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) });
  const download = vi.fn().mockResolvedValue({ data: new Blob(['foto real'], { type: 'image/png' }), error: null });
  return { api: { auth: { getUser }, rpc: vi.fn().mockResolvedValue({data:{publicaciones:[]},error:null}), from, storage: { from: vi.fn().mockReturnValue({ download }) } } as unknown as SupabaseClient, getUser, single, eq, download };
}
it('descarga solo los datos de la identidad verificada y omite los tokens', async () => {
  const c = cliente();
  const resultado = await exportarCuenta(c.api);
  expect(c.eq).toHaveBeenCalledWith('id', usuario.id);
  expect(resultado.perfil).toEqual(perfil);
  expect(resultado.cuenta.email).toBe(usuario.email);
  expect(JSON.stringify(resultado)).not.toContain('no-exportar');
  expect(c.download).not.toHaveBeenCalled();
});
it('incluye el archivo de foto sin enlaces firmados que caduquen', async () => {
  const c = cliente(true);
  const resultado = await exportarCuenta(c.api);
  expect(c.download).toHaveBeenCalledWith('usuario-a/foto.png');
  expect(resultado.foto).toEqual({ nombre: 'foto.png', tipo: 'image/png', contenido_base64: btoa('foto real') });
});
it('no entrega una exportación parcial si falla la foto', async () => {
  const c = cliente(true);c.download.mockResolvedValue({ data: null, error: new Error('sin conexión') });
  await expect(exportarCuenta(c.api)).rejects.toThrow('sin conexión');
});
it('interrumpe la descarga si se cambia de cuenta durante la lectura', async () => {
  const c = cliente();
  c.getUser.mockResolvedValueOnce({ data: { user: usuario }, error: null }).mockResolvedValueOnce({ data: { user: { ...usuario, id: 'usuario-b' } }, error: null });
  await expect(exportarCuenta(c.api)).rejects.toThrow('La sesión ha cambiado');
});
it('rechaza una foto fuera de la carpeta de la cuenta', async () => {
  const c = cliente();c.single.mockResolvedValue({ data: { ...perfil, avatar_path: 'usuario-b/foto.png' }, error: null });
  await expect(exportarCuenta(c.api)).rejects.toThrow('Foto no válida');
  expect(c.download).not.toHaveBeenCalled();
});
