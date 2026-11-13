import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleUserRound, Clock3, Globe2, Heart, LayoutGrid, Menu, Search, Sparkles, Star, Ticket, Users, WifiOff, X } from 'lucide-react';
import { catalogo, filtrarObras, anioMadrid, aniosWrapped } from './lib/catalogo';
import type { Idioma, Obra } from './lib/catalogo';
import estadisticas from './datos/estadisticas.json';
import preguntas from './datos/preguntas.json';
import { Marca, Mascaras, Medidor } from './componentes/Marca';

type Texto = (es: string, eu: string) => string;
const fases = [
  ['Base visual y catálogo', 'Ikusizko oinarria eta katalogoa', 'Navegación, obras, fichas, búsqueda y dos idiomas.', 'Nabigazioa, obrak, fitxak, bilaketa eta bi hizkuntza.'],
  ['Cuentas y datos compartidos', 'Kontuak eta datu partekatuak', 'Registro, acceso, perfiles, privacidad y base de datos.', 'Erregistroa, saioa, profilak, pribatutasuna eta datu-basea.'],
  ['Valoraciones e historial', 'Balorazioak eta historia', 'Máscaras, emociones, textos, borradores y estadísticas.', 'Maskarak, emozioak, testuak, zirriborroak eta estatistikak.'],
  ['Comunidad y moderación', 'Komunitatea eta moderazioa', 'Seguimientos, muro, comentarios, avisos y denuncias.', 'Jarraipenak, horma, iruzkinak, jakinarazpenak eta salaketak.'],
  ['Constelación y Wrapped anual', 'Konstelazioa eta urteko Wrapped-a', 'Tu mapa de obras y resúmenes por año natural para compartir.', 'Zure obren mapa eta partekatzeko urte naturaleko laburpenak.'],
  ['Gestión de Hika y WordPress', 'Hikaren kudeaketa eta WordPress', 'Administración, informes y reseñas automáticas en la web.', 'Administrazioa, txostenak eta webeko balorazio automatikoak.'],
  ['Piloto y publicación', 'Proba pilotua eta argitalpena', 'Pruebas completas, accesibilidad, seguridad y lanzamiento.', 'Proba osoak, irisgarritasuna, segurtasuna eta abiaraztea.'],
];

