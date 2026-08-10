import type { IconName } from '../../../shared/components/icon/icon';

export type NotificationType =
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_ASSIGNED'
  | 'NOTE_ADDED'
  | 'EVIDENCE_UPLOADED'
  | 'QUOTE_STATUS_CHANGED'
  | 'CLOSING_ACT_CLIENT_DECISION';

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
  CLOSING_ACT_CLIENT_DECISION: 'file-text',
};
