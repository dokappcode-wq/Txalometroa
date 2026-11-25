// ================================================================ Cuenta y feed

const cuentaDialogo = document.getElementById("kontu-dialogoa");
const opinionDialogo = document.getElementById("baloratu");
const comentariosDialogo = document.getElementById("komentarioak");
let hilo = null;
const TAM_PAGINA = 20;
let conexionCuenta, usuario = null, modoAlta = false;
let feed = { filas: [], hayMas: false };
let borrador = null;

function conectarCuentas() {
  if (!KONTU_KONFIG) return Promise.reject(new Error("konfiguratuGabe"));
  conexionCuenta ||= (async () => {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/+esm");
    const supabase = createClient(KONTU_KONFIG.url, KONTU_KONFIG.clave, {
      auth: { detectSessionInUrl: false, storageKey: "txalometroa-cuenta" },
    });
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    cambiarUsuario(data.session);
    supabase.auth.onAuthStateChange((evento, sesion) => cambiarUsuario(sesion));
    return supabase;
  })().catch(error => {
    conexionCuenta = null;
    throw error;
  });
  return conexionCuenta;
}

function cambiarUsuario(sesion) {
  const anterior = usuario?.id;
  usuario = sesion?.user ?? null;
  if (usuario?.id === anterior) return;
  feed = { filas: [], hayMas: false };
  if (comentariosDialogo.open) comentariosDialogo.close();
  if (vista.nombre === "jarioa") {
    pintarJarioa();
    // El cliente de Auth puede tener el bloqueo de sesión durante el callback.
    if (usuario) setTimeout(() => { if (vista.nombre === "jarioa") cargarJarioa(); }, 0);
  } else {
    const boton = document.getElementById("kontua");
    boton.setAttribute("aria-label", usuario ? t().kontua : t().sartu);
  }
  if (cuentaDialogo.open && !cuentaDialogo.dataset.ocupado) pintarCuenta();
}

function cabeceraDialogo(accion, titulo, id) {
  return `<button type="button" class="atzera" ${accion} aria-label="${t().itxi}">${ICONOS.itxi}</button>
    <h2 class="titulua" id="${id}">${esc(titulo)}</h2>`;
}

function pintarCuenta() {
  const tx = t(), titulo = usuario ? tx.kontua : modoAlta ? tx.alta : tx.sartu;
  let contenido;
  if (!KONTU_KONFIG) {
    contenido = `<p class="azalpena">${tx.konfiguratuGabe}</p>`;
  } else if (usuario) {
    contenido = `<p class="azalpena">${esc(usuario.email)}</p>
      <button type="button" class="botoia" data-cerrar-sesion>${tx.irten}</button>`;
  } else {
    contenido = `<form id="form-cuenta"><fieldset>
      <label>${tx.email}<input type="email" name="email" required autocomplete="username" autocapitalize="none" spellcheck="false"></label>
      <label>${tx.pasahitza}<input type="password" name="password" required
        ${modoAlta ? 'minlength="8" autocomplete="new-password" aria-describedby="pasahitz-argibidea"' : 'autocomplete="current-password"'}></label>
      ${modoAlta ? `<p id="pasahitz-argibidea" class="azalpena">${tx.pasahitzLuzera}</p>` : ""}
      <div class="ekintzak">
        <button type="submit" class="botoia">${titulo}</button>
        <button type="button" class="botoia marino" data-modo-cuenta>${modoAlta ? tx.sartu : tx.alta}</button>
      </div></fieldset></form>`;
  }
  cuentaDialogo.innerHTML = `<div class="edukia">${cabeceraDialogo("data-cerrar-cuenta", titulo, "kontu-titulua")}
    ${contenido}<p class="oharra" role="status"></p></div>`;
}

function abrirCuenta() {
  modoAlta = false;
  pintarCuenta();
  cuentaDialogo.showModal();
  conectarCuentas().catch(() => {});
}

function cambiarModoCuenta() {
  const correo = cuentaDialogo.querySelector("[name=email]").value;
  modoAlta = !modoAlta;
  pintarCuenta();
  const campo = cuentaDialogo.querySelector("[name=email]");
  campo.value = correo;
  campo.focus();
}

function bloquearDialogo(dialogo, ocupado) {
  if (ocupado) dialogo.dataset.ocupado = "true";
  else delete dialogo.dataset.ocupado;
  dialogo.querySelectorAll("button, fieldset").forEach(el => { el.disabled = ocupado; });
}