function idiomaInicial(): Idioma {
  try { const v = localStorage.getItem('txalo-definitiva-idioma'); if (v === 'eu' || v === 'es') return v; } catch { /* Idioma sin almacenamiento disponible. */ }
  return navigator.language.startsWith('eu') ? 'eu' : 'es';
}
export default function App() {
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial);
  const [menu, setMenu] = useState(false);
  const [sinRed, setSinRed] = useState(!navigator.onLine);
  const dialogo = useRef<HTMLDialogElement>(null);
  const localizacion = useLocation();
  const t: Texto = (es, eu) => idioma === 'es' ? es : eu;
  useEffect(() => {
    document.documentElement.lang = idioma;
    try { localStorage.setItem('txalo-definitiva-idioma', idioma); } catch { /* Preferencia no persistida. */ }
  }, [idioma]);
  useEffect(() => {
    setMenu(false); window.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>('#contenido')?.focus({ preventScroll: true });
  }, [localizacion.pathname]);
  useEffect(() => {
    const actualizar = () => setSinRed(!navigator.onLine);
    window.addEventListener('online', actualizar); window.addEventListener('offline', actualizar);
    return () => { window.removeEventListener('online', actualizar); window.removeEventListener('offline', actualizar); };
  }, []);
  const navegacion = [
    { ruta: '/', es: 'Obras', eu: 'Obrak', icono: LayoutGrid },
    { ruta: '/comunidad', es: 'Comunidad', eu: 'Komunitatea', icono: Users },
    { ruta: '/constelacion', es: 'Mi constelación', eu: 'Nire konstelazioa', icono: Sparkles },
    { ruta: '/wrapped', es: 'Wrapped', eu: 'Wrapped', icono: Star },
  ];
  return <>
    <a className="saltar" href="#contenido">{t('Saltar al contenido', 'Edukira joan')}</a>
    <aside className="lateral">
      <Link to="/" className="marca" aria-label="Txalometroa · Hika Teatroa"><Marca /><span>hika<span>TEATROA</span></span></Link>
      <div className="nombre-app">TXALOMETROA<span>{t('El eco de tus aplausos', 'Zure txaloen oihartzuna')}</span></div>
      <nav aria-label={t('Principal', 'Nagusia')}>{navegacion.map(({ ruta, es, eu, icono: Icono }) => <NavLink key={ruta} to={ruta} end={ruta === '/'}><Icono size={19} />{t(es, eu)}<span className="indicador" /></NavLink>)}</nav>
      <div className="lateral-inferior"><Link to="/butacas" className="butacas-link"><Ticket size={19} />{t('Butacas', 'Butakak')}<span>{t('Pronto', 'Laster')}</span></Link><Link to="/perfil" className="perfil-link"><CircleUserRound size={30} /><span>{t('Tu espacio', 'Zure gunea')}<small>{t('Una historia muy tuya', 'Zure istorio propioa')}</small></span><ArrowUpRight size={17} /></Link><span className="sello">HIKA TEATROA · DONOSTIA</span></div>
    </aside>
    <div className="app">
      <div className="revision"><span><i />{t('Versión en desarrollo', 'Garapen bertsioa')} <b>· {t('Fase 1', '1. fasea')}</b></span><button onClick={() => dialogo.current?.showModal()}>{t('Ver las fases', 'Faseak ikusi')}<ArrowUpRight size={13} /></button></div>
      <header className="cabecera"><Link to="/" className="cabecera-marca"><Marca /><span>TXALOMETROA</span></Link><span className="cabecera-frase">{t('El teatro continúa después del aplauso.', 'Antzerkiak txaloen ondoren jarraitzen du.')}</span><div className="cabecera-acciones"><div className="idiomas" role="group" aria-label={t('Idioma', 'Hizkuntza')}><Globe2 size={15} />{(['eu', 'es'] as Idioma[]).map(i => <button key={i} lang={i} aria-pressed={idioma === i} onClick={() => setIdioma(i)}>{i.toUpperCase()}</button>)}</div><button className="menu-boton" aria-label={t('Abrir menú', 'Menua ireki')} onClick={() => setMenu(!menu)} aria-expanded={menu}>{menu ? <X /> : <Menu />}</button><Link to="/perfil" className="usuario-boton" aria-label={t('Tu espacio', 'Zure gunea')}><CircleUserRound size={23} /></Link></div></header>
      {menu && <nav className="menu-movil" aria-label={t('Más secciones', 'Atal gehiago')}><Link to="/comunidad">{t('Comunidad', 'Komunitatea')}<Users size={18} /></Link><Link to="/butacas">{t('Butacas · Próximamente', 'Butakak · Laster')}<Ticket size={18} /></Link></nav>}
      {sinRed && <div className="sin-red" role="status"><WifiOff size={16} />{t('Sin conexión. Algunas imágenes y enlaces pueden no estar disponibles.', 'Konexiorik gabe. Baliteke irudi eta esteka batzuk erabilgarri ez egotea.')}</div>}
      <main id="contenido" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Catalogo idioma={idioma} t={t} />} />
          <Route path="/obra/:slug" element={<Ficha idioma={idioma} t={t} />} />
          <Route path="/wrapped" element={<Pendiente tipo="wrapped" t={t} />} />
          <Route path="/constelacion" element={<Pendiente tipo="constelacion" t={t} />} />
          <Route path="/comunidad" element={<Pendiente tipo="comunidad" t={t} />} />
          <Route path="/perfil" element={<Pendiente tipo="perfil" t={t} />} />
          <Route path="/butacas" element={<Pendiente tipo="butacas" t={t} />} />
          <Route path="*" element={<div className="no-encontrado"><span className="antetitulo">404</span><h1>{t('Aquí ha caído el telón.', 'Hemen oihala jaitsi da.')}</h1><p>{t('No encontramos esta página.', 'Ez dugu orri hau aurkitu.')}</p><Link className="boton principal" to="/">{t('Volver a las obras', 'Obretara itzuli')}<ArrowRight size={17} /></Link></div>} />
        </Routes>
      </main>
      <footer className="pie"><span>HIKA TEATROA <span className="estrella">✳</span> TXALOMETROA</span><span>{t('Hecho de teatro. Hecho de ti.', 'Antzerkiz egina. Zurekin egina.')}</span><a href="https://hikateatroa.eus" target="_blank" rel="noreferrer">hikateatroa.eus<ArrowUpRight size={14} /></a></footer>
    </div>
    <nav className="inferior" aria-label={t('Navegación móvil', 'Mugikorreko nabigazioa')}>{[navegacion[0], navegacion[2], navegacion[3], { ruta: '/perfil', es: 'Mi espacio', eu: 'Nire gunea', icono: CircleUserRound }].map(({ruta,es,eu,icono: Icono}) => <NavLink key={ruta} to={ruta} end={ruta==='/'}><Icono size={21} /><span>{t(es, eu)}</span></NavLink>)}</nav>
    <dialog ref={dialogo} className="dialogo" aria-labelledby="fases-titulo" onClick={e => { if (e.target === e.currentTarget) dialogo.current?.close(); }}><div className="dialogo-cabecera"><div><span className="antetitulo">TXALOMETROA</span><h2 id="fases-titulo">{t('La app, paso a paso.', 'Appa, pausoz pauso.')}</h2></div><button className="icono-boton" aria-label={t('Cerrar', 'Itxi')} onClick={() => dialogo.current?.close()}><X /></button></div><p>{t('Revisamos cada fase contigo antes de avanzar a la siguiente.', 'Fase bakoitza zurekin berrikusiko dugu hurrengora igaro aurretik.')}</p><ol className="fases">{fases.map((f,i)=><li key={f[0]} className={i===0?'fase-actual':''}><span className="numero-fase">{i===0?<Check size={17}/>:i+1}</span><div><strong>{t(f[0],f[1])}</strong><p>{t(f[2],f[3])}</p>{i===0&&<small>{t('Disponible para revisión', 'Berrikusteko erabilgarri')}</small>}</div></li>)}</ol><p className="nota-dialogo"><Ticket size={17}/>{t('Butacas queda aplazado, fuera de estas fases.', 'Butakak gerorako utziko da, fase hauetatik kanpo.')}</p></dialog>
  </>;
}

