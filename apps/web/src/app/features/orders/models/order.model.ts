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

/**
 * Modelo de dominio de la colección `orders` (CLAUDE.md §9.5).
 * Los timestamps de Firestore se normalizan a `Date` en el repositorio/servicio
 * para que el resto de la app no dependa de tipos de Firebase.
 */
export interface ServiceOrder {
  id: string;
  orderNumber: string;
  quoteId: string;
  clientId: string;
  clientBusinessName: string;
  assignedTechnicianIds: string[];
  coordinatorId?: string;
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
