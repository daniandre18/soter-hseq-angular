export type OrderEventAction =
  | 'NOTE_ADDED'
  | 'EVIDENCE_UPLOADED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_ASSIGNED'
  | 'ORDER_CLOSED';

/**
 * Modelo de dominio de la subcolección `orders/{orderId}/events` (CLAUDE.md §9.9,
 * normalizado al esquema de `AuditEvent`). Solo el backend escribe aquí
 * (`firestore.rules`: `allow write: if false`) — se puebla mediante triggers de
 * Firestore en `functions/src/index.ts`.
 */
export interface OrderEvent {
  id: string;
  entityType: 'ORDER';
  entityId: string;
  action: OrderEventAction;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  createdBy: string;
}

export const ORDER_EVENT_ACTION_TRANSLATION_KEYS: Record<OrderEventAction, `orders.eventAction.${string}`> = {
  NOTE_ADDED: 'orders.eventAction.noteAdded',
  EVIDENCE_UPLOADED: 'orders.eventAction.evidenceUploaded',
  ORDER_STATUS_CHANGED: 'orders.eventAction.statusChanged',
  ORDER_ASSIGNED: 'orders.eventAction.techniciansAssigned',
  ORDER_CLOSED: 'orders.eventAction.orderClosed',
};
