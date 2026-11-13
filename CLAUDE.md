# Txalometroa · instrucciones para Claude

Prototipo del Txalometroa de Hika Teatroa: análisis del feedback del público, publicación en su web y app móvil. Antes de programar, lee `docs/README.md`; la especificación de la versión definitiva está en `docs/version-definitiva.md`.

## Idioma y estilo

- Hablamos en castellano. La app es bilingüe euskera / castellano: todo texto visible lleva su versión eu y es.
- El código sigue el estilo existente: nombres en castellano (algunos en euskera, como `txalotu`, `butakak` o `zerua`), comentarios breves en castellano y sin dependencias salvo que hagan falta.
- Los textos en euskera nuevos deben marcarse para que los revise un hablante nativo.

## Compilar, probar y publicar

```bash
python app/construir.py       # monta app/, replica/ y movil/ desde sus plantillas .src
python -m http.server 8766    # luego abre http://localhost:8766/movil/
python app/publicar.py        # compila y sube movil/ a Netlify
python analizar.py datos/<export>.xls   # análisis por línea de comandos (genera salida/)
```

- Edita solo las plantillas (`*.src.html`, `movil/sw.src.js`), `app/nucleo.js`, `config.json` y `app/catalogo.json`. Los `.html` finales y `movil/sw.js` se generan.
- La lógica compartida está en `app/nucleo.js`. Las reglas de limpieza están también en `analizar.py`: si cambias una, cambia la otra.
- Después de compilar, comprueba la sintaxis del JavaScript incrustado (por ejemplo, extrae el `<script>` y pásalo por `node --check`).
- Para ver la app móvil a tamaño de teléfono (390 px) en Chrome headless, mételo en un `iframe` de 390 px: Chrome headless no baja de unos 500 px de ancho. Las animaciones SMIL del logo líquido no avanzan en capturas headless; en un navegador normal sí.

## Trampas conocidas

- Al escribir ficheros con las herramientas de edición, las secuencias de escape unicode de JavaScript (barra invertida, u y cuatro cifras) se convierten en el carácter real y pueden romper expresiones regulares. Usa `\p{M}` con la bandera `u`, o `String.fromCharCode`.
- Los heredocs muy largos fallan en Git Bash: escribe el script en un fichero y ejecútalo.
- La ola del logo líquido va en una `<mask>`, no en un `<clipPath>`: un `clipPath` no admite grupos.
- `netlify-cli` lanzado desde Git Bash usa la cuenta invitadoh2@gmail.com, dueña del sitio; lanzado desde Python o desde un terminal de Windows puede ver otra cuenta y dar «Site not found».
- No pongas datos personales en el repositorio: es público.

## Datos

- El export de `datos/` es texto separado por tabulaciones con extensión `.xls`. Columnas: `ID, PRODUKZIOA, NOIZ, HIZKUNTZA, GAL1…GAL7`; un 0 es «no contestada».
- Nota de una obra = media de GAL1–GAL4. Resultados de referencia: 546 válidas de 696; Atearen bestaldean 9,56 (304), Zorretan 9,16 (227), Bidaia 9,58 (9), MAKILhotsak 9,25 (6). Si un cambio altera estas cifras sin querer, algo se ha roto.