for (const dialogo of [cuentaDialogo, opinionDialogo, comentariosDialogo]) {
  dialogo.addEventListener("cancel", e => { if (dialogo.dataset.ocupado) e.preventDefault(); });
}
cuentaDialogo.addEventListener("close", () => { cuentaDialogo.innerHTML = ""; });
opinionDialogo.addEventListener("close", () => {
  borrador = null;
  opinionDialogo.innerHTML = "";
});

async function enviarCuenta(form) {
  if (cuentaDialogo.dataset.ocupado) return;
  const datos = new FormData(form);
  const credenciales = { email: datos.get("email").trim(), password: datos.get("password") };
  const errorCuenta = cuentaDialogo.querySelector(".oharra");
  errorCuenta.textContent = "";
  bloquearDialogo(cuentaDialogo, true);
  try {
    const supabase = await conectarCuentas();
    const { data, error } = modoAlta ? await supabase.auth.signUp(credenciales) : await supabase.auth.signInWithPassword(credenciales);
    if (error) throw error;
    if (!data.session) {
      errorCuenta.textContent = t().altaItxaron;
      return;
    }
    cambiarUsuario(data.session);
    cuentaDialogo.close();
    opinionDialogo.querySelector(".oharra")?.replaceChildren();
  } catch (e) {
    errorCuenta.textContent = e.code === "invalid_credentials" ? t().saioErrorea : t().kontuErrorea;
  } finally {
    bloquearDialogo(cuentaDialogo, false);
    if (cuentaDialogo.open && usuario) pintarCuenta();
  }
}

async function cerrarSesion() {
  const aviso = cuentaDialogo.querySelector(".oharra");
  aviso.textContent = "";
  bloquearDialogo(cuentaDialogo, true);
  try {
    const supabase = await conectarCuentas();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    cambiarUsuario(null);
    cuentaDialogo.close();
  } catch (e) {
    aviso.textContent = t().konexioErrorea;
  } finally {
    bloquearDialogo(cuentaDialogo, false);
  }
}

function abrirValorar(id) {
  const obra = obraCat(id);
  if (!obra) return;
  const tx = t();
  borrador = { obra: id, envio: null };
  opinionDialogo.innerHTML = `<div class="edukia">${cabeceraDialogo("data-cerrar-opinion", izena(obra), "iritzia-titulua")}
    <form id="form-opinion"><fieldset>
      ${selectorMascaras()}
      <label>${tx.iritzia}<textarea name="opinion" rows="6" maxlength="2000" required></textarea></label>
      <p class="azalpena">${tx.iritziPublikoa}</p>
      <button type="submit" class="botoia" ${KONTU_KONFIG ? "" : "disabled"}>${tx.argitaratu}</button>
    </fieldset></form>
    <p class="oharra" role="status">${KONTU_KONFIG ? "" : tx.konfiguratuGabe}</p></div>`;
  opinionDialogo.showModal();
}

async function enviarValoracion(form) {
  if (!borrador || !KONTU_KONFIG || opinionDialogo.dataset.ocupado) return;
  const datos = new FormData(form);
  const texto = datos.get("opinion").trim(), nota = Number(datos.get("nota")) || null;
  const aviso = opinionDialogo.querySelector(".oharra");
  const boton = form.querySelector("button");
  if (!navigator.onLine) return mostrarEscena("sin-conexion");
  if (!texto) {
    aviso.textContent = t().iritziHutsa;
    form.elements.opinion.focus();
    return;
  }
  bloquearDialogo(opinionDialogo, true);
  boton.textContent = t().bidaltzen;
  aviso.textContent = "";
  try {
    const supabase = await conectarCuentas();
    if (!usuario) {
      aviso.textContent = t().iritziSartu;
      abrirCuenta();
      return;
    }
    const uid = usuario.id;
    // Se conserva el id si hay que reintentar el mismo envío.
    if (borrador.envio?.texto !== texto || borrador.envio?.usuario_id !== uid || borrador.envio?.nota !== nota) {
      borrador.envio = { id: crypto.randomUUID(), obra_id: borrador.obra, usuario_id: uid, texto, nota, publicada: true };
    }
    const { error } = await supabase.from("opiniones").upsert(borrador.envio, { ignoreDuplicates: true });
    if (error) throw error;
    opinionDialogo.close();
    if (usuario?.id === uid) {
      feed = { filas: [], hayMas: false, publicado: true };
      irA("jarioa");
      document.querySelector("#edukia h1").focus();
    }
  } catch (e) {
    aviso.textContent = t().argitaratuErrorea;
  } finally {
    bloquearDialogo(opinionDialogo, false);
    boton.textContent = t().argitaratu;
  }
}