function Foto({ obra, clase = '' }: { obra: Obra; clase?: string }) {
  const [fallo, setFallo] = useState(false);
  return fallo ? <div className={`foto-fallback ${clase}`} aria-label={obra.es}><Marca /><span>{obra.es}</span></div> : <img className={clase} src={`/obras/${obra.id}.jpg`} alt="" loading="lazy" onError={() => setFallo(true)} />;
}
function Tarjeta({ obra, idioma, t }: { obra: Obra; idioma: Idioma; t: Texto }) {
  const datos = estadisticas.obras.find(o => o.id === obra.txalometroa);
  const visible = datos && datos.n >= estadisticas.minimo;
  const genero = catalogo.generos[obra.genero as keyof typeof catalogo.generos];
  return <Link className="tarjeta" to={`/obra/${obra.id}`}><div className="tarjeta-foto"><Foto obra={obra} /><span className="chip-genero"><i style={{background:genero.color}}/>{genero[idioma]}</span><span className="tarjeta-flecha"><ArrowUpRight size={21}/></span>{visible && <Medidor nota={datos.nota} idioma={idioma}/>}</div><div className="tarjeta-texto"><span className="tarjeta-anio">HIKA TEATROA <span>· {obra.urtea}</span></span><h3>{obra[idioma]}</h3><span className="tarjeta-subtitulo">{visible ? `${datos.n} ${t('valoraciones', 'balorazio')}` : obra.txalometroa ? t('Esperando más aplausos', 'Txalo gehiagoren zain') : t('Una historia de nuestro repertorio', 'Gure errepertorioko istorio bat')}</span></div></Link>;
}
function Catalogo({ idioma, t }: { idioma: Idioma; t: Texto }) {
  const [params,setParams] = useSearchParams();
  const busqueda=params.get('q')||'', genero=params.get('genero')||'todos', grupo=params.get('grupo')||'activas';
  const cambiar = (clave:string,valor:string) => { const p=new URLSearchParams(params); if(valor) p.set(clave,valor); else p.delete(clave); setParams(p,{replace:true,preventScrollReset:true}); };
  const obras=filtrarObras(catalogo.obras,busqueda,genero,grupo);
  const destacada=catalogo.obras[0];
  const filtra=busqueda||genero!=='todos';
  return <>
    <section className="hero"><div className="hero-texto"><span className="antetitulo"><span/> {t('EL ESCENARIO ES SOLO EL PRINCIPIO', 'ESZENATOKIA HASIERA BESTERIK EZ DA')}</span><h1>{t('Lo que ves.', 'Ikusten duzuna.')}<br/>{t('Lo que sientes.', 'Sentitzen duzuna.')}<br/><span>{t('Lo que queda.', 'Geratzen dena.')}</span></h1><p>{t('Hay obras que se quedan contigo. Descubre el teatro de Hika y la huella que deja en su público.', 'Zurekin geratzen diren obrak daude. Ezagutu Hikaren antzerkia eta publikoarengan uzten duen arrastoa.')}</p><a href="#obras" className="boton principal">{t('Explorar las obras', 'Obrak ezagutu')}<ArrowDown size={18}/></a><div className="hero-firma"><span className="estrella">✳</span>{t('Tu mirada también forma parte de la obra.', 'Zure begirada ere obraren parte da.')}</div></div><Link to={`/obra/${destacada.id}`} className="hero-imagen" aria-label={`${t('Descubrir', 'Ezagutu')} ${destacada[idioma]}`}><Foto obra={destacada}/><div className="hero-imagen-superior"><span className="chip-claro">{t('EN EL FOCO', 'FOKUAN')}</span><span>01 / 04</span></div><div className="hero-imagen-inferior"><span>{t('Danza, memoria y resistencia', 'Dantza, memoria eta erresistentzia')}</span><div><h2>{destacada[idioma]}</h2><span className="circulo-flecha"><ArrowUpRight size={30}/></span></div><p>{t('Una obra de Hika Teatroa', 'Hika Teatroaren obra bat')} · {destacada.urtea}</p></div></Link></section>
    <section id="obras" className="catalogo"><div className="titulo-seccion"><div><span className="antetitulo">{t('HISTORIAS QUE NOS ENCUENTRAN', 'AURKITZEN GAITUZTEN ISTORIOAK')}</span><h2>{t('Encuentra tu próxima obra.', 'Aurkitu zure hurrengo obra.')}</h2></div><span className="contador-catalogo">{catalogo.obras.length} {t('historias, muchas miradas', 'istorio, begirada asko')}</span></div>
      <div className="herramientas"><div className="filtros-grupo" role="group" aria-label={t('Tipo de obras', 'Obra mota')}>{[['activas','En el Txalometroa','Txalometroan'],['repertorio','Repertorio','Errepertorioa'],['todas','Todas','Guztiak']].map(([valor,es,eu])=><button key={valor} aria-pressed={grupo===valor} onClick={()=>cambiar('grupo',valor)}>{t(es,eu)}{grupo===valor&&<span>{catalogo.obras.filter(o=>valor==='todas'||(valor==='activas'?o.txalometroa:!o.txalometroa)).length}</span>}</button>)}</div><div className="busqueda-filtros"><label className="buscador"><Search size={17}/><input aria-label={t('Buscar obra', 'Obra bilatu')} placeholder={t('Buscar una obra…', 'Obra bat bilatu…')} value={busqueda} onChange={e=>cambiar('q',e.target.value)}/>{busqueda&&<button aria-label={t('Borrar búsqueda', 'Bilaketa garbitu')} onClick={()=>cambiar('q','')}><X size={15}/></button>}</label><label className="select-genero"><span className="solo-lector">{t('Filtrar por género', 'Generoaren arabera iragazi')}</span><select value={genero} onChange={e=>cambiar('genero',e.target.value)}><option value="todos">{t('Todos los géneros', 'Genero guztiak')}</option>{Object.entries(catalogo.generos).map(([id,g])=><option key={id} value={id}>{g[idioma]}</option>)}</select><ChevronDown size={14}/></label></div></div>
      <div className="resultados" role="status">{filtra&&`${obras.length} ${t('obras encontradas','obra aurkitu dira')}`}</div>
      {obras.length ? <div className="rejilla">{obras.map(obra=><Tarjeta key={obra.id} obra={obra} idioma={idioma} t={t}/>)}</div> : <div className="vacio-busqueda"><Search size={34}/><h3>{t('Esa historia aún no aparece.', 'Istorio hori ez da agertu oraindik.')}</h3><p>{t('Prueba con otro título o cambia los filtros.', 'Saiatu beste izenburu batekin edo aldatu iragazkiak.')}</p><button className="boton secundario" onClick={()=>setParams({grupo:'todas'})}>{t('Ver todas las obras', 'Obra guztiak ikusi')}<ArrowRight size={17}/></button></div>}
      <p className="fuente-datos"><Clock3 size={13}/>{t('Valoraciones del histórico de Hika hasta el 19 de octubre de 2026. Las notas se muestran a partir de 10 respuestas.', 'Hikaren balorazio historikoak, 2026ko urriaren 19ra arte. Notak 10 erantzunetik aurrera erakusten dira.')}</p>
    </section>
    <section className="avance"><div className="avance-dibujo" aria-hidden="true"><svg viewBox="0 0 300 180"><path d="M35 140L105 45L175 95L255 30M105 45L240 150L175 95" fill="none" stroke="#918c7b" strokeWidth="1"/>{[[35,140,5],[105,45,9],[175,95,6],[255,30,5],[240,150,8]].map(([x,y,r],i)=><circle key={x} cx={x} cy={y} r={r} fill={i===1?'#e34531':'#efe6cf'}/>)}<circle cx="105" cy="45" r="17" fill="none" stroke="#e34531" opacity=".4"/></svg></div><div><span className="antetitulo">{t('PRÓXIMAMENTE · TU CONSTELACIÓN', 'LASTER · ZURE KONSTELAZIOA')}</span><h2>{t('Cada obra, una estrella.', 'Obra bakoitza, izar bat.')}</h2><p>{t('Las historias que has vivido dibujarán un universo que solo puede ser tuyo.', 'Bizi izan dituzun istorioek zurea bakarrik izan daitekeen unibertsoa marraztuko dute.')}</p></div><Link to="/constelacion" className="circulo-flecha" aria-label={t('Descubrir mi constelación', 'Nire konstelazioa ezagutu')}><ArrowUpRight size={25}/></Link></section>
  </>;
}

