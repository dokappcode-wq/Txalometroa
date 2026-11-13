# Presupuesto · Txalometroa, versión definitiva

11/11/2026 · Documento original, con gráficos: https://claude.ai/artifact/JFK2c2sXrYsUDEz7Zh7JdD

La versión definitiva del Txalometroa cuesta **2.345 € + IVA (2.837 € con IVA)**: 135 horas (40 de diseño y 95 de programación) a 17 €/h, más los programas del desarrollo. Estaría lista en unas 6 semanas. El mantenimiento cuesta 68 € al mes + IVA, más unos 23 € al mes de servidor que Hika paga directamente.

Hika recibe una app web instalable con cuentas y red social, valoraciones con máscaras, constelación, Wrapped, butacas en directo con QR, un panel de gestión y la publicación automática de reseñas en su web.

## Qué incluye

La versión definitiva sustituye el formulario actual del Txalometroa por una app web instalable desde la web (sin tiendas de apps), con cuentas de usuario, en euskera y castellano.

- **Cuentas y perfiles:** registro con email o Google, perfil con foto y nombre, perfil público o privado, y opciones para descargar o borrar tus datos (RGPD).
- **Valorar:** máscaras de drama a comedia (1–10), emociones y preguntas abiertas; una valoración por persona y función, y el logo de Hika que se llena con la nota.
- **Red social:** seguir a otras personas, muro con la actividad de quien sigues, reseñas públicas con comentarios y «me gusta», notificaciones, y opciones para denunciar o bloquear.
- **Mi constelación y Wrapped:** constelación personal, Wrapped personal y mundial, y compartirlos como imagen en redes.
- **Butacas en directo:** un código QR en cada butaca; al escanearlo, tu sitio se enciende en el mapa de la función en tiempo real.
- **Panel de Hika:** alta de obras, salas, funciones y fotos; moderación de comentarios; estadísticas e informe exportable.
- **Web de Hika:** la reseña de cada obra se publica sola en hikateatroa.eus y el botón TXALOTU lleva a la app.
- **Datos históricos:** se importan las 546 valoraciones del Txalometroa actual.

## Cómo se construye

Arquitectura: el público (con su cuenta), el equipo de Hika (panel de gestión) y las butacas con QR usan la **app Txalometroa** (web instalable con HTTPS, alojada en Netlify). La app guarda todo en **Supabase** (cuentas y permisos, base de datos, tiempo real de las butacas, fotos y copias diarias), y la **web de Hika** (WordPress) muestra la reseña publicada de cada obra.

La app se programa en TypeScript con React y la base de datos es Postgres en Supabase, con los datos alojados en la UE. La seguridad no depende solo de la app: la propia base de datos decide quién puede leer o cambiar cada dato.

- **Permisos por persona:** cada usuario solo puede cambiar lo suyo, y solo Hika entra al panel de gestión.
- **Cuentas:** contraseñas y sesiones las gestiona Supabase; también se puede entrar con Google.
- **Votos limpios:** una valoración por persona y función, límite de envíos y Cloudflare Turnstile contra bots.
- **Moderación:** denunciar y bloquear, y revisión de denuncias desde el panel de Hika.
- **RGPD:** consentimiento al registrarse, edad mínima de 14 años, y descargar o borrar todos tus datos.
- **Copias y errores:** HTTPS siempre, copias de seguridad diarias y aviso automático cuando algo falla.

## Programas y servicios

Casi todo es gratis. Solo se paga Claude durante la programación, Figma durante el diseño y la base de datos cuando la app esté abierta al público.

