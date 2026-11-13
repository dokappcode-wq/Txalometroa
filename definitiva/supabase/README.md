# Fase 2 · integración en preparación

El proyecto Supabase todavía no existe (confirmado por el usuario). No se han creado cuentas ni aplicado migraciones en un servicio real.

## Preparación del servicio

1. Crear un proyecto desde https://supabase.com/dashboard en una organización de Hika, región UE. Conservar la contraseña de base de datos en un gestor privado.
2. Configurar autenticación por email con verificación obligatoria, URL de la aplicación y redirecciones autorizadas a `/perfil`. Configurar correo transaccional para producción.
3. Aplicar `migrations/202611130001_perfiles.sql` en un entorno de pruebas antes de producción.
4. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (clave pública del cliente) en las variables de compilación. Nunca usar `service_role` ni una clave secreta en variables `VITE_*`.

La primera migración crea perfiles privados por defecto, vinculados a Auth, con lectura y edición restringidas al propietario. No incorpora aún lectura social ni roles administrativos; se añadirán con pruebas de permisos específicas. Evita una columna de rol editable por el cliente.

## Estado

Preparados: cliente Supabase opcional, registro por email, acceso, sesión, edición de nombre/privacidad, cierre de sesión y migración inicial.

Pendientes para completar la fase: recuperación/cambio de contraseña, Google, avatar, condiciones y consentimiento revisados, descarga/borrado de cuenta con servidor, pruebas de aislamiento con dos cuentas, configuración real y despliegue de revisión. No considerar esta fase terminada hasta validar estos recorridos contra el servicio real.
