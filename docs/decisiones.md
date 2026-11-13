# Registro de decisiones

Las decisiones tomadas durante el prototipo y su motivo, de la más reciente a la más antigua.

| Fecha | Decisión | Por qué |
| --- | --- | --- |
| 13/11/2026 | El repositorio de GitHub es público, con el export real incluido | Lo decidió el responsable del proyecto; el export no tiene nombres ni emails |
| 13/11/2026 | Fuera del repositorio quedan los ficheros de otros proyectos de la carpeta y `salida/` | No son del Txalometroa; `salida/` se regenera |
| 11/11/2026 | Presupuesto de la versión definitiva: 135 h (40 de diseño, 95 de programación), 2.345 € + IVA; mantenimiento 68 €/mes + IVA | Tarifa de 17 €/h y precio final por debajo de 3.000 € con IVA; sin margen de imprevistos y con Claude Pro en vez de Max |
| 11/11/2026 | La versión definitiva es una app web instalable, sin tiendas de apps; sustituye al formulario y publica la reseña en la web; tiene cuentas y red social; las butacas usan QR reales | Requisitos del cliente |
| 08/11/2026 | App móvil publicada en Netlify (https://txalometroa-hika.netlify.app), cuenta invitadoh2@gmail.com, con acceso público | Instalarla en el móvil exige HTTPS; la cuenta la eligió el responsable del proyecto |
| 08/11/2026 | Obras de prueba falsas creables y borrables desde «Admin» en la app móvil | Probar la app con más obras sin tocar los datos reales |
| 08/11/2026 | Constelación: ángulo = género, distancia al centro = nota, tamaño = emoción; líneas por orden y por género | Petición del cliente: «dependiendo del género, la valoración y algún otro factor» |
| 08/11/2026 | El mapa de butacas del prototipo es una simulación | Sin servidor no hay ocupación real; en la definitiva será con QR |
| 08/11/2026 | Valoración con 5 máscaras de drama a comedia; media máscara = 1 punto | Petición del cliente; así se mantiene la escala 1–10 del export |
| 08/11/2026 | La nota se muestra con el logo A de Hika llenándose de líquido | Petición del cliente («enseñando el número y el logo rellenándose») |
| 08/11/2026 | Identidad: gris `#575757`, rojo `#c80000`, crema, botones marino, letra pixelada Jersey 10 | Diapositivas de referencia «Rediseño visual» |
| 08/11/2026 | Catálogo con 9 obras del repertorio y géneros provisionales | Dar contenido a la constelación; Hika debe confirmar los géneros |
| 23/10/2026 | Un solo teatro (Hika); se añaden obras, no teatros | El cliente descartó la versión con varios teatros |
| 23/10/2026 | Reseña con foto de la obra, nota y media de cada aspecto | Petición del cliente: «más visual» |
| 23/10/2026 | La publicación en WordPress es un bloque HTML estático que se pega en un bloque «HTML personalizado» | No hay acceso al plugin ni a la base de datos de la web |
| 23/10/2026 | La nota de la obra es la media de GAL1–GAL4; GAL5–GAL6 (fidelidad) y GAL7 (programación local) se analizan aparte | GAL7 habla del municipio y bajaba la nota de todas las obras |
| 23/10/2026 | Un 0 es «no contestada» | Los deslizadores del formulario empiezan en 0 y hay muy pocos 1, 2 y 3 |
| 23/10/2026 | Las versiones eu/es de una obra se unen por alias | El export guarda el nombre en el idioma del formulario |
| 23/10/2026 | Duplicado = mismas notas, misma obra y ≤ 10 s | Doble clic o recarga; con más margen se perdían respuestas reales |
| 23/10/2026 | Función = respuestas de una obra sin huecos de más de 3 h; fiable con ≥ 5 respuestas | El export no guarda la función |
