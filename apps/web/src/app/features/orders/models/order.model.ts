export type OrderStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'EVIDENCE_PENDING'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'APPROVED'
  | 'CLOSED'
  | 'CANCELLED';

export type OrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Modelo de dominio de la colección `orders` (CLAUDE.md §9.5), extendido con
 * `title`/`priority`/`dueDate`/`description`/`progress` para soportar la
 * creación manual de órdenes (además de la conversión desde cotización).
 * Los timestamps de Firestore se normalizan a `Date` en el repositorio/servicio
 * para que el resto de la app no dependa de tipos de Firebase.
 */
export interface ServiceOrder {
  id: string;
  orderNumber: string;
  /** Ausente en órdenes creadas manualmente (no vienen de una cotización). */
  quoteId?: string;
  /** Denormalizado junto con `quoteId` (mismo criterio que `clientBusinessName`):
   *  un técnico puede leer su orden pero no la colección `quotes`, así que el
   *  número debe venir copiado aquí para poder mostrarse sin una lectura aparte. */
  quoteNumber?: string;
  clientId: string;
  clientBusinessName: string;
  assignedTechnicianIds: string[];
  /** Denormalizado junto con `assignedTechnicianIds` (mismo criterio que
   *  `clientBusinessName`/`quoteNumber`): un VIEWER solo puede leer su propia
   *  orden, no la colección `users`, así que el nombre debe venir copiado
   *  aquí para poder mostrar "qué técnico va a ir" sin una lectura aparte. */
  assignedTechnicianNames?: string[];
  coordinatorId?: string;
  title: string;
  priority: OrderPriority;
  /** Fecha límite comprometida con el cliente — distinta de `scheduledStart`
   *  (la visita de campo puede programarse antes del vencimiento). */
  dueDate?: Date;
  description?: string;
  /** Avance manual (0-100), editable independientemente del estado. */
  progress: number;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  serviceAddress?: string;
  city?: string;
  status: OrderStatus;
  serviceSummary: string;
  technicalNotes?: string;
  findings?: string[];
  recommendations?: string[];
  evidenceCount: number;
  closingActId?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Una fila del formulario de creación manual (CLAUDE.md no define varios
 * servicios por orden — cada fila se convierte en su propia `ServiceOrder`
 * independiente, ver `OrdersService.createOrders`, no en un ítem anidado).
 */
export interface NewOrderServiceRow {
  serviceSummary: string;
  priority: OrderPriority;
  dueDate: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  description?: string;
}

export type OrderDetailsUpdate = Partial<
  Pick<
    ServiceOrder,
    'clientId' | 'clientBusinessName' | 'title' | 'serviceSummary' | 'priority' | 'dueDate' | 'description'
  >
>;
