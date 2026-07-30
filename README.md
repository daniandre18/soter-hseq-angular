# SOTER HSEQ — Plataforma Digital (Angular + Firebase)

MVP para digitalizar el ciclo operativo de SOTER HSEQ: cotización → orden de servicio → ejecución en campo → evidencias → acta de cierre asistida por IA.

Ver [`CLAUDE.md`](./CLAUDE.md) para la especificación técnica completa (roles, modelo de datos, arquitectura, seguridad y plan de fases).

## Estado actual

**Fase 0 — Preparación** en curso: workspace Angular creado, lint configurado, estructura por features definida. Firebase todavía no está conectado a un proyecto real (pendiente `firebase login` / `firebase init` por el dueño de la cuenta).

## Estructura del repositorio

```text
soter-hseq-angular/
├── CLAUDE.md              # Especificación técnica del MVP
├── apps/web/              # Aplicación Angular (standalone components + Signals)
├── functions/              # Cloud Functions (se crea en la Fase 6 — IA y acta)
├── docs/                   # Documentación de arquitectura y ADRs
└── scripts/                 # Seeds y utilidades de emulador
```

Dentro de `apps/web/src/app/`:

- `core/` — servicios singleton, guards, interceptors (auth, roles).
- `shared/` — componentes, pipes y directivas reutilizables.
- `layout/` — shell de la aplicación (nav, header, sidebar).
- `features/` — un módulo por dominio: `auth`, `dashboard`, `clients`, `quotes`, `orders`, `evidence`, `closing-acts`, `users`. Cada feature sigue el patrón Facade → Servicio de dominio → Repositorio descrito en `CLAUDE.md` (sección 6.2).

## Comandos

Ejecutar dentro de `apps/web/`:

```bash
npm install
npm start          # ng serve
npm run build      # ng build
npm run lint       # eslint
npm test           # vitest
```

Comandos de Firebase/emuladores y seeds se documentarán aquí una vez configurado el proyecto Firebase (Fase 1).

## Convenciones

- TypeScript estricto, sin `any` sin justificación.
- Nombres de dominio en inglés en el código; textos de interfaz en español.
- Sin acceso directo a Firestore desde componentes: siempre a través de Facade → Repositorio.
- La IA (Gemini) solo se invoca desde Cloud Functions, nunca desde Angular.

Ver la sección 8 de `CLAUDE.md` para el detalle completo de convenciones y la sección 29 para restricciones explícitas.
