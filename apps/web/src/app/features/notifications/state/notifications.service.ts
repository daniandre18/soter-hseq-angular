import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NOTIFICATION_REPOSITORY } from '../domain/notification.repository';
import type { AppNotification } from '../models/notification.model';

/**
 * Fachada delgada sobre `NotificationRepository`. Sin Akita: es un inbox de
 * solo-lectura (más marcar-como-leído/descartado), no una entidad con CRUD
 * propio — `NotificationsFacade` lo consume vía `toSignal` directamente.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly repository = inject(NOTIFICATION_REPOSITORY);

  watchNotifications(): Observable<AppNotification[]> {
    return this.repository.watchAll();
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.repository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(notificationIds: string[], userId: string): Promise<void> {
    await this.repository.markAllAsRead(notificationIds, userId);
  }

  async dismiss(notificationId: string, userId: string): Promise<void> {
    await this.repository.dismiss(notificationId, userId);
  }

  async dismissAll(notificationIds: string[], userId: string): Promise<void> {
    await this.repository.dismissAll(notificationIds, userId);
  }
}
