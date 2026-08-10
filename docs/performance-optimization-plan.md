# Plan de optimización de rendimiento web

## Objetivo

Reducir el tiempo de carga inicial y mantener estable el rendimiento de SOTER
HSEQ cuando crezcan las colecciones de clientes, cotizaciones y órdenes, sin
cambiar el comportamiento funcional, los permisos ni la arquitectura por
capas.

## Línea base

Medición obtenida con:

```bash
cd apps/web
npm run build -- --stats-json
```

Resultado inicial del build de producción:

| Métrica | Línea base |
| --- | ---: |
| JavaScript inicial | 1.90 MB |
| CSS global inicial | 36.69 kB |
| Total inicial sin comprimir | 1.94 MB |
| Transferencia inicial estimada | 410.50 kB |
| Presupuesto configurado | 1.60 MB |
| Exceso sobre el presupuesto | 340.85 kB |

Principales contribuciones detectadas en `stats.json`:

- Firestore, WebChannel y expresiones regulares: más de 500 kB sin comprimir.
- Chart.js y sus helpers: cerca de 200 kB sin comprimir.
- Las páginas de todos los dominios estaban importadas de forma eager desde
  `app.routes.ts`.
- Los listados limitaban el DOM con `slice()`, pero varios repositorios seguían
  escuchando colecciones completas en Firestore.

Aspectos ya optimizados:

- Angular 22 funciona sin Zone.js por defecto.
- Las listas principales usan `@for` con una clave estable.
- jsPDF, AutoTable, Quill y `libphonenumber-js` ya tienen carga dinámica.
- Los dominios no consultan Firebase directamente desde los componentes.

## Secuencia de trabajo

### 1. Rutas con carga diferida

Estado: completado.

- Sustituir imports eager de páginas por `loadComponent()`.
- Mantener guards, títulos, datos de navegación y roles sin cambios.
- Cargar también el shell, login y páginas de error bajo demanda.
- Verificar rutas con pruebas y comparar el bundle.

Criterio de aceptación: cada pantalla debe generar su propio chunk y el flujo
de navegación debe conservar los mismos permisos.

Resultado medido:

| Métrica | Antes | Después | Diferencia |
| --- | ---: | ---: | ---: |
| Total inicial sin comprimir | 1.94 MB | 981.98 kB | -49.4 % aprox. |
| Transferencia inicial estimada | 410.50 kB | 243.66 kB | -40.6 % aprox. |
| Advertencia de presupuesto inicial | Sí | No | resuelta |

Las pantallas quedaron distribuidas en chunks por feature. La configuración
de rutas conserva los mismos guards, roles, títulos y datos de navegación.

### 2. Chart.js aislado

Estado: completado.

- Quitar `withDefaultRegisterables()` del arranque global.
- Registrar únicamente los elementos utilizados por el gráfico circular.
- Proveer la configuración en el ámbito del dashboard.
- Diferir el gráfico si queda fuera del contenido crítico inicial.

Criterio de aceptación: Chart.js no debe formar parte del chunk principal.

Resultado medido:

- Se retiró `withDefaultRegisterables()` de la configuración global.
- El componente de gráfico circular conserva un provider local con únicamente
  `PieController`, `ArcElement`, `Tooltip` y `Legend`.
- Chart.js pasó de aproximadamente 213 kB en el chunk principal a 0 kB en el
  build de producción actual, porque el componente no se monta en ninguna
  ruta activa.
- El total inicial bajó de 981.98 kB a 811.72 kB y la transferencia estimada
  bajó de 243.66 kB a 193.12 kB.

### 3. Imágenes y caché

Estado: completado en la primera iteración.

- Priorizar la imagen LCP del login y diferir imágenes secundarias.
- Declarar dimensiones para evitar saltos de layout.
- Reducir los logos que tienen dimensiones fuente muy superiores a su uso.
- Configurar cache inmutable para assets con hash y revalidación para
  `index.html` en Firebase Hosting.