| Programa | Para qué | Plan | Coste |
| --- | --- | --- | --- |
| [Claude](https://claude.com/pricing) (Claude Code) | Programar con IA | Pro durante el desarrollo (Max si se queda corto) | Max 100 $/mes (≈ 90 €) · Pro 20 $/mes (≈ 18 €) |
| [Figma](https://www.figma.com/pricing/) | Diseñar las pantallas y el prototipo | Professional, 1 mes | 16 $/mes (≈ 14 €) |
| [Supabase](https://supabase.com/pricing) | Cuentas, base de datos, tiempo real de las butacas y fotos | Free en desarrollo, Pro en producción | Free 0 € · Pro 25 $/mes (≈ 23 €) |
| [Netlify](https://www.netlify.com/pricing/) | Alojar la app con HTTPS (es donde está el prototipo) | Free | 0 € (Personal 9 $/mes si se queda corto) |
| GitHub | Guardar el código y su historial | Free | 0 € |
| Visual Studio Code | Editor de código | Gratuito | 0 € |
| Dominio | txalometroa.hikateatroa.eus, subdominio del que ya tiene Hika | Incluido | 0 € |
| Sentry | Avisos cuando la app falla en el móvil de alguien | Plan gratuito | 0 € |
| Cloudflare Turnstile | Frenar bots y votos falsos sin captchas molestos | Gratuito | 0 € |
| Pegatinas QR | Un QR en cada butaca | Imprenta | 30–90 € por sala (estimación) |
| Asesoría legal | Política de privacidad, condiciones de uso y RGPD de una red social | Profesional externo | 300–800 € (estimación) |

Precios consultados el 11/11/2026 en las páginas oficiales, con un cambio aproximado de 1 $ ≈ 0,90 €. Supabase Pro hace falta en producción porque incluye copias de seguridad diarias; el plan gratuito no las tiene y se pausa tras una semana sin uso.

## Tiempo por fases

| Fase | Horas | Coste (17 €/h) |
| --- | --- | --- |
| **Diseño** | **40 h** | **680 €** |
| Análisis y requisitos con Hika | 8 h | 136 € |
| Diseño de pantallas y prototipo (Figma) | 32 h | 544 € |
| **Programación** | **95 h** | **1.615 €** |
| Base técnica: datos, permisos y despliegue | 9 h | 153 € |
| Cuentas y perfiles | 10 h | 170 € |
| Valorar con máscaras | 10 h | 170 € |
| Red social: seguir, muro, reseñas, avisos | 23 h | 391 € |
| Constelación y Wrapped | 9 h | 153 € |
| Butacas en directo con QR | 14 h | 238 € |
| Panel de gestión de Hika | 14 h | 238 € |
| Reseñas en la web de Hika | 6 h | 102 € |
| **Total** | **135 h** | **2.295 €** |

## Presupuesto total

Precio final: **2.345 € + IVA (2.837,45 € con IVA)** por la app terminada.

| Concepto | Importe |
| --- | --- |
| Trabajo: 135 h × 17 €/h (40 h de diseño y 95 h de programación) | 2.295 € |
| Programas durante el desarrollo: Claude Pro 2 meses y Figma 1 mes | 50 € |
| **Total sin IVA** | **2.345 €** |
| IVA (21 %) | 492,45 € |
| **Total con IVA** | **2.837,45 €** |

Aparte, a cargo de Hika: las pegatinas QR (30–90 € por sala) y la asesoría legal (300–800 €).

**Mantenimiento: 68 € al mes + IVA (82,28 € con IVA)**, más el servidor, que Hika paga directamente. Hay una opción básica más barata si Hika no va a añadir obras a menudo.

| Plan | Qué incluye | Al mes | Al año |
| --- | --- | --- | --- |
| Básico | 2 h/mes: corregir errores y actualizaciones de seguridad | 34 € + IVA | 408 € + IVA |
| **Recomendado** | 4 h/mes: lo anterior, más dar de alta obras nuevas y pequeños cambios | **68 € + IVA** | **816 € + IVA** |
| Servidor (Supabase Pro) | Base de datos, cuentas y copias diarias; lo paga Hika | ≈ 23 € | ≈ 276 € |

Las horas que no se usan en un mes no se acumulan; si un mes hace falta más, se cobra a 17 €/h avisando antes.

## Calendario

Unas 6 semanas trabajando unas 25 horas por semana:

| Semana | Trabajo |
| --- | --- |
| S1–S2 | Análisis con Hika y diseño en Figma; Hika aprueba el diseño al final de la S2 |
| S3 | Base técnica, cuentas y valorar |
| S4 | Red social |
| S5 | Constelación, Wrapped y butacas con QR |
| S6 | Panel de Hika y web; entrega al final de la S6 |

No se programa nada hasta que Hika aprueba el diseño (fin de la semana 2). A unas 15 horas semanales se iría a unas 9 semanas.

## Qué no incluye y condiciones

- **Sin tiendas de apps:** se instala desde la web; publicar en App Store o Google Play se presupuestaría aparte.
- **Textos legales:** los redacta o revisa un asesor externo, con presupuesto propio.
- **Lo que aporta Hika:** fotos y textos de las obras, revisión del euskera, y el plano de salas y butacas.
- **Cuentas a nombre de Hika:** Supabase y Netlify se abren a su nombre y Hika paga sus cuotas.
- **Garantía:** 3 meses de corrección de errores tras la publicación; las funciones nuevas, y las horas de más si alguna fase se alarga, se cobran aparte a 17 €/h avisando antes.
- **Pago propuesto:** 40 % al empezar, 30 % al aprobar el diseño y 30 % a la entrega.
- **Cambio de moneda:** los servicios cobran en dólares, así que su importe en euros puede variar un poco.
