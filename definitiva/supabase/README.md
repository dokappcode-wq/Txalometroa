# Fase 2 · integración en preparación

Proyecto Supabase conectado. El usuario confirmó la instalación del SQL y las redirecciones. Se verificó que la API responde y rechaza la lectura anónima de perfiles. Falta validar el recorrido con correo real y dos cuentas independientes.

## Preparación del servicio

1. Crear un proyecto desde https://supabase.com/dashboard en una organización de Hika, región UE. Conservar la contraseña de base de datos en un gestor privado.
2. Configurar autenticación por email con verificación obligatoria, URL de la aplicación y redirecciones autorizadas a `/perfil`. Configurar correo transaccional para producción.
3. Aplicar `migrations/202611130001_perfiles.sql` en un entorno de pruebas antes de producción.
4. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (clave pública del cliente) en las variables de compilación. Nunca usar `service_role` ni una clave secreta en variables `VITE_*`.

La primera migración crea perfiles privados por defecto, vinculados a Auth, con lectura y edición restringidas al propietario. No incorpora aún lectura social ni roles administrativos; se añadirán con pruebas de permisos específicas. Evita una columna de rol editable por el cliente.

## Estado

Preparados: cliente Supabase opcional, registro por email, acceso, sesión, edición de nombre/privacidad, cierre de sesión y migración inicial.

Pendientes para completar la fase: recuperación/cambio de contraseña, Google, avatar, condiciones y consentimiento revisados, descarga/borrado de cuenta con servidor, pruebas de aislamiento con dos cuentas, configuración real y despliegue de revisión. No considerar esta fase terminada hasta validar estos recorridos contra el servicio real.

## Actualización 15/11/2026

Pantalla de registro, acceso, recuperación/cambio de contraseña, perfil, idioma, privacidad y foto implementada. Información de prueba y aceptación registradas en servidor. Google sigue desactivado en Supabase. La descarga/borrado requieren implementar y desplegar la función `cuenta`; sus controles se mantienen desactivados. Esta entrega es una revisión parcial de fase 2, no su cierre.
