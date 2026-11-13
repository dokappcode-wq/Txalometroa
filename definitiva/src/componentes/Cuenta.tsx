import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
export default function Cuenta({t}:{t:(es:string,eu:string)=>string}){
 const [sesion,setSesion]=useState<Session|null>(null),[modo,setModo]=useState('entrar');
 const [email,setEmail]=useState(''),[clave,setClave]=useState(''),[nombre,setNombre]=useState(''),[privado,setPrivado]=useState(true);
 const [mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false);
 useEffect(()=>{if(!supabase)return;let activo=true;supabase.auth.getSession().then(({data,error})=>{if(activo){setSesion(data.session);if(error)setMensaje(error.message);}});const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSesion(s));return()=>{activo=false;data.subscription.unsubscribe();};},[]);
 useEffect(()=>{if(!supabase||!sesion)return;let activo=true;supabase.from('perfiles').select('nombre,privado').eq('id',sesion.user.id).single().then(({data,error})=>{if(!activo)return;if(error)setMensaje(error.message);if(data){setNombre(data.nombre);setPrivado(data.privado);}});return()=>{activo=false;};},[sesion]);
 async function enviar(e:React.FormEvent){e.preventDefault();if(!supabase)return;setOcupado(true);setMensaje('');try{
 if(sesion){const {error}=await supabase.from('perfiles').update({nombre,privado}).eq('id',sesion.user.id);if(error)throw error;setMensaje(t('Perfil guardado.','Profila gordeta.'));}
 else if(modo==='registro'){const {error}=await supabase.auth.signUp({email,password:clave,options:{emailRedirectTo:location.origin+'/perfil'}});if(error)throw error;setMensaje(t('Revisa tu correo para confirmar la cuenta.','Begiratu posta kontua baieztatzeko.'));}
 else {const {error}=await supabase.auth.signInWithPassword({email,password:clave});if(error)throw error;}
 }catch(e){setMensaje(e instanceof Error?e.message:t('No se pudo completar.','Ezin izan da osatu.'));}finally{setOcupado(false);}}
 return <section className="pendiente"><span className="antetitulo">{t('TU ESPACIO','ZURE GUNEA')}</span><h1>{sesion?t('Tu perfil.','Zure profila.'):t('Tu historia empieza aquí.','Zure istorioa hemen hasten da.')}</h1>
 {!supabase?<p role="status">{t('Estamos preparando el servicio de cuentas. El registro estará disponible cuando se conecte la base de datos de Hika.','Kontuen zerbitzua prestatzen ari gara. Erregistroa Hikaren datu-basea konektatzean egongo da erabilgarri.')}</p>:<form onSubmit={enviar} style={{display:'grid',gap:18,width:'min(100%,360px)',textAlign:'left'}}>
 {sesion?<><label>{t('Nombre','Izena')}<input required maxLength={80} value={nombre} onChange={e=>setNombre(e.target.value)} style={{display:'block',width:'100%',padding:12}}/></label><label><input type="checkbox" checked={privado} onChange={e=>setPrivado(e.target.checked)}/>{t('Perfil privado','Profil pribatua')}</label></>:<><label>Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',padding:12}}/></label><label>{t('Contraseña','Pasahitza')}<input type="password" required minLength={10} autoComplete={modo==='registro'?'new-password':'current-password'} value={clave} onChange={e=>setClave(e.target.value)} style={{display:'block',width:'100%',padding:12}}/></label></>}
 <button disabled={ocupado} className="boton principal">{ocupado?t('Guardando…','Gordetzen…'):sesion?t('Guardar perfil','Profila gorde'):modo==='registro'?t('Crear cuenta','Kontua sortu'):t('Entrar','Sartu')}</button>
 {!sesion&&<button type="button" onClick={()=>{setModo(modo==='registro'?'entrar':'registro');setMensaje('');}}>{modo==='registro'?t('Ya tengo cuenta','Badut kontua'):t('Crear una cuenta','Kontua sortu')}</button>}
 {sesion&&<button type="button" onClick={async()=>{const {error}=await supabase!.auth.signOut();if(error)setMensaje(error.message);}}>{t('Cerrar sesión','Saioa itxi')}</button>}
 <p role="status">{mensaje}</p></form>}</section>;
}
