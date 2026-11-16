/** Función autocontenida: se puede pegar íntegra en el editor de Supabase. */
type Configuracion = { url: string; publica: string; servicio: string; origenes: string[] };
class Fallo extends Error {
  constructor(public estado: number, public codigo: string) { super(codigo); }
}
type Objeto = { name: string; id: string | null; metadata: unknown };

export function crearGestorCuenta(config: Configuracion, solicitar: typeof fetch = fetch) {
  return async (peticion: Request): Promise<Response> => {
    const origen = peticion.headers.get('origin');
    const cabeceras: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (origen && config.origenes.includes(origen)) cabeceras['Access-Control-Allow-Origin'] = origen;
    const respuesta = (estado: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: estado, headers: cabeceras });
    let tokenTemporal = '';
    let eliminada = false;
    const api = async (ruta: string, token: string, clave: string, metodo = 'GET', cuerpo?: unknown) => {
      try {
        return await solicitar(config.url + ruta, {
          method: metodo,
          headers: { Authorization: 'Bearer ' + token, apikey: clave, 'Content-Type': 'application/json' },
          body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
          signal: AbortSignal.timeout(15000),
        });
      } catch { throw new Fallo(503, 'servicio_no_disponible'); }
    };
    try {
      if (origen && !config.origenes.includes(origen)) throw new Fallo(403, 'origen_no_permitido');
      if (peticion.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabeceras });
      if (peticion.method !== 'POST') throw new Fallo(405, 'metodo_no_permitido');
      if (!config.url || !config.publica || !config.servicio) throw new Fallo(503, 'servicio_no_disponible');
      const autorizacion = peticion.headers.get('authorization');
      if (!autorizacion?.startsWith('Bearer ') || autorizacion.length < 15) throw new Fallo(401, 'sesion_requerida');
      if (!peticion.headers.get('content-type')?.includes('application/json')) throw new Fallo(415, 'json_requerido');

      // Limitar el cuerpo también cuando no hay Content-Length.
      const lector = peticion.body?.getReader();
      const partes: Uint8Array[] = [];
      let longitud = 0;
      if (lector) while (true) {
        const { value, done } = await lector.read();
        if (done) break;
        longitud += value.byteLength;
        if (longitud > 8192) { await lector.cancel(); throw new Fallo(413, 'peticion_demasiado_grande'); }
        partes.push(value);
      }
      let cuerpo: { accion?: string; confirmar?: boolean; clave_actual?: string };
      try { cuerpo = JSON.parse(await new Blob(partes as BlobPart[]).text()); }
      catch { throw new Fallo(400, 'peticion_no_valida'); }
      if (!cuerpo || !['estado', 'eliminar'].includes(cuerpo.accion ?? '')) throw new Fallo(400, 'accion_no_valida');
      if (cuerpo.accion === 'eliminar' && (cuerpo.confirmar !== true || typeof cuerpo.clave_actual !== 'string' || !cuerpo.clave_actual || cuerpo.clave_actual.length > 1024)) {
        throw new Fallo(400, 'confirmacion_requerida');
      }
      // Verificación remota: no se confía en claims decodificados ni en un id recibido.
      const autenticacion = await api('/auth/v1/user', autorizacion.slice(7), config.publica);
      if (!autenticacion.ok) throw new Fallo(autenticacion.status >= 500 ? 503 : 401, autenticacion.status >= 500 ? 'servicio_no_disponible' : 'sesion_requerida');
      const usuario = await autenticacion.json();
      if (!/^[0-9a-f-]{36}$/i.test(usuario.id ?? '') || !usuario.email) throw new Fallo(401, 'sesion_requerida');
      const permiteClave = usuario.app_metadata?.providers?.includes('email') === true;
      if (cuerpo.accion === 'estado') return respuesta(200, { version: 1, eliminar: permiteClave });
      if (!permiteClave) throw new Fallo(409, 'acceso_por_correo_requerido');

      const reautenticacion = await api('/auth/v1/token?grant_type=password', config.publica, config.publica, 'POST', {
        email: usuario.email, password: cuerpo.clave_actual,
      });
      if (reautenticacion.status === 429) throw new Fallo(429, 'demasiados_intentos');
      if (!reautenticacion.ok) throw new Fallo(reautenticacion.status >= 500 ? 503 : 401, reautenticacion.status >= 500 ? 'servicio_no_disponible' : 'clave_incorrecta');
      const verificacion = await reautenticacion.json();
      tokenTemporal = verificacion.access_token;
      if (!tokenTemporal || verificacion.user?.id !== usuario.id) throw new Fallo(401, 'sesion_requerida');

      // Borrar binarios mediante Storage, nunca mediante SQL sobre storage.objects.
      // Vaciar cada página antes de pedir la siguiente evita saltos al paginar.
      let consultas = 0;
      async function vaciar(prefijo: string, profundidad = 0): Promise<void> {
        if (profundidad > 30) throw new Fallo(503, 'foto_no_eliminada');
        while (true) {
          if (++consultas > 2000) throw new Fallo(503, 'foto_no_eliminada');
          const lista = await api('/storage/v1/object/list/avatares', config.servicio, config.servicio, 'POST', {
            prefix: prefijo, limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' },
          });
          if (!lista.ok) throw new Fallo(503, 'foto_no_eliminada');
          const objetos = await lista.json() as Objeto[];
          if (!Array.isArray(objetos)) throw new Fallo(503, 'foto_no_eliminada');
          if (objetos.length === 0) return;
          const rutas: string[] = [];
          for (const objeto of objetos) {
            if (!objeto.name || objeto.name.includes('/') || objeto.name.includes('\\') || ['.', '..'].includes(objeto.name)) throw new Fallo(503, 'foto_no_eliminada');
            const ruta = prefijo + '/' + objeto.name;
            if (!objeto.id && !objeto.metadata) await vaciar(ruta, profundidad + 1);
            else rutas.push(ruta);
          }
          if (rutas.length) {
            const borrado = await api('/storage/v1/object/avatares', config.servicio, config.servicio, 'DELETE', { prefixes: rutas });
            if (!borrado.ok) throw new Fallo(503, 'foto_no_eliminada');
          }
        }
      }
      await vaciar(usuario.id);
      const borrado = await api('/auth/v1/admin/users/' + usuario.id, config.servicio, config.servicio, 'DELETE', { should_soft_delete: false });
      if (!borrado.ok) throw new Fallo(503, 'borrado_no_completado');
      // perfiles se elimina por la clave foránea ON DELETE CASCADE ya instalada.
      eliminada = true;
      return respuesta(200, { eliminada: true });
    } catch (error) {
      const fallo = error instanceof Fallo ? error : new Fallo(503, 'servicio_no_disponible');
      return respuesta(fallo.estado, { codigo: fallo.codigo });
    } finally {
      // Si falla Storage o Auth, revocar la sesión temporal creada al comprobar la clave.
      if (tokenTemporal && !eliminada) {
        try { await api('/auth/v1/logout?scope=local', tokenTemporal, config.publica, 'POST'); } catch { /* No ocultar el error original. */ }
      }
    }
  };
}

declare const Deno: { env: { get(nombre: string): string | undefined }; serve(handler: (r: Request) => Promise<Response>): void };
if (typeof Deno !== 'undefined') {
  Deno.serve(crearGestorCuenta({
    url: Deno.env.get('SUPABASE_URL') ?? '',
    publica: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    servicio: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    origenes: (Deno.env.get('APP_ORIGINS') ?? 'https://txalometroa-revision-hika.acousticthistle2.chatgpt.site,https://txalometroa-escenario.netlify.app').split(',').map(s => s.trim()),
  }));
}
