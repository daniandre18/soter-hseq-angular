# ADR 0003 — Estrategia de carga progresiva para la aplicación web

## Contexto

El build de producción cargaba 1.94 MB de recursos iniciales sin comprimir.
Todas las páginas se importaban de forma eager, Chart.js se registraba de
forma global y los SDK de Firebase Storage y Functions se inicializaban en el
arranque aunque la mayoría de las sesiones no los necesitaran.

Firebase Auth y Firestore tienen una dependencia distinta: antes de entrar a
una ruta privada, `AuthFacade` valida tanto la sesión como el documento
`users/{uid}`, incluido su estado `ACTIVE` y su rol. Por lo tanto, retirar
Firestore del arranque cambiaría el contrato de autenticación y podría abrir
carreras de permisos.

## Decisión

- Cargar todas las páginas Angular mediante `loadComponent()`.
- Mantener únicamente la configuración global indispensable.
- Registrar Chart.js en el componente que lo consume y solo con los elementos
  requeridos por un gráfico circular.
- Eliminar la inicialización de Firebase Storage mientras no exista un
  consumidor web directo; las cargas privilegiadas actuales usan Functions.
- Importar Firebase Functions bajo demanda al ejecutar una callable.
- Mantener Auth y Firestore en el arranque hasta que exista un contrato de
  perfil autenticado que permita separar ambos sin debilitar la validación.
- Compartir cada listener de dominio mediante conteo de consumidores y
  liberarlo cuando el último componente abandona la capacidad.
- Resolver el dashboard con un puerto de lectura sintética que escucha un único
  documento materializado (`dashboardMetrics/current`). Cloud Functions lo
  recalcula con agregaciones y consultas limitadas ante cambios de órdenes,
  cotizaciones o técnicos.
- Mantener en el adapter web una consulta agregada de respaldo cuando el
  documento materializado no exista o tenga más de cinco minutos. Esto cubre
  tanto el arranque inicial como los indicadores dependientes del reloj.
- Tratar la paginación como un incremento posterior, porque el dashboard
  actual calcula indicadores sobre colecciones completas.

## Alternativas consideradas

### Mantener todos los imports globales

Descartada porque obliga a cada usuario a descargar código de rutas y
capacidades que quizás nunca use.

### Diferir también Firestore inmediatamente

Descartada en esta iteración. El login y los guards consultan el perfil para
comprobar rol, vínculo de cliente y estado activo. Mover esa información a
custom claims o a una Function es una decisión de seguridad independiente.

### Paginar los stores actuales sin separar métricas

Descartada porque haría que los KPI del dashboard se calcularan únicamente
sobre la primera página y mostrarían cifras incorrectas.

## Consecuencias

- El bundle inicial cumple holgadamente el presupuesto de 1.60 MB.
- La primera visita a cada feature realiza una petición adicional de chunk.
- Firebase Functions conserva la misma API de dominio, pero su primera
  operación incluye la descarga del SDK correspondiente.
- Firestore continúa siendo la mayor dependencia del arranque por una razón
  funcional y de seguridad explícita.
- Las vistas ya no mantienen listeners de dominio activos durante el resto de
  la sesión; dos vistas simultáneas siguen compartiendo una sola suscripción.
- El dashboard mantiene un listener sobre un único documento y no abre
  listeners sobre las colecciones completas de clientes, órdenes o
  cotizaciones. Sus KPI se actualizan en tiempo real después de las escrituras
  relevantes, con consistencia eventual mientras termina la Function.
- Las escrituras del snapshot quedan reservadas al Admin SDK; las reglas solo
  permiten su lectura a los mismos roles que pueden abrir el dashboard.
- La paginación requerirá separar datos de listado, datos recientes e
  indicadores agregados antes de limitar las consultas.
