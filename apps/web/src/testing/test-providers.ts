import type { Translation, TranslocoLoader } from '@jsverse/transloco';
import { provideTransloco } from '@jsverse/transloco';
import { of, type Observable } from 'rxjs';

const GLOBAL_ES: Translation = {
  languages: { selectorLabel: 'Seleccionar idioma', spanish: 'Español', english: 'English' },
  common: {
    total: 'Total',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    combobox: {
      searchPlaceholder: 'Buscar...',
      clearSelection: 'Limpiar selección',
      noResults: 'Sin resultados',
    },
    phone: {
      country: 'País',
      countryAriaLabel: 'País del teléfono',
      label: 'Teléfono',
      tooShort: 'El número para {{country}} parece incompleto.',
      tooLong: 'El número para {{country}} tiene demasiados dígitos.',
      invalid: 'El número no es válido para {{country}}.',
    },
    countries: { CO: 'Colombia', US: 'Estados Unidos', MX: 'México' },
  },
  roles: {
    ADMIN: 'Administrador',
    COMMERCIAL: 'Comercial',
    COORDINATOR: 'Coordinador',
    TECHNICIAN: 'Técnico',
    VIEWER: 'Cliente',
  },
};

const SCOPES_ES: Record<string, Translation> = {
  auth: {
    brandTagline: 'Gestión Integral HSEQ & SST',
    demo: {
      preparing: 'Preparando tu perfil',
      validating: 'Validando permisos y cargando la información…',
      title: 'Selecciona un perfil',
      subtitle: 'Explora la plataforma con las funciones de cada rol',
      enterAs: 'Ingresar como {{role}}',
      footer: 'SOTER HSEQ · Demo académica · Colombia',
      profiles: {
        admin: 'Acceso total',
        commercial: 'Gestiona clientes',
        coordinator: 'Supervisa la operación',
        technician: 'Consulta sus órdenes',
        client: 'Consulta sus cotizaciones',
      },
    },
  },
  layout: {
    sections: {
      primary: 'Principal',
      commercial: 'Gestión comercial',
      operations: 'Gestión operativa',
    },
    navigation: {
      dashboard: 'Panel',
      orders: 'Órdenes de trabajo',
      myOrders: 'Mis órdenes',
      agenda: 'Agenda de visitas',
      clients: 'Clientes',
      quotes: 'Cotizaciones',
      services: 'Servicios',
      catalog: 'Catálogo',
      categories: 'Categorías',
      users: 'Usuarios',
      technicians: 'Técnicos',
    },
  },
  orders: {
    new: 'Nueva orden',
    unassignedTechnician: 'Sin técnico asignado',
    resultCountOne: '1 orden',
    resultCountOther: '{{count}} órdenes',
    status: { draft: 'Borrador', assigned: 'Asignada', inProgress: 'En progreso' },
    priority: { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' },
    noteType: {
      general: 'General',
      finding: 'Hallazgo',
      activity: 'Actividad',
      recommendation: 'Recomendación',
    },
    evidenceCategory: {
      before: 'Antes',
      during: 'Durante',
      after: 'Después',
      finding: 'Hallazgo',
      supportingDocument: 'Documento de soporte',
    },
    eventAction: {
      noteAdded: 'Nota agregada',
      evidenceUploaded: 'Evidencia cargada',
      statusChanged: 'Cambio de estado',
      techniciansAssigned: 'Técnicos asignados',
      orderClosed: 'Orden cerrada',
    },
    form: {
      client: 'Cliente',
      service: 'Servicio',
      visitDate: 'Fecha de visita',
      visitTime: 'Hora de visita',
      dueDate: 'Fecha límite',
      description: 'Descripción (opcional)',
      title: 'Título',
      priority: 'Prioridad',
    },
    detail: {
      changeStatus: 'Cambiar Estado',
      edit: 'Editar',
      starting: 'Iniciando…',
      startExecution: 'Iniciar Ejecución',
      sending: 'Enviando…',
      sendToReview: 'Enviar a Revisión',
      resendToReview: 'Reenviar a Revisión',
      cancelOrder: 'Cancelar Orden',
      tabsAriaLabel: 'Secciones de la orden',
      tabs: { information: 'Información', activity: 'Actividad', report: 'Acta' },
    },
    activity: {
      findings: 'Hallazgos',
      recommendations: 'Recomendaciones',
      note: 'Nota',
      evidence: 'Evidencia',
      correction: 'Corrección',
      filterAriaLabel: 'Filtrar actividad',
      filterAll: 'Todo',
      filterComments: 'Comentarios',
      filterHistory: 'Historial',
      empty: 'Sin actividad registrada.',
    },
  },
  quotes: {
    detail: {
      statusError:
        'No fue posible cambiar el estado. Verifica los permisos del perfil e inténtalo nuevamente.',
    },
    status: {
      draft: 'Borrador',
      sent: 'Enviada',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      converted: 'Convertida',
    },
  },
  dashboard: {},
  clients: {
    stats: {
      total: 'Total clientes',
      active: 'Clientes activos',
      rate: 'Tasa de actividad',
      cities: 'Ciudades cubiertas',
    },
    countOne: 'Mostrando 1 cliente',
    countOther: 'Mostrando {{count}} clientes',
    activeOne: '{{count}} activo',
    activeOther: '{{count}} activos',
    inactiveOne: '{{count}} inactivo',
    inactiveOther: '{{count}} inactivos',
    sites: 'Sedes',
    sitesAndContacts: 'Sedes y responsables',
    manageSites: 'Administrar sedes de {{name}}',
    portal: {
      title: 'Acceso al portal',
      description: 'Usuario autorizado para esta empresa.',
      active: 'Acceso activo',
      inactive: 'Acceso inactivo',
      empty: 'Este cliente todavía no tiene un usuario para ingresar al portal.',
      inviteUser: 'Invitar usuario',
      inviteTitle: 'Invitar usuario del cliente',
      inviteHelp: 'Recibirá una invitación.',
      replaceUser: 'Reemplazar usuario',
      replaceTitle: 'Reemplazar acceso actual',
      replaceHelp: 'El usuario anterior perderá el acceso.',
      fullName: 'Nombre completo',
      fullNamePlaceholder: 'Nombre de la persona autorizada',
      email: 'Correo de acceso',
      phone: 'Teléfono',
      sendInvitation: 'Crear y enviar invitación',
      confirmReplace: 'Reemplazar y enviar invitación',
      resendInvitation: 'Reenviar invitación',
      activateAccess: 'Activar acceso',
      deactivateAccess: 'Desactivar acceso',
      deactivateTitle: '¿Desactivar el acceso al portal?',
      deactivateHelp: 'La persona dejará de ingresar.',
      confirmDeactivate: 'Sí, desactivar',
      activating: 'Activando…',
      deactivating: 'Desactivando…',
      saving: 'Guardando…',
      sending: 'Enviando…',
      validation: {
        nameRequired: 'El nombre es obligatorio.',
        emailRequired: 'El correo es obligatorio.',
        emailInvalid: 'Ingresa un correo válido.',
      },
      messages: {
        invited: 'Invitación enviada.',
        createdWithoutEmail: 'Acceso creado sin correo.',
        resent: 'Invitación reenviada.',
        activated: 'Acceso activado.',
        deactivated: 'Acceso desactivado.',
        statusError: 'No se pudo cambiar el estado.',
        saveError: 'No se pudo guardar.',
        emailError: 'No se pudo enviar.',
      },
    },
    form: {
      createTitle: 'Nuevo cliente',
      editTitle: 'Editar cliente',
      businessName: 'Razón social',
      businessNamePlaceholder: 'Empresa S.A.S.',
      taxId: 'NIT',
      email: 'Correo',
      phone: 'Teléfono',
      address: 'Dirección',
      status: 'Estado',
      active: 'Activo',
      inactive: 'Inactivo',
      sitesTitle: 'Sedes y responsables',
      sitesOptional: 'Opcional',
      responsibleSummary: 'Responsable: {{name}} · {{phone}}',
      editSite: 'Editar sede {{name}}',
      deleteSite: 'Eliminar sede {{name}}',
      closeSiteForm: 'Cerrar formulario de sede',
      addSiteTitle: 'Agregar sede',
      editSiteTitle: 'Editar sede',
      siteName: 'Nombre de la sede',
      siteNamePlaceholder: 'Ej. Sede Norte',
      responsible: 'Responsable',
      fullNamePlaceholder: 'Nombre completo',
      position: 'Cargo',
      positionPlaceholder: 'Ej. Coordinador HSEQ',
      addSite: 'Agregar sede',
      saveChanges: 'Guardar cambios',
      addFirstSite: 'Agregar una sede',
      addAnotherSite: 'Agregar otra sede',
      manageSitesHelp: 'Administra {{name}}',
      manageSites: 'Administrar sedes',
      saving: 'Guardando…',
    },
  },
  services: { form: {} },
  users: {
    form: {},
    internal: {
      form: {
        createTitle: 'Invitar usuario interno',
        accessTitle: 'Acceso seguro por invitación',
        accessDescription: 'La persona recibirá un correo para definir su contraseña.',
        fullName: 'Nombre completo',
        email: 'Correo electrónico',
        jobTitle: 'Cargo',
        phone: 'Teléfono',
        role: 'Perfil de acceso',
        roleHint: 'El perfil define los permisos.',
        invite: 'Crear y enviar invitación',
      },
      validation: {},
    },
  },
  notifications: {
    title: 'Notificaciones',
    markAllRead: 'Marcar todo leído',
    empty: 'Sin notificaciones.',
    dismiss: 'Eliminar notificación',
    dismissWithTitle: 'Eliminar notificación: {{title}}',
    viewOrder: 'Ver orden →',
    viewQuote: 'Ver cotización →',
    dismissAll: 'Eliminar todas las notificaciones',
  },
};

// jsdom no implementa `window.matchMedia` — varios componentes lo usan para
// breakpoints responsivos (order-detail) o `prefers-color-scheme`
// (ThemeService). Sin este shim, cualquier spec que dispare su DI falla con
// "matchMedia is not a function" aunque el test no verifique nada de tema/
// responsive. `matches: false` es un default razonable (claro/desktop).
if (typeof window !== 'undefined' && !window.matchMedia) {
  const noop = (): undefined => undefined;
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

class TestTranslationLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    const [scope, language] = lang.split('/');
    if (!language) {
      return of(scope === 'es' ? GLOBAL_ES : {});
    }
    return of(language === 'es' ? (SCOPES_ES[scope] ?? {}) : {});
  }
}

export default [
  provideTransloco({
    config: {
      availableLangs: ['es', 'en'],
      defaultLang: 'es',
      fallbackLang: 'es',
      reRenderOnLangChange: true,
      missingHandler: { logMissingKey: false },
    },
    loader: TestTranslationLoader,
  }),
];