Criterio de aceptación: no degradar la calidad visual y conservar la
actualización inmediata de nuevas versiones.

Resultado:

- La imagen principal del login declara dimensiones, decodificación asíncrona
  y prioridad alta.
- Las miniaturas de evidencia declaran dimensiones y carga diferida.
- `index.html` se revalida, mientras JavaScript, CSS y fuentes con nombre
  versionado usan cache inmutable de un año.
- La conversión de imágenes existentes a formatos alternativos queda como
  optimización posterior: sus tamaños actuales no justifican mezclar una
  modificación visual binaria con este refactor estructural.

### 4. Carga de Firebase por capacidad

Estado: completado en el alcance seguro de esta iteración.

- Mantener Auth disponible durante el arranque.
- Evaluar la carga diferida de Firestore, Storage y Functions detrás de las
  rutas autenticadas y de las acciones que realmente los necesitan.
- Preservar los puertos y adapters existentes.

Criterio de aceptación: login, guards y sincronización de tokens deben seguir
funcionando sin carreras ni cambios de permisos.

Resultado:

- Firebase Storage se retiró del arranque porque no tenía consumidores. Las
  cargas actuales pasan por Cloud Functions con validación privilegiada.
- Firebase Functions se importa al ejecutar la primera callable y quedó en un
  chunk lazy de aproximadamente 10 kB.
- Auth y Firestore permanecen en el arranque: el perfil `users/{uid}` es parte
  de la validación de sesión y estado activo. Diferir Firestore requeriría un
  contrato de autenticación diferente y se documentó como decisión separada.
- El total inicial bajó de 811.72 kB a 793.32 kB y la transferencia estimada
  bajó de 193.12 kB a 188.36 kB.

### 5. Consultas limitadas y ciclo de listeners

Estado: en progreso; ciclo de listeners y documento materializado del dashboard
completados, paginación de listados pendiente.

- Reemplazar paginación visual basada únicamente en `slice()` por consultas
  con `limit()`, `orderBy()` y cursores.
- Aplicar filtros de dominio desde Firestore cuando exista un índice seguro.
- Liberar listeners al cerrar sesión o al salir de una capacidad que no
  requiere sincronización en segundo plano.
- Evitar duplicar lecturas entre dashboard y listados.

Criterio de aceptación: el número de documentos descargados debe depender del
tamaño de página, no del tamaño total de la colección.

Orden de implementación acordado:

1. Separar los contratos de listado paginado de los datos agregados del
   dashboard. Completado.
2. Introducir cursores tipados por repositorio sin filtrar tipos de Firebase
   hacia el dominio.
3. Migrar primero Clientes y Servicios, cuyos listados no alimentan el flujo
   operativo de detalle.
4. Migrar Órdenes y Cotizaciones junto con sus métricas para no mostrar KPI
   parciales.
5. Incorporar liberación o conteo de consumidores para listeners compartidos;
   detenerlos directamente en `ngOnDestroy` podría crear una carrera cuando
   dos rutas usan la misma fachada durante una navegación. Completado.

Resultado del incremento de ciclo de listeners:

- Se creó un único contrato `ReleaseListener` y un listener con conteo de
  referencias para compartir una suscripción entre varios consumidores.
- Clientes, etiquetas, servicios, categorías, órdenes, cotizaciones,
  técnicos, usuarios internos y configuración liberan sus listeners cuando
  deja de existir el último componente que los usa.
- Los reintentos por un `permission-denied` transitorio se cancelan si el
  usuario abandona la capacidad antes de que venza el temporizador.
- Cada componente registra la liberación con `DestroyRef`; el detalle de una
  orden inicia además su propio listener, por lo que una URL directa ya no
  depende de haber visitado el listado previamente.

Resultado del incremento de datos sintéticos del dashboard:

