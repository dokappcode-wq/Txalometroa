import type { SupabaseClient } from '@supabase/supabase-js';
import type { Perfil } from './cuenta';

export type ExportacionCuenta = {
  formato: 'txalometroa-cuenta'; version: 1; exportado_en: string;
  cuenta: { id: string; email: string | null; creada: string; correo_confirmado: string | null };
  perfil: Perfil;
  comunidad?: unknown;
  foto: { nombre: string; tipo: string; contenido_base64: string } | null;
};

/** Lectura con la sesión del usuario y RLS; nunca usa una clave administrativa. */
export async function exportarCuenta(cliente: SupabaseClient): Promise<ExportacionCuenta> {
  const { data: identidad, error: errorIdentidad } = await cliente.auth.getUser();
  if (errorIdentidad) throw errorIdentidad;
  if (!identidad.user) throw new Error('Sesión requerida');
  const usuario = identidad.user;
  const { data, error } = await cliente.from('perfiles')
    .select('id,nombre,privado,idioma,avatar_path,condiciones_version,condiciones_aceptadas,creado')
    .eq('id', usuario.id).single();
  if (error) throw error;
  const perfil = data as Perfil;
  if (!perfil || perfil.id !== usuario.id) throw new Error('Perfil no disponible');
  let foto: ExportacionCuenta['foto'] = null;
  if (perfil.avatar_path) {
    if (!perfil.avatar_path.startsWith(usuario.id + '/')) throw new Error('Foto no válida');
    const { data: archivo, error: errorFoto } = await cliente.storage.from('avatares').download(perfil.avatar_path);
    if (errorFoto) throw errorFoto;
    if (!archivo) throw new Error('Foto no disponible');
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    let binario = '';
    for (let i = 0; i < bytes.length; i += 8192) binario += String.fromCharCode(...bytes.subarray(i, i + 8192));
    foto = { nombre: perfil.avatar_path.split('/').pop()!, tipo: archivo.type, contenido_base64: btoa(binario) };
  }
  const social = await cliente.rpc('feed_exportar');
  if (social.error && !['PGRST202','42883'].includes(social.error.code)) throw social.error;
  // Una descarga iniciada antes de cambiar de cuenta nunca cruza identidades.
  const { data: actual, error: errorActual } = await cliente.auth.getUser();
  if (errorActual) throw errorActual;
  if (actual.user?.id !== usuario.id) throw new Error('La sesión ha cambiado');
  return {
    formato: 'txalometroa-cuenta', version: 1, exportado_en: new Date().toISOString(),
    cuenta: { id: usuario.id, email: usuario.email ?? null, creada: usuario.created_at, correo_confirmado: usuario.email_confirmed_at ?? null },
    perfil, foto, ...(social.error ? {} : { comunidad: social.data }),
  };
}

export function descargarDatos(datos: ExportacionCuenta) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = 'txalometroa-mis-datos.json';
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
