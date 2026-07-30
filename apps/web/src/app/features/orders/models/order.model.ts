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
  clientId: string;
  clientBusinessName: string;
  assignedTechnicianIds: string[];
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

export interface NewOrderData {
  clientId: string;
  clientBusinessName: string;
  title: string;
  serviceSummary: string;
  priority: OrderPriority;
  dueDate: Date;
  description?: string;
  technicianId?: string;
}

export type OrderDetailsUpdate = Partial<
  Pick<
    ServiceOrder,
    'clientId' | 'clientBusinessName' | 'title' | 'serviceSummary' | 'priority' | 'dueDate' | 'description'
  >
>;
