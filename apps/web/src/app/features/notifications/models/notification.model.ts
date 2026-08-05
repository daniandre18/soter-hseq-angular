import type { IconName } from '../../../shared/components/icon/icon';

export type NotificationType =
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_ASSIGNED'
  | 'NOTE_ADDED'
  | 'EVIDENCE_UPLOADED'
  | 'QUOTE_STATUS_CHANGED';

export type NotificationEntityType = 'ORDER' | 'QUOTE';

/** Modelo de dominio de la colección `notifications`, escrita solo por
 *  Cloud Functions (`firestore.rules`: `allow create: if false`). Visible
 *  para ADMIN/COORDINATOR; los arrays de usuarios conservan el estado
 *  individual sin eliminar el evento compartido. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  entityType: NotificationEntityType;
  entityId: string;
  readBy: string[];
  dismissedBy: string[];
  createdAt: Date;
  createdBy: string;
}

export const NOTIFICATION_TYPE_ICON: Record<NotificationType, IconName> = {
  ORDER_STATUS_CHANGED: 'clock',
  ORDER_ASSIGNED: 'hard-hat',
  NOTE_ADDED: 'file-text',
  EVIDENCE_UPLOADED: 'clipboard-list',
  QUOTE_STATUS_CHANGED: 'circle-check-big',
};

/** Ruta de listado a la que navega el CTA "Ver..." — no hay deep-link por id
 *  todavía (ni órdenes ni cotizaciones tienen ruta `/:id`, CLAUDE.md pendiente). */
export const NOTIFICATION_ENTITY_ROUTE: Record<NotificationEntityType, string> = {
  ORDER: '/ordenes',
  QUOTE: '/cotizaciones',
};