function vistaJarioa() {
  return `<h1 class="titulua" tabindex="-1">${t().jarioa}</h1><div id="feed-detalle">${contenidoJarioa()}</div>`;
}

function pintarJarioa() {
  document.getElementById("kontua").setAttribute("aria-label", usuario ? t().kontua : t().sartu);
  if (vista.nombre === "jarioa") document.getElementById("feed-detalle").innerHTML = contenidoJarioa();
}

function contenidoJarioa() {
  const tx = t();
  if (!KONTU_KONFIG) return `<p class="azalpena">${tx.konfiguratuGabe}</p>`;
  const estado = feed.error ? `<p class="oharra" role="status">${tx.conexioErrorea}</p>
    <button type="button" class="botoia marino" data-jario-reintentar>${tx.saiatu}</button>`
    : feed.cargando ? `<p class="azalpena" role="status">${tx.kargatzen}</p>`
      : !usuario ? `<p class="azalpena">${tx.jarioSartu}</p><button type="button" class="botoia" data-kontua>${tx.sartu}</button>`
        : feed.hayMas ? `<button type="button" class="botoia marino" data-jario-mas>${tx.jarioGehiago}</button>`
          : !feed.filas.length ? `<p class="azalpena">${tx.jarioHutsik}</p>` : "";
  const tarjetas = feed.filas.map(tarjetaOpinion).join("");
  return `${feed.publicado ? `<p role="status">${tx.argitaratuta}</p>` : ""}
    ${tarjetas ? `<div class="feed-lista">${tarjetas}</div>` : ""}${estado}`;
}

async function cargarJarioa(cargarMas = false) {
  if (!KONTU_KONFIG || feed.cargando) return;
  if (!navigator.onLine) {
    feed.error = true;
    pintarJarioa();
    if (vista.nombre === "jarioa") mostrarEscena("sin-conexion");
    return;
  }
  const actual = feed;
  actual.cargando = true;
  actual.cargarMas = cargarMas;
  actual.error = false;
  pintarJarioa();
  try {
    const supabase = await conectarCuentas();
    if (feed !== actual || !usuario) return;
    const hasta = cargarMas ? actual.filas.at(-1) : null;
    const { data, error } = await supabase.rpc("feed_social", hasta ? {
      antes: hasta.creada_en, id_anterior: hasta.id, autor_anterior: hasta.usuario_id,
    } : {});
    if (error) throw error;
    actual.hayMas = data.length > TAM_PAGINA;
    actual.filas = (hasta ? actual.filas : []).concat(data.slice(0, TAM_PAGINA));
  } catch (e) {
    actual.error = true;
  } finally {
    actual.cargando = false;
    if (feed === actual) pintarJarioa();
  }
}

function selectorMascaras() {
  return `<fieldset><legend>${t().maskaraNota}</legend>
    <div class="maskarak-puntuacion">${Array.from({ length: 10 }, (_, i) => `
      <label><input type="radio" name="nota" value="${i + 1}" aria-label="${i + 1}/10">
        <span aria-hidden="true">${svgMascara(K_MASCARA[Math.floor(i / 2)], i % 2 ? 1 : .5)}${i + 1}</span></label>`).join("")}</div>
    <label class="maskara-gabe"><span><input type="radio" name="nota" value="" checked> ${t().maskaraGabe}</span></label>
    </fieldset>`;
}

const claveOpinion = o => `${o.usuario_id}/${o.id}`;
const aliasAutor = id => `${t().ikuslea} · ${id.slice(0, 8)}`;
const buscarOpinion = clave => feed.filas.find(o => claveOpinion(o) === clave);
const etiquetaLike = o => `${o.gustado ? "♥" : "♡"} ${t().gustuko} · ${o.likes}`;

