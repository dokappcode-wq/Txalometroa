import { supabase } from './supabase';
export type Texto = (es: string, eu: string) => string;
export type Publicacion = {id:string;autor:string;nombre:string;texto:string;obra_id:string|null;spoiler:boolean;creado:string;editado:string|null;aplausos:number;aplaudida:boolean;comentarios:number};
export type Comentario = {id:string;autor:string;nombre:string;texto:string;creado:string};
export type Persona = {id:string;nombre:string;estado?:'pendiente'|'aceptado'|null;privado?:boolean};
export type Relaciones = {siguiendo:Persona[];seguidores:Persona[];solicitudes:Persona[];bloqueados:Persona[]};
export type Borrador = {id:string;texto:string;obra:string;spoiler:boolean};
export const relacionesVacias:Relaciones={siguiendo:[],seguidores:[],solicitudes:[],bloqueados:[]};
export const patronUUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function codigoPersona(entrada:string):string|null{
 let codigo=entrada.trim();
 try{codigo=new URL(codigo).searchParams.get('persona')??'';}catch{/* También se acepta un código sin enlace. */}
 return patronUUID.test(codigo)?codigo:null;
}
export function nuevoBorrador():Borrador{return {id:crypto.randomUUID(),texto:'',obra:'',spoiler:false};}
export function leerBorrador(usuario:string):Borrador{
 try{const b=JSON.parse(localStorage.getItem('txalo-feed-borrador:'+usuario)||'null');if(b&&patronUUID.test(b.id)&&typeof b.texto==='string'&&typeof b.obra==='string'&&typeof b.spoiler==='boolean')return {...b,texto:b.texto.slice(0,2000)};}catch{/* El borrador no debe bloquear la app. */}
 return nuevoBorrador();
}
export function guardarBorrador(usuario:string,b:Borrador):boolean{
 try{if(b.texto||b.obra)localStorage.setItem('txalo-feed-borrador:'+usuario,JSON.stringify(b));else localStorage.removeItem('txalo-feed-borrador:'+usuario);return true;}catch{return false;}
}
export async function rpcFeed<T>(nombre:string,parametros:Record<string,unknown>={}):Promise<T>{
 if(!supabase)throw new Error('SERVICIO_NO_DISPONIBLE');
 const {data,error}=await supabase.rpc(nombre,parametros);if(error)throw error;return data as T;
}
export function feedSinInstalar(e:unknown):boolean{return ['PGRST202','PGRST205','42P01'].includes((e as {code?:string})?.code??'');}
export function errorFeed(e:unknown,t:Texto):string{
 const m=(e as {message?:string})?.message??'';
 if(m.includes('PERFIL_INCOMPLETO'))return t('Completa tu nombre y acepta las condiciones en tu perfil antes de participar.','Osatu izena eta onartu baldintzak zure profilean parte hartu aurretik.');
 if(m.includes('DEMASIADOS_INTENTOS'))return t('Has hecho varias acciones seguidas. Espera un poco y vuelve a intentarlo.','Hainbat ekintza jarraian egin dituzu. Itxaron pixka bat eta saiatu berriro.');
 if(m.includes('ENVIO_YA_EXISTE'))return t('Este envío ya llegó al servidor. Actualiza el feed para encontrarlo y editarlo.','Bidalketa hau zerbitzarira iritsi da. Eguneratu feed-a aurkitzeko eta editatzeko.');
 if(m.includes('NO_PERMITIDO')||m.includes('PERSONA_NO_DISPONIBLE'))return t('Este contenido o esta persona ya no están disponibles para tu cuenta. Actualiza el feed.','Eduki edo pertsona hau ez dago zure konturako erabilgarri. Eguneratu feed-a.');
 if(m.includes('SESION_REQUERIDA'))return t('Vuelve a entrar para continuar.','Sartu berriro jarraitzeko.');
 return t('No se pudo completar la operación. Tu texto se conserva; comprueba la conexión y reinténtalo.','Ezin izan da eragiketa osatu. Testua gorde da; egiaztatu konexioa eta saiatu berriro.');
}
export function fechaFeed(fecha:string,idioma:'es'|'eu'){
 return new Intl.DateTimeFormat(idioma,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(fecha));
}
export function paginaFeed<T extends {id:string}>(anteriores:T[],nuevos:T[]){
 const mapa=new Map(anteriores.map(p=>[p.id,p]));for(const p of nuevos.slice(0,20))mapa.set(p.id,p);
 return {elementos:[...mapa.values()],hayMas:nuevos.length>20};
}
