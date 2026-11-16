# Fase 2 · cuentas y perfiles

El proyecto Supabase de Hika está en Irlanda. El usuario ya instaló `instalar-fase-2.sql` y configuró las redirecciones de Sites. No repetir esa instalación: sus dos migraciones ya están aplicadas.

## Implementado

Registro y confirmación por correo, reenvío de confirmación con espera entre intentos, acceso, recuperación/cambio de contraseña, perfil privado inicial, idioma, aceptación de condiciones de prueba y foto privada. La descarga JSON consulta Auth y las tablas con la sesión del propietario, incluye la foto actual en base64 y excluye credenciales y tokens. No necesita una función administrativa.

El código del borrado permanente está en `functions/cuenta/index.ts`. La interfaz comprueba su disponibilidad automáticamente; hasta que esté desplegado, no muestra un botón de borrado operativo. Se comprueba la contraseña actual, se limpian los archivos de la carpeta del usuario mediante la API de Storage y se borra la identidad en Auth. La clave foránea instalada elimina el perfil. Si falla la limpieza de fotos no se ejecuta el borrado de Auth. Si una operación queda a medias, se puede reintentar: no se saltan archivos al paginar.

## Activar el borrado desde el panel

1. Abrir el proyecto de Hika en Supabase → **Edge Functions** → **Deploy a new function** → editor.
2. Crear una función llamada exactamente **`cuenta`** y reemplazar su código por el contenido íntegro de `functions/cuenta/index.ts`.
3. En los ajustes de esa función, desactivar **Verify JWT / Enforce JWT verification** del gateway. La propia función valida el token remotamente con Auth en cada petición; no acepta peticiones anónimas. Esto evita incompatibilidades del gateway con las nuevas claves publicables.
4. En **Edge Functions → Secrets**, configurar `APP_ORIGINS` con los orígenes exactos autorizados, separados por comas y sin barra final. Mantener el de Sites y añadir la URL nueva de Netlify. Las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las proporciona Supabase automáticamente dentro de la función. No copiar esa clave administrativa al frontend ni al chat.
5. Desplegar y volver a abrir el perfil. La app consultará `accion: estado` y habilitará el borrado cuando la función responda correctamente.

Alternativa con CLI autenticada: ejecutar `supabase functions deploy cuenta --project-ref fhunczummuieezrvzoqh` desde `definitiva/`; `config.toml` declara la verificación interna de tokens.

## Nuevo alojamiento Netlify

En **Authentication → URL Configuration**, añadir las dos redirecciones exactas del nuevo proyecto: `https://DOMINIO-NETLIFY/perfil` y `https://DOMINIO-NETLIFY/perfil?recuperar=1`. Establecer Site URL al nuevo origen si es el alojamiento principal. Conservar las redirecciones de Sites mientras siga usándose para revisión. Sin este ajuste, los correos pueden regresar al alojamiento anterior y romper el intercambio PKCE iniciado en Netlify.

La configuración de compilación solo usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, ambas públicas. Google permanece desactivado hasta configurar el proveedor y sus credenciales. No hacen falta nuevas migraciones para esta entrega.

## Validación

`npm test` incluye pruebas del frontend, exportación y función administrativa: sesión obligatoria, reautenticación, identidad no elegible por el cliente, separación entre cuentas, rutas de archivos, paginación, fallos de Storage/Auth y respuestas sin secretos. `npm run build` comprueba TypeScript también en el código de la función.

Pendiente para cerrar la fase: desplegar la función, configurar las URL de Netlify, probar registro/recuperación reales y aislamiento con dos cuentas independientes, y configurar el correo transaccional. Las pruebas simuladas no prueban permisos reales en el proyecto. La revisión lingüística y legal y la activación de Google también siguen pendientes. No presentar esta fase como completada ni como lanzamiento público final.
