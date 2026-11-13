export const VERSION_CONDICIONES = 'revision-2026-11';
export type Perfil = { id:string; nombre:string; privado:boolean; idioma:'es'|'eu'; avatar_path:string|null; condiciones_version:string|null; condiciones_aceptadas:string|null; creado:string };
export function validarAvatar(file:File):string|null {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))return 'tipo';
 if(file.size>2*1024*1024)return 'tamano';
 if(file.size===0)return 'vacio';
 return null;
}
export function mensajeError(error:unknown,t:(es:string,eu:string)=>string):string {
 const e=error as {code?:string;message?:string};
 if(e?.code==='invalid_credentials')return t('El correo o la contraseña no son correctos.','Posta edo pasahitza ez dira zuzenak.');
 if(e?.code==='email_not_confirmed')return t('Confirma tu correo antes de entrar.','Baieztatu posta sartu aurretik.');
 if(e?.code==='over_email_send_rate_limit'||e?.code==='over_request_rate_limit')return t('Demasiados intentos. Espera unos minutos y vuelve a probar.','Saiakera gehiegi. Itxaron minutu batzuk eta saiatu berriro.');
 if(e?.code==='weak_password')return t('Elige una contraseña más segura, de al menos 10 caracteres.','Aukeratu gutxienez 10 karaktereko pasahitz seguruagoa.');
 if(e?.code==='PGRST205'||e?.code==='42P01'||e?.code==='PGRST202')return t('El servicio de perfiles todavía está en preparación. Inténtalo más tarde.','Profilen zerbitzua prestatzen ari da. Saiatu geroago.');
 if(e?.message?.includes('fetch')||e?.message?.includes('network'))return t('No hay conexión con el servicio. Tus cambios aún no se han guardado.','Ez dago zerbitzuarekiko konexiorik. Aldaketak ez dira gorde oraindik.');
 return t('No se pudo completar la operación. Vuelve a intentarlo.','Ezin izan da eragiketa osatu. Saiatu berriro.');
}
