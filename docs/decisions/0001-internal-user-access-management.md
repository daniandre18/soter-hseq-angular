# ADR 0001 — Gestión segura de usuarios internos

## Contexto

SOTER HSEQ ya almacenaba perfiles en `users` y creaba técnicos mediante una
Cloud Function, pero no tenía una interfaz para administrar los perfiles
`ADMIN`, `COORDINATOR` y `COMMERCIAL`. El cambio de estado se escribía solo en
Firestore, por lo que una cuenta marcada como inactiva seguía habilitada en
Firebase Authentication.

El sistema autoriza con el rol del documento `users`; técnicos y clientes
conservan información de dominio propia y no deben mezclarse con el directorio
administrativo.

## Decisión

- Crear el módulo **Usuarios internos**, visible únicamente para `ADMIN`.
- Mantener Técnicos y Clientes como módulos especializados.
- Crear cuentas internas mediante invitación: el backend asigna una clave
  aleatoria y Firebase envía el enlace para que la persona defina la suya.
- Ejecutar creación, cambio de rol y activación/desactivación exclusivamente en
  Cloud Functions, validando el rol real del actor en Firestore.
- Sincronizar `users.status` con `Firebase Auth.disabled`.
- Exigir `status == ACTIVE` tanto en Cloud Functions como en Firestore Rules.
- Conservar usuarios desactivados y su historial; el módulo no ofrece borrado.
- Registrar invitaciones, actualizaciones y cambios de acceso en `auditEvents`.
- Impedir que un administrador cambie su propio rol o desactive su propia cuenta.

## Alternativas consideradas

1. **Editar `users` directamente desde Angular.** Se descartó porque no puede
   sincronizar Firebase Authentication y permitiría depender de validaciones del
   navegador para operaciones críticas.
2. **Crear contraseñas manuales.** Se descartó para usuarios internos porque
   obliga al administrador a conocer y compartir credenciales.
3. **Unificar técnicos, clientes y administrativos en una sola pantalla.** Se
   descartó porque sus datos y tareas son distintos, aumentando la complejidad y
   el riesgo de asignar roles equivocados.
4. **Eliminar cuentas al retirar acceso.** Se descartó porque rompe trazabilidad
   y referencias históricas.

## Consecuencias

- El despliegue del frontend debe acompañarse del despliegue de las nuevas Cloud
  Functions y Firestore Rules.
- Un fallo al enviar la invitación no elimina la cuenta; el administrador puede
  reenviar el correo desde el menú de acciones.
- El alcance sigue siendo global por rol, coherente con el modelo actual. Los
  permisos por sede o zona quedan como evolución futura y requieren ampliar el
  modelo y las reglas de autorización.