function tarjetaOpinion(o) {
  const obra = obraCat(o.obra_id), clave = claveOpinion(o);
  return `<article class="iritzia">
    <h2>${esc(obra ? izena(obra) : o.obra_id)}</h2>
    <small>${esc(aliasAutor(o.usuario_id))} · <time datetime="${esc(o.creada_en)}">${fecha(new Date(o.creada_en))}</time></small>
    ${obra?.imagen ? `<img class="feed-cartel" loading="lazy" src="${esc(obra.imagen)}" alt="">` : ""}
    ${o.nota ? `<div aria-label="${o.nota}/10">${htmlMaskaraNeurria(o.nota)}<b>${o.nota}/10</b></div>` : ""}
    <p>${esc(o.texto)}</p>
    <div class="feed-acciones">
      <button type="button" data-like="${esc(clave)}" aria-pressed="${o.gustado}">${etiquetaLike(o)}</button>
      <button type="button" data-comentarios="${esc(clave)}">${t().iruzkinak} · ${o.comentarios}</button>
    </div><p class="oharra" role="status"></p>
  </article>`;
}

async function cambiarLike(boton) {
  const opinion = buscarOpinion(boton.dataset.like);
  if (!opinion || !usuario || boton.disabled) return;
  if (!navigator.onLine) return mostrarEscena("sin-conexion");
  const uid = usuario.id, gustado = !opinion.gustado;
  const aviso = boton.closest("article").querySelector(".oharra");
  boton.disabled = true;
  aviso.textContent = "";
  try {
    const supabase = await conectarCuentas();
    const tabla = supabase.from("likes_opinion");
    const { error } = gustado
      ? await tabla.upsert({ opinion_usuario: opinion.usuario_id, opinion_id: opinion.id }, { ignoreDuplicates: true })
      : await tabla.delete().eq("autor_id", uid).eq("opinion_usuario", opinion.usuario_id).eq("opinion_id", opinion.id);
    if (error) throw error;
    opinion.gustado = gustado;
    opinion.likes = Math.max(0, Number(opinion.likes) + (gustado ? 1 : -1));
    boton.setAttribute("aria-pressed", gustado);
    boton.textContent = etiquetaLike(opinion);
  } catch (e) {
    aviso.textContent = t().konexioErrorea;
  } finally {
    boton.disabled = false;
  }
}

function abrirComentarios(clave) {
  const opinion = buscarOpinion(clave);
  if (!opinion || !usuario) return;
  if (!navigator.onLine) return mostrarEscena("sin-conexion");
  const tx = t();
  hilo = { opinion, filas: [], hayMas: false, envio: null };
  comentariosDialogo.innerHTML = `<div class="edukia">
    ${cabeceraDialogo("data-cerrar-comentarios", tx.iruzkinak, "iruzkin-titulua")}
    <form id="form-comentario"><fieldset><label>${tx.iruzkina}<textarea name="texto" rows="3" maxlength="600" required></textarea></label>
    <button class="botoia" type="submit">${tx.iruzkindu}</button></fieldset><p class="oharra" role="status"></p></form>
    <div id="hilo-detalle"></div></div>`;
  comentariosDialogo.showModal();
  cargarComentarios();
}
comentariosDialogo.addEventListener("close", () => { hilo = null; comentariosDialogo.innerHTML = ""; });

async function cargarComentarios(mas = false) {
  const actual = hilo, tx = t();
  if (!actual || actual.cargando) return;
  if (!navigator.onLine) return mostrarEscena("sin-conexion");
  const detalle = document.getElementById("hilo-detalle"), hasta = mas ? actual.filas.at(-1) : null;
  actual.cargando = true;
  detalle.querySelector("button")?.remove();
  if (!mas) detalle.textContent = tx.kargatzen;
  try {
    const supabase = await conectarCuentas();
    let consulta = supabase.from("comentarios_opinion").select("id,autor_id,texto,creada_en")
      .eq("opinion_usuario", actual.opinion.usuario_id).eq("opinion_id", actual.opinion.id)
      .order("creada_en", { ascending: false }).order("id", { ascending: false }).limit(TAM_PAGINA + 1);
    if (hasta) consulta = consulta.or(`creada_en.lt.${hasta.creada_en},and(creada_en.eq.${hasta.creada_en},id.lt.${hasta.id})`);
    const { data, error } = await consulta;
    if (error) throw error;
    if (hilo !== actual) return;
    actual.hayMas = data.length > TAM_PAGINA;
    actual.filas = (hasta ? actual.filas : []).concat(data.slice(0, TAM_PAGINA));
    detalle.innerHTML = (actual.filas.map(c => `<article class="iritzia"><b>${esc(aliasAutor(c.autor_id))}</b>
      <time datetime="${esc(c.creada_en)}">${fecha(new Date(c.creada_en))}</time><p>${esc(c.texto)}</p></article>`).join("")
      || `<p class="azalpena">${tx.iruzkinGabe}</p>`)
      + (actual.hayMas ? `<button type="button" class="botoia marino" data-comentarios-mas="true">${tx.jarioGehiago}</button>` : "");
  } catch (e) {
    detalle.insertAdjacentHTML("beforeend", `<p class="oharra" role="status">${tx.konexioErrorea}</p>
      <button type="button" class="botoia marino" data-comentarios-mas="${mas}">${tx.saiatu}</button>`);
  } finally {
    actual.cargando = false;
  }
}