- Se incorporó `DashboardRepository` como puerto independiente y una
  `DashboardFacade` que expone Signals sin conocer Firebase.
- La ruta escucha exclusivamente `dashboardMetrics/current`, un documento
  materializado pequeño con los KPI, cinco órdenes recientes y cinco próximas
  visitas. Una actualización reemplaza el snapshot completo, por lo que el
  navegador no descarga las colecciones operativas.
- Tres triggers de Cloud Functions recalculan el documento cuando cambia una
  orden, una cotización o un usuario que era/es técnico. Así, crear o editar
  estas entidades se refleja en las sesiones que tengan abierto el dashboard.
- El cálculo del backend usa agregaciones `count()` por estado y consultas
  limitadas. `sourceEventAt` evita que una ejecución antigua que termine tarde
  sobrescriba el resultado producido por un evento más reciente.
- Si el documento todavía no existe o lleva más de cinco minutos sin
  calcularse, el repositorio ejecuta una lectura agregada y limitada como
  respaldo. Esto permite inicializar instalaciones existentes y refresca los
  indicadores que cambian únicamente por el paso del tiempo, incluso cuando
  no hubo escrituras que dispararan un trigger.
- Se eliminó por completo la lectura de Clientes desde el dashboard, porque
  la pantalla no consumía esa colección.
- Las reglas permiten leer el snapshot solo a ADMIN, COMMERCIAL y COORDINATOR;
  ninguna aplicación cliente puede escribirlo. Las pantallas operativas
  conservan sus propios listeners en tiempo real y contratos de escritura.
- Se añadieron los índices compuestos `status + scheduledStart` y
  `status + scheduledEnd`, necesarios para próximas visitas y vencimientos.
- El build actual es de 797.94 kB sin comprimir y 189.66 kB de transferencia
  estimada; la ruta lazy del dashboard pesa 34.47 kB sin comprimir.
- Las 186 pruebas web y las 9 pruebas de reglas/materialización con el
  emulador de Firestore están aprobadas. El lint web y el build TypeScript de
  Functions también pasan sin errores.
- El siguiente incremento es introducir cursores tipados en Clientes y
  Servicios, ahora sin riesgo de alterar los KPI globales.

## Verificación por incremento

Después de cada bloque:

```bash
cd apps/web
npm test
npm run lint
npm run build -- --stats-json
```

Se registrarán en este documento el resultado, las diferencias frente a la
línea base y cualquier riesgo pendiente. Los cambios de consultas Firebase se
validarán además contra los emuladores y las reglas antes de desplegarse.

## Objetivos iniciales

| Métrica | Objetivo de la primera fase |
| --- | ---: |
| Total inicial sin comprimir | 1.0–1.2 MB |
| Transferencia inicial estimada | 220–280 kB |
| Chart.js en el chunk principal | 0 kB |
| Regresión funcional | 0 pruebas fallidas |

Estos valores son objetivos, no presupuestos artificiales. Se ajustarán con
las mediciones reales de cada incremento.

## Resultado de la primera iteración

| Métrica | Línea base | Resultado | Mejora aproximada |
| --- | ---: | ---: | ---: |
| Total inicial sin comprimir | 1.94 MB | 793.32 kB | 59 % |
| Transferencia inicial estimada | 410.50 kB | 188.36 kB | 54 % |
| JavaScript inicial | 1.90 MB | 756.63 kB | 60 % |
| Advertencia de presupuesto inicial | Sí | No | resuelta |

Verificación final del incremento:

- 64 archivos de pruebas aprobados.
- 185 pruebas aprobadas.
- Lint sin errores.
- Build de producción correcto con `stats.json`.
- `firebase.json` válido.

Los warnings restantes pertenecen a presupuestos SCSS por componente y a
dependencias CommonJS transitivas de jsPDF/Quill. No bloquean el build ni
forman parte del bundle inicial crítico de las rutas que no usan esas
capacidades.
