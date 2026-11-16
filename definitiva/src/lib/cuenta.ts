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
 if(e?.code==='clave_incorrecta')return t('La contraseña actual no es correcta. No se ha borrado la cuenta.','Oraingo pasahitza ez da zuzena. Kontua ez da ezabatu.');
 if(e?.code==='sesion_requerida')return t('Vuelve a iniciar sesión para continuar.','Hasi saioa berriro jarraitzeko.');
 if(e?.code==='foto_no_eliminada')return t('No se pudieron eliminar todas las fotos. La cuenta sigue activa; vuelve a intentarlo.','Ezin izan dira argazki guztiak ezabatu. Kontuak aktibo jarraitzen du; saiatu berriro.');
 if(e?.code==='borrado_no_completado')return t('No se ha podido confirmar el borrado. Vuelve a entrar y comprueba tu cuenta antes de reintentarlo.','Ezin izan da ezabaketa baieztatu. Sartu berriro eta egiaztatu kontua berriro saiatu aurretik.');
 if(e?.code==='foto_pendiente_limpieza')return t('La foto ya no aparece en tu perfil, pero no se ha podido eliminar el archivo del servicio. Se volverá a limpiar al borrar la cuenta.','Argazkia ez da profilean agertzen, baina ezin izan da fitxategia zerbitzutik ezabatu. Kontua ezabatzean berriro garbituko da.');
 if(e?.code==='acceso_por_correo_requerido')return t('Esta opción requiere una cuenta con contraseña.','Aukera honek pasahitza duen kontua behar du.');
 if(e?.code==='invalid_credentials')return t('El correo o la contraseña no son correctos.','Posta edo pasahitza ez dira zuzenak.');
 if(e?.code==='email_not_confirmed')return t('Confirma tu correo antes de entrar.','Baieztatu posta sartu aurretik.');
 if(e?.code==='email_address_not_authorized')return t('El servicio de correo todavía no permite enviar a esta dirección. La administración debe configurar el envío de correos antes de poder confirmar tu cuenta.','Posta-zerbitzuak oraindik ez du helbide honetara bidaltzen uzten. Administrazioak posta-bidalketa konfiguratu behar du kontua baieztatu ahal izateko.');
 if(e?.code==='email_address_invalid')return t('Revisa que la dirección de correo esté bien escrita.','Egiaztatu helbide elektronikoa zuzen idatzita dagoela.');
 if(e?.code==='over_email_send_rate_limit')return t('Se ha alcanzado el límite de correos del servicio. Inténtalo más tarde; pedir más enlaces ahora no enviará nuevos correos.','Zerbitzuaren posta-mugara iritsi da. Saiatu geroago; orain esteka gehiago eskatzeak ez du mezu berririk bidaliko.');
 if(e?.code==='over_request_rate_limit'||e?.code==='demasiados_intentos')return t('Demasiados intentos. Espera unos minutos y vuelve a probar.','Saiakera gehiegi. Itxaron minutu batzuk eta saiatu berriro.');
 if(e?.code==='weak_password')return t('Elige una contraseña más segura, de al menos 10 caracteres.','Aukeratu gutxienez 10 karaktereko pasahitz seguruagoa.');
 if(e?.code==='PGRST205'||e?.code==='42P01'||e?.code==='PGRST202')return t('El servicio de perfiles todavía está en preparación. Inténtalo más tarde.','Profilen zerbitzua prestatzen ari da. Saiatu geroago.');
 if(e?.message?.includes('fetch')||e?.message?.includes('network'))return t('No hay conexión con el servicio. Tus cambios aún no se han guardado.','Ez dago zerbitzuarekiko konexiorik. Aldaketak ez dira gorde oraindik.');
 return t('No se pudo completar la operación. Vuelve a intentarlo.','Ezin izan da eragiketa osatu. Saiatu berriro.');
}