async function enviarComentario(form) {
  const actual = hilo;
  if (!actual || !usuario || comentariosDialogo.dataset.ocupado) return;
  if (!navigator.onLine) return mostrarEscena("sin-conexion");
  const texto = new FormData(form).get("texto").trim(), uid = usuario.id;
  if (!texto) { form.elements.texto.focus(); return; }
  if (actual.envio?.texto !== texto || actual.envio?.uid !== uid) actual.envio = { texto, uid, id: crypto.randomUUID() };
  const aviso = form.querySelector(".oharra");
  aviso.textContent = "";
  bloquearDialogo(comentariosDialogo, true);
  try {
    const supabase = await conectarCuentas();
    const { error } = await supabase.from("comentarios_opinion").upsert({
      id: actual.envio.id, opinion_usuario: actual.opinion.usuario_id, opinion_id: actual.opinion.id, texto,
    }, { ignoreDuplicates: true });
    if (error) throw error;
    form.reset();
    actual.envio = null;
    if (hilo === actual) {
      await cargarComentarios();
      cargarJarioa();
    }
  } catch (e) {
    aviso.textContent = t().konexioErrorea;
  } finally {
    bloquearDialogo(comentariosDialogo, false);
    form.elements.texto.focus();
  }
}

// ================================================================ Carga, apertura y conexión

const escena = document.getElementById("escena");
const escenaMarco = escena.querySelector("iframe"), escenaCerrar = document.getElementById("escena-cerrar");
const escenaReintentar = document.getElementById("escena-reintentar");
let temporizadorEscena, cargaEscena;

function mostrarEscena(tipo) {
  clearTimeout(temporizadorEscena);
  const offline = tipo === "sin-conexion", tx = t();
  escena.dataset.tipo = tipo;
  cargaEscena?.abort();
  const carga = cargaEscena = new AbortController();
  fetch(`animaciones/${tipo}.html`, { signal: carga.signal }).then(respuesta => {
    if (!respuesta.ok) throw new Error("Escena no disponible");
    return respuesta.text();
  }).then(html => {
    if (carga.signal.aborted || !escena.open) return;
    escenaMarco.srcdoc = html;
  }).catch(() => {});
  escena.querySelector("h2").textContent = offline ? tx.sinConexion : tx.kargatzen;
  escenaCerrar.textContent = offline ? tx.navegar : tx.saltar;
  escenaReintentar.hidden = !offline;
  escenaReintentar.textContent = tx.saiatu;
  if (!escena.open) escena.showModal();
  if (tipo === "carga") temporizadorEscena = setTimeout(() => mostrarEscena("apertura"), 850);
  if (tipo === "apertura") temporizadorEscena = setTimeout(() => escena.close(), 2450);
}

function iniciarEscena() {
  if (!navigator.onLine) return mostrarEscena("sin-conexion");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) mostrarEscena("carga");
}

escenaCerrar.addEventListener("click", () => escena.close());
escenaReintentar.addEventListener("click", () => {
  if (!navigator.onLine) {
    escena.querySelector("h2").textContent = t().konektatu;
    return;
  }
  escena.close();
  if (vista.nombre === "jarioa") cargarJarioa();
  if (comentariosDialogo.open) cargarComentarios();
});
escena.addEventListener("close", () => {
  clearTimeout(temporizadorEscena);
  cargaEscena?.abort();
  escenaMarco.removeAttribute("srcdoc");
});
window.addEventListener("offline", () => mostrarEscena("sin-conexion"));
window.addEventListener("online", () => {
  if (escena.open && escena.dataset.tipo === "sin-conexion") escenaReintentar.click();
});