function Ficha({idioma,t}:{idioma:Idioma;t:Texto}) {
  const location=useLocation();
  const slug=decodeURIComponent(location.pathname.split('/').pop()||'');
  const obra=catalogo.obras.find(o=>o.id===slug);
  useEffect(()=>{document.title=obra?`${obra[idioma]} · Txalometroa`:'Txalometroa · Hika Teatroa';return()=>{document.title='Txalometroa · Hika Teatroa';};},[obra,idioma]);
  if(!obra)return <div className="no-encontrado"><h1>{t('Obra no encontrada', 'Ez da obra aurkitu')}</h1><Link className="boton principal" to="/">{t('Ver catálogo', 'Katalogoa ikusi')}<ArrowRight size={18}/></Link></div>;
  const datos=estadisticas.obras.find(o=>o.id===obra.txalometroa);
  const visible=datos && datos.n>=estadisticas.minimo;
  const genero=catalogo.generos[obra.genero as keyof typeof catalogo.generos];
  return <article className="ficha"><Link to="/" className="volver"><ArrowLeft size={16}/>{t('Todas las obras', 'Obra guztiak')}</Link><div className="ficha-principal"><div className="ficha-foto"><Foto obra={obra}/><span className="chip-claro">HIKA TEATROA · {obra.urtea}</span></div><div className="ficha-presentacion"><span className="antetitulo">{genero[idioma]} <span>· {obra.urtea}</span></span><h1>{obra[idioma]}</h1>{obra.es!==obra.eu&&<p className="otro-titulo">{obra[idioma==='es'?'eu':'es']}</p>}<p className="presentacion-obra">{t('Una historia de Hika Teatroa. Descubre la obra y cómo la ha vivido su público.', 'Hika Teatroaren istorio bat. Ezagutu obra eta publikoak nola bizi izan duen.')}</p><a className="boton principal" href={obra.url} target="_blank" rel="noreferrer">{t('Conocer la obra en Hika', 'Obra Hikaren webgunean')}<ArrowUpRight size={18}/></a><p className="valoracion-pendiente"><Heart size={16}/>{t('Podrás compartir tu valoración en la fase 3.', 'Zure balorazioa partekatu ahal izango duzu 3. fasean.')}</p></div></div><section className="opiniones"><div className="titulo-seccion"><div><span className="antetitulo">{t('LA MIRADA DEL PÚBLICO', 'PUBLIKOAREN BEGIRADA')}</span><h2>{t('Lo que dejó esta obra.', 'Obra honek utzitakoa.')}</h2></div><span className="etiqueta-historico">{t('Datos históricos', 'Datu historikoak')}</span></div>{visible ? <div className="panel-notas"><div className="nota-global"><Medidor nota={datos.nota} idioma={idioma} grande/><div><h3>{t('La nota del público', 'Publikoaren nota')}</h3><p>{datos.n} {t('valoraciones', 'balorazio')}</p><span>{datos.recomendaria}% {t('la recomendaría', 'gomendatuko luke')}</span></div></div><div className="notas-preguntas">{(['GAL1','GAL2','GAL3','GAL4'] as const).map(g=><div key={g}><span>{preguntas[g][idioma]}</span><Mascaras nota={datos.preguntas[g].media??0}/><b>{datos.preguntas[g].media?.toLocaleString(idioma,{maximumFractionDigits:2})??'—'}</b></div>)}</div></div> : <div className="faltan-notas"><Marca/><div><h3>{t('Cada aplauso cuenta.', 'Txalo bakoitzak balio du.')}</h3><p>{datos ? t('Publicaremos la nota cuando esta obra reúna al menos 10 valoraciones.', 'Nota argitaratuko dugu obra honek gutxienez 10 balorazio jasotzen dituenean.') : t('Esta obra forma parte del repertorio. Todavía no tiene valoraciones públicas.', 'Obra hau errepertorioaren parte da. Oraindik ez du balorazio publikorik.')}</p></div></div>}<p className="fuente-datos">{t('La nota combina satisfacción, trama, reparto y recomendación. Datos hasta el 19/10/2026.', 'Notak gogobetetzea, trama, aktoreak eta gomendioa uztartzen ditu. 2026/10/19ra arteko datuak.')}</p></section><div className="mas-obras"><h2>{t('Más historias de Hika.', 'Hikaren istorio gehiago.')}</h2><div className="rejilla">{catalogo.obras.filter(o=>o.id!==obra.id).slice(0,3).map(o=><Tarjeta key={o.id} obra={o} idioma={idioma} t={t}/>)}</div></div></article>;
}

