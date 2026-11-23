// ================================================================ Cuenta y feed

const cuentaDialogo = document.getElementById("kontu-dialogoa");
const opinionDialogo = document.getElementById("baloratu");
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

for (const dialogo of [cuentaDialogo, opinionDialogo]) {
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
      <label>${tx.iritzia}<textarea name="opinion" rows="6" maxlength="2000" required></textarea></label>
      <button type="submit" class="botoia" ${KONTU_KONFIG ? "" : "disabled"}>${tx.argitaratu}</button>
    </fieldset></form>
    <p class="oharra" role="status">${KONTU_KONFIG ? "" : tx.konfiguratuGabe}</p></div>`;
  opinionDialogo.showModal();
}

async function enviarValoracion(form) {
  if (!borrador || !KONTU_KONFIG || opinionDialogo.dataset.ocupado) return;
  const texto = new FormData(form).get("opinion").trim();
  const aviso = opinionDialogo.querySelector(".oharra");
  const boton = form.querySelector("button");
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
    if (borrador.envio?.texto !== texto || borrador.envio?.usuario_id !== uid) {
      borrador.envio = { id: crypto.randomUUID(), obra_id: borrador.obra, usuario_id: uid, texto };
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
  const tarjetas = feed.filas.map(o => {
    const obra = obraCat(o.obra_id);
    return `<article class="iritzia"><h2>${esc(obra ? izena(obra) : o.obra_id)}</h2>
      <time datetime="${esc(o.creada_en)}">${fecha(new Date(o.creada_en))}</time><p>${esc(o.texto)}</p></article>`;
  }).join("");
  return `${feed.publicado ? `<p role="status">${tx.argitaratuta}</p>` : ""}
    ${tarjetas ? `<div class="feed-lista">${tarjetas}</div>` : ""}${estado}`;
}

async function cargarJarioa(cargarMas = false) {
  if (!KONTU_KONFIG || feed.cargando) return;
  const actual = feed;
  actual.cargando = true;
  actual.cargarMas = cargarMas;
  actual.error = false;
  pintarJarioa();
  try {
    const supabase = await conectarCuentas();
    if (feed !== actual || !usuario) return;
    const hasta = cargarMas ? actual.filas.at(-1) : null;
    let consulta = supabase.from("opiniones").select("id,obra_id,texto,creada_en")
      .eq("usuario_id", usuario.id).order("creada_en", { ascending: false }).order("id", { ascending: false })
      .limit(TAM_PAGINA + 1);
    if (hasta) consulta = consulta.or(`creada_en.lt.${hasta.creada_en},and(creada_en.eq.${hasta.creada_en},id.lt.${hasta.id})`);
    const { data, error } = await consulta;
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
