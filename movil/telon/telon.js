// Encaja la escena del telón en la pantalla: la escala hasta que se ve entera (nada se corta)
// y estira el escenario para llenar lo que sobra (telones y suelo más altos, o más anchos).
function telonEncajar(telon) {
  const vertical = matchMedia("(orientation: portrait)").matches;
  const el = telon.querySelector(vertical ? ".v" : ".h");
  const w = vertical ? 390 : 1280, h = vertical ? 844 : 720;
  const W = telon.clientWidth || innerWidth, H = telon.clientHeight || innerHeight;
  const s = Math.min(W / w, H / h);
  const ancho = Math.max(w, Math.ceil(W / s) + 2), alto = Math.max(h, Math.ceil(H / s) + 2);
  el.style.width = ancho + "px";
  el.style.height = alto + "px";
  el.style.setProperty("--dy", (alto - h) + "px");
  el.style.transform = `translate(-50%, -50%) scale(${s})`;
}
function telonVigilar(telon) {
  const encajar = () => telonEncajar(telon);
  encajar();
  addEventListener("resize", encajar);
  addEventListener("orientationchange", encajar);
  // El tamaño del telón puede cambiar sin evento resize (zoom del móvil, barras del navegador).
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(encajar) : null;
  if (ro) ro.observe(telon);
  return () => { removeEventListener("resize", encajar); removeEventListener("orientationchange", encajar); if (ro) ro.disconnect(); };
}
