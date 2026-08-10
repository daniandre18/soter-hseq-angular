# ADR 0002 — Acceso de clientes por invitación reemplazable

## Contexto

El perfil `VIEWER` ya podía consultar cotizaciones y órdenes de la empresa
indicada por `users.clientId`, pero solo existía en los datos de demostración.
El módulo Clientes no permitía crear esa cuenta ni retirar el acceso cuando la
persona autorizada dejaba la empresa.

## Decisión

- Agregar **Acceso al portal** en la ficha del cliente para `ADMIN` y
  `COMMERCIAL`.
- Mantener un único usuario `VIEWER` activo por cliente.
- Crear cuentas con una contraseña aleatoria y enviar un correo de Firebase
  para que la persona defina la suya.
- Guardar la relación en `users.clientId` y el uid activo en
  `clients.portalUserId`.
- Ejecutar invitaciones y reemplazos exclusivamente mediante Cloud Functions.
- Permitir activar o desactivar el acceso desde la misma ficha, sincronizando
  `users.status` con `Firebase Auth.disabled`.
- Al reemplazar una persona, deshabilitar su cuenta de Auth, revocar sus
  credenciales y conservar su documento `users` como `INACTIVE`.
- Crear un uid nuevo para el reemplazo, aunque se reutilice el mismo correo, y
  registrar ambas operaciones en `auditEvents`.

## Consecuencias

- El usuario anterior pierde acceso sin borrar su trazabilidad.
- El cliente sigue viendo únicamente la empresa asociada a su nuevo perfil.
- El frontend, Functions y Firestore Rules deben desplegarse juntos.