function Pendiente({tipo,t}:{tipo:'wrapped'|'constelacion'|'comunidad'|'perfil'|'butacas';t:Texto}) {
  const actual=anioMadrid(new Date());
  const [anio,setAnio]=useState(actual);
  const textos={
    wrapped:{icono:Star,titulo:t('Tu año merece un aplauso.', 'Zure urteak txalo bat merezi du.'),descripcion:t('Las obras que te acompañaron, tus emociones y tus descubrimientos. Un Wrapped para cada año natural.', 'Zurekin egon diren obrak, emozioak eta aurkikuntzak. Wrapped bat urte natural bakoitzerako.'),fase:5},
    constelacion:{icono:Sparkles,titulo:t('Un universo de historias vividas.', 'Bizitako istorioen unibertsoa.'),descripcion:t('Cada obra que valores será una estrella. Su género, tu nota y lo que sentiste dibujarán tu constelación personal.', 'Baloratzen duzun obra bakoitza izar bat izango da. Generoak, zure notak eta sentitu duzunak zure konstelazioa marraztuko dute.'),fase:5},
    comunidad:{icono:Users,titulo:t('El teatro también nos encuentra.', 'Antzerkiak ere aurkitzen gaitu.'),descripcion:t('Un lugar para descubrir otras miradas, seguir a personas y conversar sobre las obras que os unen.', 'Beste begirada batzuk ezagutzeko, pertsonei jarraitzeko eta elkartzen zaituzteten obrei buruz hitz egiteko lekua.'),fase:4},
    perfil:{icono:CircleUserRound,titulo:t('Tu historia empieza aquí.', 'Zure istorioa hemen hasten da.'),descripcion:t('Tu perfil reunirá tus valoraciones y las obras que has vivido. Podrás elegir qué compartir y qué guardar para ti.', 'Zure profilak balorazioak eta bizi izan dituzun obrak bilduko ditu. Zer partekatu eta zer zeuretzat gorde aukeratu ahal izango duzu.'),fase:2},
    butacas:{icono:Ticket,titulo:t('Tu sitio está por llegar.', 'Zure lekua iristear dago.'),descripcion:t('La experiencia de butacas llegará más adelante. Mientras tanto, descubre las obras de Hika.', 'Butaken esperientzia aurrerago iritsiko da. Bitartean, ezagutu Hikaren obrak.'),fase:0},
  }[tipo];
  const Icono=textos.icono;
  return <section className={`pendiente pendiente-${tipo}`}><div className="pendiente-adorno" aria-hidden="true"><Icono size={64} strokeWidth={1}/><span>✳</span></div><span className="antetitulo">{t('PRÓXIMAMENTE', 'LASTER')}{textos.fase>0&&` · ${t('FASE', 'FASEA')} ${textos.fase}`}</span><h1>{textos.titulo}</h1><p>{textos.descripcion}</p>{tipo==='wrapped'&&<div className="anio-wrapped"><label htmlFor="anio">{t('Tu año de teatro', 'Zure antzerki urtea')}</label><select id="anio" value={anio} onChange={e=>setAnio(Number(e.target.value))}>{aniosWrapped(actual).map(a=><option key={a} value={a}>{a}</option>)}</select><span>{t(`Del 1 de enero al 31 de diciembre de ${anio}`, `${anio}ko urtarrilaren 1etik abenduaren 31ra`)}</span><small>{anio===actual?t('Año en curso · El resumen se completará al cerrar el año.', 'Urtea abian · Laburpena urtea amaitzean osatuko da.'):t('El resumen de este año estará disponible en la fase 5.', 'Urte honetako laburpena 5. fasean egongo da erabilgarri.')}</small></div>}<Link className="boton principal" to="/">{t('Descubrir las obras', 'Obrak ezagutu')}<ArrowRight size={18}/></Link></section>;
}
