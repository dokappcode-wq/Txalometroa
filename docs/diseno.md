# Guía de diseño

La identidad viene de las diapositivas de referencia del proyecto («Rediseño visual», «Valoración digital» y «Datos digitales → forma visual») y de la web de Hika. La app móvil del prototipo ya la aplica. Esta guía es la base para diseñar la versión definitiva en Figma.

## Paleta

| Token | Color | Uso |
| --- | --- | --- |
| `--gris` | `#575757` | Fondo principal (el gris de las diapositivas) |
| `--gris-2` | `#444444` | Fondos intermedios |
| `--gris-3` | `#2a2a2a` | Tarjetas, hojas y pantallas a pantalla completa |
| `--negro` | `#0d0d0d` | Barra inferior, sala del mapa de butacas, parte negra del logo |
| `--rojo` | `#c80000` | Botones principales y butacas ocupadas (el rojo de la paleta de referencia) |
| `--rojo-logo` | `#c8361b` | Parte roja del logo A |
| `--rojo-vivo` | `#ff3c42` | Acentos sobre fondo oscuro; es el rojo de la web de Hika |
| `--crema` | `#fffdf0` | Texto principal sobre oscuro y campos de texto |
| `--crema-logo` | `#fdeec7` | Fondo del logo y de los medidores |
| `--marino` | `#0b0a3a` | Botones secundarios, con borde crema y texto subrayado |

El fondo lleva dos resplandores: rojo arriba a la izquierda y crema abajo a la derecha, como en las diapositivas. La app tiene un solo aspecto, oscuro.

### Colores de los géneros (constelación)

| Género (eu / es) | Color |
| --- | --- |
| Drama | `#ff4d4f` |
| Tragikomedia / Tragicomedia | `#ffb000` |
| Komedia / Comedia | `#fff3c4` |
| Musika-antzerkia / Teatro musical | `#ff7aa8` |
| Dantza-antzerkia / Danza-teatro | `#9b8cff` |
| Kaleko antzerkia / Teatro de calle | `#4fd1c5` |

En la constelación cada sector lleva escrito su género, así que el color nunca es la única pista.

## Tipografía

| Uso | Fuente | Notas |
| --- | --- | --- |
| Titulares, cifras, botones, pestañas | **Jersey 10** (Google Fonts) | Letra pixelada y estrecha, la más parecida a la de las diapositivas; alternativa: Pixelify Sans |
| Texto | **Raleway** 400 / 600 / 700 (Google Fonts) | Es la letra de la web de Hika |
| Títulos de la réplica de la web | Roboto Slab 300 | Solo para imitar la web de Hika |

Botones: Jersey 10 a 24 px, en mayúsculas, con algo de espacio entre letras.

## El logo

El logo de la app es la A de Hika de la diapositiva «Rediseño visual»: una forma negra en «<» y una A roja con un hueco triangular, sobre crema. Está dibujado como SVG en `app/nucleo.js` (`LOGO`):

```js
const LOGO = {
  vista: "0 0 400 380",
  negro: "M103 50 L214 50 L121 183 L217 338 L110 338 L50 246 L44 114 Z",
  rojo: "M253 7 L292 57 L280 71 L315 122 L330 120 L366 170 L148 221 L122 186 Z",
  hueco: "M181 173 L212 141 L217 167 Z",
};
```

Los iconos de la app (`movil/icons/`) se generaron desde este SVG sobre fondo `#fdeec7`: 192, 512 y 180 px (iPhone), con un 12 % de margen. El `maskable` de 512 px tiene un 24 % de margen, para que Android pueda recortarlo en círculo.

## Logo que se llena de líquido

En lugar de mostrar solo el número, la nota media se enseña con el logo llenándose de líquido hasta la nota (9,4 → 94 % de alto). Va en un medidor crema con el número debajo, en Jersey 10.

- **Cómo se dibuja** (`svgLogoLiquido`): debajo, el logo «vacío» con un tono suave; encima, el logo con sus colores dentro de una máscara SVG con forma de ola. La ola sube desde abajo hasta su nivel en 1,8 s y luego se mueve de lado sin parar.
- **Animación:** con SMIL (`animateTransform`), sin JavaScript, para que funcione también en el bloque de WordPress.
- **Ojo:** la ola tiene que ir en una `<mask>`. Un `<clipPath>` no admite grupos y el líquido no se ve.

## Máscaras de teatro

Sustituyen a las caritas del formulario original. Son 5 máscaras rojas que pasan de **drama** (boca y cejas tristes) a **comedia** (sonrisa y ojos en media luna), como en la diapositiva «Valoración digital».

- **Dibujo** (`svgMascara(k, relleno)`): `k` va de −1 (drama) a 1 (comedia); la boca, los ojos y las cejas cambian de forma con `k`. `relleno` (0–1) colorea en rojo esa parte de la máscara, de izquierda a derecha; el resto queda crema.
- **Para valorar:** cada máscara vale 2 puntos. Tocar su mitad izquierda pone una nota impar (media máscara) y la derecha, la par. Las 5 máscaras dan la escala 1–10, la misma del export. Con el teclado: flechas, Inicio y Fin.
- **Para mostrar una media:** la nota se reparte entre las 5 máscaras (9,3 → 4 enteras y casi media).

## Componentes

| Componente | Descripción |
| --- | --- |
| Tarjeta de obra | Foto 4:3 con degradado a negro, chip del género, título en Jersey 10 y medidor líquido que sobresale abajo a la derecha |
| Medidor | Fondo `#fdeec7`, logo líquido, nota grande y «/10» |
| Botón principal | Rojo `#c80000`, texto crema en Jersey 10 |
| Botón secundario | Marino `#0b0a3a`, borde crema, texto subrayado |
| Chip | Píldora negra translúcida con un punto de color |
| Historia (Wrapped) | Pantalla completa con fondo plano (rojo, negro, crema, gris o color del género), barras de progreso arriba, cifras gigantes y formas del logo giradas de fondo |
| Mapa de butacas | Sala negra, escenario crema arriba, butacas grises (libres), rojas (ocupadas) y crema con brillo (la tuya) |

## Referencias

- **Rediseño visual:** paleta rojo / negro / crema sobre gris y el logo A.
- **Valoración digital:** valoración textual (cuestionario), numérica (máscaras con media máscara) y visual (logo).
- **Datos digitales → forma visual:** el grafo de Obsidian (constelación), Spotify Wrapped (historias) y un mapa de butacas con pantalla (butacas en directo).
