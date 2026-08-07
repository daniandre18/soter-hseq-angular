import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { AppNotification } from '../models/notification.model';

/**
 * Puerto de acceso al inbox de notificaciones. Solo lectura + marcar como
 * leída/descartada: la creación es exclusiva de Cloud Functions
 * (`firestore.rules`: `allow create: if false`).
 */
export interface NotificationRepository {
  watchAll(): Observable<AppNotification[]>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  markAllAsRead(notificationIds: string[], userId: string): Promise<void>;
  dismiss(notificationId: string, userId: string): Promise<void>;
  dismissAll(notificationIds: string[], userId: string): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = new InjectionToken<NotificationRepository>(
  'NOTIFICATION_REPOSITORY',
);
