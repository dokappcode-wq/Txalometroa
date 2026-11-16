import { describe, expect, it, vi } from 'vitest';
import { crearGestorCuenta } from './index';

const id = '11111111-1111-4111-8111-111111111111';
const otro = '22222222-2222-4222-8222-222222222222';
const origen = 'https://app.example';
const usuario = { id, email: 'yo@example.com', app_metadata: { providers: ['email'] } };
const config = { url: 'https://backend.example', publica: 'publica', servicio: 'privada', origenes: [origen] };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
function peticion(cuerpo: unknown, token = 'sesion-verificada', origin = origen) {
  return new Request(origen + '/cuenta', {
    method: 'POST', headers: { Authorization: token ? 'Bearer ' + token : '', 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(cuerpo),
  });
}
function servicio(respuestas: Response[]) {
  const fetcher = vi.fn<typeof fetch>();
  for (const r of respuestas) fetcher.mockResolvedValueOnce(r);
  fetcher.mockRejectedValue(new Error('Petición inesperada: secreto interno'));
  return { fetcher, handler: crearGestorCuenta(config, fetcher) };
}
const borrar = { accion: 'eliminar', confirmar: true, clave_actual: 'una contraseña' };
const reautenticado = () => json({ user: usuario, access_token: 'sesion-temporal' });

describe('Gestión de cuenta: límites de identidad y borrado', () => {
  it('rechaza peticiones sin sesión y orígenes ajenos antes de usar credenciales', async () => {
    const { handler, fetcher } = servicio([]);
    expect((await handler(peticion(borrar, ''))).status).toBe(401);
    expect((await handler(peticion(borrar, 'sesion-verificada', 'https://ajeno.example'))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('verifica la sesión remotamente y no borra con un token inventado', async () => {
    const { handler, fetcher } = servicio([json({ error: 'token falso' }, 401)]);
    expect((await handler(peticion(borrar))).status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(config.url + '/auth/v1/user');
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty('apikey', 'privada');
  });
  it('exige confirmación y contraseña explícitas', async () => {
    const { handler, fetcher } = servicio([]);
    expect((await handler(peticion({ ...borrar, confirmar: false }))).status).toBe(400);
    expect((await handler(peticion({ ...borrar, clave_actual: '' }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('consultar disponibilidad no usa la clave administrativa', async () => {
    const { handler, fetcher } = servicio([json(usuario)]);
    const respuesta = await handler(peticion({ accion: 'estado' }));
    expect(await respuesta.json()).toEqual({ version: 1, eliminar: true });
    expect(respuesta.headers.get('cache-control')).toBe('no-store');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('una contraseña equivocada no toca fotos ni usuarios', async () => {
    const { handler, fetcher } = servicio([json(usuario), json({ message: 'invalid' }, 400)]);
    const respuesta = await handler(peticion(borrar));
    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual({ codigo: 'clave_incorrecta' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('comprueba que la reautenticación corresponde al mismo usuario', async () => {
    const { handler, fetcher } = servicio([json(usuario), json({ user: { id: otro }, access_token: 'temporal' }), json({})]);
    expect((await handler(peticion(borrar))).status).toBe(401);
    expect(fetcher.mock.calls.map(c => c[0])).not.toContain(config.url + '/auth/v1/admin/users/' + id);
    expect(fetcher.mock.lastCall?.[0]).toContain('/logout?scope=local');
  });
  it('elimina solo la identidad verificada, aunque el cuerpo intente elegir otra', async () => {
    const { handler, fetcher } = servicio([json(usuario), reautenticado(), json([]), json({})]);
    const respuesta = await handler(peticion({ ...borrar, user_id: otro, email: 'otro@example.com' }));
    expect(await respuesta.json()).toEqual({ eliminada: true });
    expect(JSON.parse(fetcher.mock.calls[1][1]!.body as string).email).toBe(usuario.email);
    expect(JSON.parse(fetcher.mock.calls[2][1]!.body as string).prefix).toBe(id);
    expect(fetcher.mock.calls[3][0]).toBe(config.url + '/auth/v1/admin/users/' + id);
    expect(fetcher.mock.calls[3][1]?.method).toBe('DELETE');
    expect(JSON.parse(fetcher.mock.calls[3][1]!.body as string)).toEqual({ should_soft_delete: false });
  });
  it('limpia subcarpetas y siguientes páginas sin saltarse fotos', async () => {
    const { handler, fetcher } = servicio([
      json(usuario), reautenticado(),
      json([{ name: 'viejas', id: null, metadata: null }, { name: 'foto.jpg', id: 'foto', metadata: {} }]),
      json([{ name: 'otra.png', id: 'otra', metadata: {} }]), json({}), json([]),
      json({}), json([{ name: 'ultima.webp', id: 'ultima', metadata: {} }]), json({}), json([]), json({}),
    ]);
    expect((await handler(peticion(borrar))).status).toBe(200);
    const eliminaciones = fetcher.mock.calls.filter(c => c[1]?.method === 'DELETE');
    expect(eliminaciones.map(c => c[0])).toEqual([
      config.url + '/storage/v1/object/avatares', config.url + '/storage/v1/object/avatares',
      config.url + '/storage/v1/object/avatares', config.url + '/auth/v1/admin/users/' + id,
    ]);
    expect(eliminaciones.slice(0, 3).map(c => JSON.parse(c[1]!.body as string).prefixes)).toEqual([
      [id + '/viejas/otra.png'], [id + '/foto.jpg'], [id + '/ultima.webp'],
    ]);
    expect(fetcher.mock.calls.filter(c => String(c[0]).includes('/list/')).every(c => JSON.parse(c[1]!.body as string).offset === 0)).toBe(true);
  });
  it('si falla Storage, mantiene la cuenta y revoca la sesión temporal', async () => {
    const { handler, fetcher } = servicio([json(usuario), reautenticado(), json([{ name: 'foto.jpg', id: 'foto', metadata: {} }]), json({}, 500), json({})]);
    const respuesta = await handler(peticion(borrar));
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ codigo: 'foto_no_eliminada' });
    expect(fetcher.mock.calls.some(c => String(c[0]).includes('/admin/users'))).toBe(false);
    expect(fetcher.mock.lastCall?.[0]).toContain('/logout?scope=local');
  });
  it('no declara éxito si Auth rechaza el borrado ni expone sus diagnósticos', async () => {
    const { handler } = servicio([json(usuario), reautenticado(), json([]), json({ detail: 'secreto interno' }, 500), json({})]);
    const respuesta = await handler(peticion(borrar));
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ codigo: 'borrado_no_completado' });
  });
  it('impide escapar de la carpeta propia con una ruta inesperada', async () => {
    const { handler, fetcher } = servicio([json(usuario), reautenticado(), json([{ name: '../otro', id: 'foto', metadata: {} }]), json({})]);
    expect((await handler(peticion(borrar))).status).toBe(503);
    expect(fetcher.mock.calls.some(c => c[1]?.method === 'DELETE')).toBe(false);
  });
  it('limita el tamaño del cuerpo antes de consultar el servicio', async () => {
    const { handler, fetcher } = servicio([]);
    expect((await handler(peticion({ ...borrar, relleno: 'a'.repeat(9000) }))).status).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
