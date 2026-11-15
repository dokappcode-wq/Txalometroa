import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleUserRound, Download, LogOut, ShieldCheck, Trash2, Upload, Mail, CheckCircle2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { googleHabilitado, gestionDatosHabilitada, supabase } from '../lib/supabase';
import { mensajeError, validarAvatar, VERSION_CONDICIONES } from '../lib/cuenta';
import type { Perfil } from '../lib/cuenta';
type Modo = 'entrar'|'registro'|'recuperar'|'clave';
type Texto = (es:string,eu:string)=>string;
export default function Cuenta({t}:{t:Texto}) {
 const [sesion,setSesion]=useState<Session|null>(null);
 const [cargando,setCargando]=useState(Boolean(supabase));
 const [perfil,setPerfil]=useState<Perfil|null>(null);
 const [modo,setModo]=useState<Modo>(new URLSearchParams(location.search).has('recuperar')?'clave':'entrar');
 const [email,setEmail]=useState(''),[clave,setClave]=useState(''),[repetir,setRepetir]=useState('');
 const [nombre,setNombre]=useState(''),[privado,setPrivado]=useState(true),[idioma,setIdioma]=useState<'es'|'eu'>('es');
 const [acepta,setAcepta]=useState(false),[edad,setEdad]=useState(false);
 const [mensaje,setMensaje]=useState(''),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false);
 const [foto,setFoto]=useState(''),[borrar,setBorrar]=useState(false),[confirmacion,setConfirmacion]=useState('');
 const bloqueado=useRef(false);
 const redireccion=location.origin+'/perfil';
 useEffect(()=>{
  if(!supabase)return;let vivo=true,evento=false;
  const {data}=supabase.auth.onAuthStateChange((e,s)=>{evento=true;if(!vivo)return;setSesion(s);setCargando(false);if(e==='PASSWORD_RECOVERY')setModo('clave');});
  supabase.auth.getSession().then(({data,error})=>{if(vivo&&!evento){setSesion(data.session);setCargando(false);if(error)setError(t('No se pudo recuperar la sesión. Vuelve a entrar.','Ezin izan da saioa berreskuratu. Sartu berriro.'));}}).catch(()=>{if(vivo){setCargando(false);setError(t('No se pudo conectar. Inténtalo de nuevo.','Ezin izan da konektatu. Saiatu berriro.'));}});
  return()=>{vivo=false;data.subscription.unsubscribe();};
 // Los cambios de idioma no reinician la sesión.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
  if(!supabase||!sesion){setPerfil(null);setFoto('');return;}
  let vivo=true;setCargando(true);setPerfil(null);setError('');
  Promise.resolve(supabase.from('perfiles').select('*').eq('id',sesion.user.id).single()).then(({data,error})=>{
   if(!vivo)return;setCargando(false);
   if(error){setError(mensajeError(error,t));return;}
   const p=data as Perfil;setPerfil(p);setNombre(p.nombre);setPrivado(p.privado);setIdioma(p.idioma);
  }).catch(e=>{if(vivo){setCargando(false);setError(mensajeError(e,t));}});
  return()=>{vivo=false;};
 // Solo recargar si cambia la identidad, no en cada renovación del token.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[sesion?.user.id]);
 useEffect(()=>{
  setFoto('');if(!supabase||!perfil?.avatar_path)return;let vivo=true;
  const actualizar=()=>supabase!.storage.from('avatares').createSignedUrl(perfil.avatar_path!,3600).then(({data})=>{if(vivo&&data)setFoto(data.signedUrl);});
  void actualizar();const reloj=setInterval(()=>void actualizar(),45*60*1000);
  return()=>{vivo=false;clearInterval(reloj);};
 },[perfil?.avatar_path]);
 async function ejecutar(fn:()=>Promise<void>){if(bloqueado.current)return;bloqueado.current=true;setOcupado(true);setError('');setMensaje('');try{await fn();}catch(e){setError(mensajeError(e,t));}finally{bloqueado.current=false;setOcupado(false);}}
 function cambiarModo(m:Modo){setModo(m);setClave('');setRepetir('');setError('');setMensaje('');}
 async function autenticar(e:React.FormEvent){e.preventDefault();if(!supabase)return;await ejecutar(async()=>{
  if(modo==='recuperar'){
   const {error}=await supabase!.auth.resetPasswordForEmail(email,{redirectTo:redireccion+'?recuperar=1'});if(error)throw error;
   setMensaje(t('Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso.','Posta horrekin konturik badago, sarbidea berreskuratzeko esteka jasoko duzu.'));return;
  }
  if(modo==='clave'){
   if(clave!==repetir){setError(t('Las contraseñas no coinciden.','Pasahitzak ez datoz bat.'));return;}
   const {error}=await supabase!.auth.updateUser({password:clave});if(error)throw error;
   setClave('');setRepetir('');setModo('entrar');window.history.replaceState({},'',redireccion);
   setMensaje(t('Contraseña actualizada.','Pasahitza eguneratuta.'));return;
  }
  if(modo==='registro'){
   const {error}=await supabase!.auth.signUp({email,password:clave,options:{emailRedirectTo:redireccion}});if(error)throw error;
   setClave('');setModo('entrar');setMensaje(t('Revisa tu correo para confirmar la cuenta. Si ya la tienes, puedes entrar o recuperar el acceso.','Begiratu posta kontua baieztatzeko. Kontua baduzu, sartu edo berreskuratu sarbidea.'));return;
  }
  const {data,error}=await supabase!.auth.signInWithPassword({email,password:clave});if(error)throw error;
  setSesion(data.session);setClave('');
 });}
 async function guardar(e:React.FormEvent){e.preventDefault();if(!supabase||!perfil)return;await ejecutar(async()=>{
  if(!perfil.condiciones_aceptadas){const {error}=await supabase!.rpc('aceptar_condiciones',{p_version:VERSION_CONDICIONES,p_acepta:acepta,p_edad:edad});if(error)throw error;}
  const {data,error}=await supabase!.from('perfiles').update({nombre:nombre.trim(),privado,idioma}).eq('id',perfil.id).select().single();if(error)throw error;
  setPerfil(data as Perfil);setMensaje(t('Tu perfil se ha guardado.','Zure profila gorde da.'));
 });}
 async function salir(){await ejecutar(async()=>{const {error}=await supabase!.auth.signOut();if(error)throw error;setSesion(null);setPerfil(null);setNombre('');setFoto('');setBorrar(false);setAcepta(false);setEdad(false);setModo('entrar');});}
 async function subir(file?:File){if(!file||!perfil||!supabase)return;const validacion=validarAvatar(file);if(validacion){setError(validacion==='tamano'?t('La foto debe ocupar menos de 2 MB.','Argazkiak 2 MB baino gutxiago izan behar du.'):t('Selecciona una imagen JPG, PNG o WebP válida.','Aukeratu JPG, PNG edo WebP irudi baliodun bat.'));return;}
  await ejecutar(async()=>{
   const ruta=`${perfil.id}/${crypto.randomUUID()}.${file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp'}`;
   const {error}=await supabase!.storage.from('avatares').upload(ruta,file,{contentType:file.type,upsert:false});if(error)throw error;
   const {data,error:err}=await supabase!.from('perfiles').update({avatar_path:ruta}).eq('id',perfil.id).select().single();
   if(err){await supabase!.storage.from('avatares').remove([ruta]);throw err;}
   if(perfil.avatar_path)await supabase!.storage.from('avatares').remove([perfil.avatar_path]);
   setPerfil(data as Perfil);setMensaje(t('Foto actualizada.','Argazkia eguneratuta.'));
  });
 }
 async function gestionar(accion:'exportar'|'eliminar'){if(!supabase)return;await ejecutar(async()=>{
  const {data,error}=await supabase!.functions.invoke('cuenta',{body:{accion,confirmar:accion==='eliminar'}});
  if(error){setError(t('No se pudo completar. Si vas a borrar la cuenta, vuelve a iniciar sesión y reinténtalo en los próximos 15 minutos.','Ezin izan da osatu. Kontua ezabatzeko, hasi saioa berriro eta saiatu hurrengo 15 minutuetan.'));return;}
  if(accion==='exportar'){
   const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='txalometroa-mis-datos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMensaje(t('Descarga preparada.','Deskarga prest.'));
  }else{
   await supabase!.auth.signOut({scope:'local'});setSesion(null);setPerfil(null);setFoto('');setBorrar(false);setConfirmacion('');setMensaje(t('Tu cuenta se ha borrado.','Zure kontua ezabatu da.'));
  }
 });}
 const avisos=<>{error&&<div className="cuenta-aviso error" role="alert">{error}</div>}{mensaje&&<div className="cuenta-aviso" role="status"><CheckCircle2 size={18}/>{mensaje}</div>}</>;
 const controles=<fieldset disabled={ocupado} className="cuenta-campos"><label>{t('Nombre visible','Izen ikusgaia')}<input autoComplete="nickname" required minLength={1} maxLength={80} value={nombre} onChange={e=>setNombre(e.target.value)}/></label><label>{t('Idioma de tu cuenta','Zure kontuaren hizkuntza')}<select value={idioma} onChange={e=>setIdioma(e.target.value as 'es'|'eu')}><option value="es">Castellano</option><option value="eu">Euskara</option></select></label><label className="cuenta-check"><input type="checkbox" checked={privado} onChange={e=>setPrivado(e.target.checked)}/><span>{t('Perfil privado','Profil pribatua')}<small>{t('Tu actividad será visible solo para las personas que aceptes cuando se abra la comunidad.','Zure jarduera onartzen dituzun pertsonek bakarrik ikusiko dute komunitatea irekitzen denean.')}</small></span></label>{!perfil?.condiciones_aceptadas&&<><label className="cuenta-check"><input type="checkbox" required checked={acepta} onChange={e=>setAcepta(e.target.checked)}/><span>{t('He leído y acepto las','Irakurri eta onartzen ditut')} <Link to="/privacidad" target="_blank">{t('condiciones de esta versión de prueba','proba bertsio honen baldintzak')}</Link>.</span></label><label className="cuenta-check"><input type="checkbox" required checked={edad} onChange={e=>setEdad(e.target.checked)}/><span>{t('Confirmo que tengo al menos 14 años.','Gutxienez 14 urte ditudala baieztatzen dut.')}</span></label></>}<button className="boton principal" disabled={ocupado}>{ocupado?t('Guardando…','Gordetzen…'):t('Guardar perfil','Profila gorde')}<ArrowRight size={17}/></button></fieldset>;
 return <section className="cuenta-pagina"><div className="cuenta-intro"><span className="antetitulo">{t('TU ESPACIO EN HIKA','ZURE GUNEA HIKAN')}</span><h1>{sesion?t('Cada historia empieza contigo.','Istorio bakoitza zurekin hasten da.'):t('El teatro se queda contigo.','Antzerkia zurekin geratzen da.')}</h1><p>{t('Un lugar para guardar lo que has vivido y elegir lo que quieres compartir.','Bizi izan duzuna gordetzeko eta partekatu nahi duzuna aukeratzeko lekua.')}</p><div className="cuenta-promesa"><ShieldCheck size={20}/><span>{t('Tu perfil empieza siendo privado. Tú eliges qué compartir.','Zure profila pribatua da hasieran. Zuk aukeratzen duzu zer partekatu.')}</span></div><Link className="volver" to="/">{t('Explorar las obras','Obrak ezagutu')}<ArrowRight size={15}/></Link></div><div className="cuenta-tarjeta">
 {!supabase?<><CircleUserRound size={42}/><h2>{t('Estamos preparando tu espacio.','Zure gunea prestatzen ari gara.')}</h2><p role="status">{t('El servicio de cuentas estará disponible pronto.','Kontuen zerbitzua laster egongo da erabilgarri.')}</p></>:cargando?<p role="status">{t('Cargando tu cuenta…','Zure kontua kargatzen…')}</p>:<>
 {modo==='clave'?<><h2>{t('Una nueva contraseña.','Pasahitz berri bat.')}</h2>{sesion?<form onSubmit={autenticar}><fieldset disabled={ocupado} className="cuenta-campos"><label>{t('Nueva contraseña','Pasahitz berria')}<input type="password" autoComplete="new-password" minLength={10} required value={clave} onChange={e=>setClave(e.target.value)}/></label><label>{t('Repite la contraseña','Errepikatu pasahitza')}<input type="password" autoComplete="new-password" minLength={10} required value={repetir} onChange={e=>setRepetir(e.target.value)}/></label><button className="boton principal">{t('Actualizar contraseña','Pasahitza eguneratu')}</button><button type="button" onClick={()=>cambiarModo('entrar')}>{t('Volver','Itzuli')}</button></fieldset></form>:<p>{t('Abre el enlace de recuperación que hemos enviado a tu correo. Si ha caducado, pide uno nuevo.','Ireki postaz bidalitako berreskuratze-esteka. Iraungi bada, eskatu beste bat.')} <button className="enlace-boton" onClick={()=>cambiarModo('recuperar')}>{t('Pedir enlace','Esteka eskatu')}</button></p>}</>:
 sesion?<><div className="cuenta-identidad">{foto?<img src={foto} alt={t('Tu foto de perfil','Zure profileko argazkia')}/>:<CircleUserRound size={58}/>}<div><h2>{nombre||t('Tu perfil','Zure profila')}</h2><span>{sesion.user.email}</span></div></div>{perfil?<><form onSubmit={guardar}>{controles}</form>{perfil.condiciones_aceptadas&&<div className="cuenta-foto"><label className="boton secundario"><Upload size={16}/>{t('Cambiar foto','Argazkia aldatu')}<input className="solo-lector" type="file" accept="image/png,image/jpeg,image/webp" disabled={ocupado} onChange={e=>{void subir(e.target.files?.[0]);e.target.value='';}}/></label><small>JPG, PNG, WebP · 2 MB</small>{foto&&<button disabled={ocupado} className="enlace-boton" onClick={()=>ejecutar(async()=>{const anterior=perfil.avatar_path!;const {data,error}=await supabase!.from('perfiles').update({avatar_path:null}).eq('id',perfil.id).select().single();if(error)throw error;setPerfil(data as Perfil);await supabase!.storage.from('avatares').remove([anterior]);})}>{t('Quitar foto','Argazkia kendu')}</button>}</div>}</>:<p>{t('El perfil no está disponible. Puedes volver a cargar la página o cerrar sesión.','Profila ez dago erabilgarri. Orria berriz karga dezakezu edo saioa itxi.')}</p>}
 <div className="cuenta-opciones"><button disabled={ocupado} onClick={()=>cambiarModo('clave')}>{t('Cambiar contraseña','Pasahitza aldatu')}<ArrowRight size={16}/></button><button disabled={ocupado} onClick={()=>void salir()}>{t('Cerrar sesión','Saioa itxi')}<LogOut size={16}/></button>{gestionDatosHabilitada?<><button disabled={ocupado} onClick={()=>void gestionar('exportar')}>{t('Descargar mis datos','Nire datuak deskargatu')}<Download size={16}/></button><button disabled={ocupado} onClick={()=>setBorrar(!borrar)}>{t('Borrar mi cuenta','Nire kontua ezabatu')}<Trash2 size={16}/></button></>:<p className="cuenta-ayuda">{t('La descarga y el borrado de cuenta están pendientes de activar durante esta revisión.','Datuen deskarga eta kontuaren ezabaketa aktibatzeko daude berrikuspen honetan.')}</p>}</div>
 {borrar&&<div className="cuenta-borrado"><h3>{t('Borrar tu cuenta','Zure kontua ezabatu')}</h3><p>{t('Se eliminarán tu perfil, tu foto y tu cuenta. Esta acción es permanente. Para confirmar, escribe BORRAR.','Zure profila, argazkia eta kontua ezabatuko dira. Ekintza hau behin betikoa da. Baieztatzeko, idatzi EZABATU.')}</p><label>{t('Confirmación','Baieztapena')}<input value={confirmacion} onChange={e=>setConfirmacion(e.target.value)} autoComplete="off"/></label><button className="boton principal" disabled={ocupado||confirmacion!==t('BORRAR','EZABATU')} onClick={()=>void gestionar('eliminar')}>{t('Borrar definitivamente','Behin betiko ezabatu')}</button><button className="enlace-boton" disabled={ocupado} onClick={()=>{setBorrar(false);setConfirmacion('');}}>{t('Cancelar','Utzi')}</button></div>}
 </>:<><div className="cuenta-emblema"><Mail size={23}/></div><h2>{modo==='registro'?t('Tu primera entrada.','Zure lehen sarrera.'):modo==='recuperar'?t('Recupera tu acceso.','Berreskuratu sarbidea.'):t('Qué bien verte de nuevo.','Pozten gara berriro ikusteaz.')}</h2><p className="cuenta-ayuda">{modo==='registro'?t('Crea tu cuenta y confirma el enlace que recibirás por email.','Sortu kontua eta baieztatu postaz jasoko duzun esteka.'):modo==='recuperar'?t('Te enviaremos un enlace para elegir una nueva contraseña.','Pasahitz berria aukeratzeko esteka bidaliko dizugu.'):t('Entra para acceder a tu espacio personal.','Sartu zure gune pertsonalean.')}</p><form onSubmit={autenticar}><fieldset className="cuenta-campos" disabled={ocupado}><label>{t('Correo electrónico','Helbide elektronikoa')}<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>{modo!=='recuperar'&&<label>{t('Contraseña','Pasahitza')}<input type="password" required minLength={modo==='registro'?10:undefined} autoComplete={modo==='registro'?'new-password':'current-password'} value={clave} onChange={e=>setClave(e.target.value)}/>{modo==='registro'&&<small>{t('Al menos 10 caracteres.','Gutxienez 10 karaktere.')}</small>}</label>}<button className="boton principal">{ocupado?t('Un momento…','Itxaron…'):modo==='registro'?t('Crear cuenta','Kontua sortu'):modo==='recuperar'?t('Enviar enlace','Esteka bidali'):t('Entrar','Sartu')}<ArrowRight size={17}/></button></fieldset></form>{modo==='entrar'&&<button className="enlace-boton" disabled={ocupado} onClick={()=>cambiarModo('recuperar')}>{t('He olvidado mi contraseña','Pasahitza ahaztu dut')}</button>}
 {googleHabilitado&&modo!=='recuperar'&&<button className="boton secundario cuenta-google" disabled={ocupado} onClick={()=>ejecutar(async()=>{const {error}=await supabase!.auth.signInWithOAuth({provider:'google',options:{redirectTo:redireccion}});if(error)throw error;})}>{t('Continuar con Google','Jarraitu Googlerekin')}</button>}
 <div className="cuenta-alternativa"><button disabled={ocupado} onClick={()=>cambiarModo(modo==='entrar'?'registro':'entrar')}>{modo==='entrar'?t('¿Es tu primera vez? Crea una cuenta','Lehen aldia? Sortu kontua'):t('Ya tengo cuenta. Entrar','Badut kontua. Sartu')}</button></div><Link className="cuenta-legal" to="/privacidad">{t('Privacidad y condiciones de prueba','Pribatutasuna eta proba baldintzak')}</Link></>}
 {avisos}</>}
 </div></section>;
}
