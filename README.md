# SOTER HSEQ — Plataforma Digital (Angular + Firebase)

MVP para digitalizar el ciclo operativo de SOTER HSEQ: cotización → orden de servicio → ejecución en campo → evidencias → acta de cierre asistida por IA.

Ver [`CLAUDE.md`](./CLAUDE.md) para la especificación técnica completa (roles, modelo de datos, arquitectura, seguridad y plan de fases).

## Estado actual

Fases 0-7 del plan de `CLAUDE.md` §27 completas: autenticación y roles, clientes, cotizaciones, conversión a orden, asignación y programación, ejecución en campo (notas/hallazgos/recomendaciones/evidencia con vista previa), acta de cierre asistida por IA (generación, edición, aprobación, cierre con PDF), y dashboard con indicadores y alertas operativas. Producción está conectada al proyecto Firebase `soter-hseq` (Authentication + Firestore en Spark). El desarrollo local continúa usando Firebase Emulator Suite (`demo-soter-hseq`). La demo pública usa GitHub Pages y evidencias estáticas de solo lectura porque Cloud Storage requiere Blaze.

Pendiente (Fase 8): datos semilla más completos, revisión de seguridad y responsive antes de una demo.

## Estructura del repositorio

```text
soter-hseq-angular/
├── CLAUDE.md               # Especificación técnica del MVP
├── apps/web/                # Aplicación Angular (standalone components + Signals + Akita)
├── functions/                # Cloud Functions: generateClosingAct, closeOrder
├── scripts/                  # Seed de usuarios de prueba para el emulador
├── firestore.rules
├── firestore.indexes.json
└── storage.rules
```

Dentro de `apps/web/src/app/`:

- `core/` — servicios singleton, guards, tokens de Firebase, repositorios compartidos entre features.
- `shared/` — componentes de UI reutilizables (botón, modal, card, badges, iconos, gráficos) y utilidades de formato.
- `layout/` — shell de la aplicación (sidebar, header).
- `features/` — un módulo por dominio: `auth`, `dashboard`, `clients`, `quotes`, `orders`. Evidencias, notas y acta de cierre viven dentro de `orders` (subcolecciones y documentos ligados 1:1 a una orden, no ameritan un feature propio). Cada feature sigue el patrón Store/Query (Akita) → Facade (expone Signals) → Servicio de dominio, sin acceso directo a Firestore desde componentes (CLAUDE.md §6.2).

## Comandos

Desde la raíz del repo:

```bash
npm run emulators          # firebase emulators:start --project demo-soter-hseq (Auth/Firestore/Storage/Functions/UI en :4000)
npm run emulators:export   # igual, pero exporta a ./.emulator-data al salir y lo reimporta al iniciar
npm run seed                # crea los 5 usuarios de prueba (ver más abajo)
```

Dentro de `apps/web/`:

```bash
npm install
npm start           # ng serve — http://localhost:4200
npm run build       # ng build
npm run lint        # eslint
npm test            # vitest (unitarios: facades, componentes)
```

### Demo en GitHub Pages

Cada `push` a `main` ejecuta `.github/workflows/deploy-pages.yml`. El workflow compila Angular con la ruta base del repositorio y publica `apps/web/dist/web/browser`. La navegación usa hash routing para funcionar en hosting estático.

En producción gratuita no se pueden subir evidencias nuevas ni desplegar Cloud Functions. Las 11 evidencias migradas están en `apps/web/public/demo-evidence/` y se publican como archivos estáticos visibles para cualquier visitante que conozca su URL.

Dentro de `functions/`:

```bash
npm install
npm run build        # tsc
```

No hay un framework de e2e instalado como dependencia del proyecto (Cypress/Playwright): el flujo principal de CLAUDE.md §24 (comercial → cliente → cotización → orden → técnico → notas/evidencia → revisión → coordinador → acta → cierre → PDF) se verifica manualmente en un navegador real contra el emulador durante el desarrollo de cada fase.

### Usuarios de prueba (`npm run seed`)

Todos con contraseña `Demo1234!`:

| Rol | Correo |
| --- | --- |
| Administrador | `admin@soterhseq.demo` |
| Comercial | `comercial@soterhseq.demo` |
| Coordinador | `coordinador@soterhseq.demo` |
| Técnico | `tecnico1@soterhseq.demo`, `tecnico2@soterhseq.demo` |

`npm run emulators` no persiste datos entre reinicios: tras cada corrida hay que volver a `npm run seed` y recrear clientes/cotizaciones/órdenes de prueba a mano o vía la UI. Para conservar el estado, usar `npm run emulators:export` en su lugar (exporta a `./.emulator-data` al cerrar y lo reimporta al iniciar).

### IA (Gemini)

`functions/.env.local` (gitignorado) debe tener una `GEMINI_API_KEY` real para que "Generar borrador con IA" funcione contra el emulador; ver `functions/.env.example`. Sin una key real, la función falla de forma controlada y la UI muestra el error — el resto del flujo del acta (editar, aprobar, cerrar, generar PDF) no depende de Gemini para nada.

## Convenciones

- TypeScript estricto, sin `any` sin justificación.
- Nombres de dominio en inglés en el código; textos de interfaz en español.
- Sin acceso directo a Firestore/Storage desde componentes: siempre a través de Facade → Servicio de dominio → tokens de `core/firebase`.
- La IA (Gemini) solo se invoca desde Cloud Functions, nunca desde Angular.
- Firebase Rules como defensa real; los guards de rutas en Angular son solo la primera línea de defensa en UI.

Ver la sección 8 de `CLAUDE.md` para el detalle completo de convenciones y la sección 29 para restricciones explícitas.
