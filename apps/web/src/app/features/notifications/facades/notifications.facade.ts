import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthFacade } from '../../auth/facades/auth.facade';
import { NotificationsService } from '../state/notifications.service';

/**
 * Único punto de contacto entre la UI y la colección `notifications`.
 * Sin Akita: es un inbox de solo-lectura + una acción de escritura acotada
 * (marcar leído), no una entidad con CRUD propio — mismo criterio que
 * `OrdersFacade.watchNotes`/`watchEvidence` (Observable → Signal directo).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsFacade {
  private readonly service = inject(NotificationsService);
  private readonly authFacade = inject(AuthFacade);

  private readonly allNotifications = toSignal(this.service.watchNotifications(), {
    initialValue: [],
  });

  readonly notifications = computed(() => {
    const userId = this.authFacade.currentUser()?.id;
    if (!userId) {
      return [];
    }
    return this.allNotifications().filter(
      (notification) => !notification.dismissedBy.includes(userId),
    );
  });

  readonly unreadCount = computed(() => {
    const userId = this.authFacade.currentUser()?.id;
    if (!userId) {
      return 0;
    }
    return this.notifications().filter((notification) => !notification.readBy.includes(userId))
      .length;
  });

  async markAsRead(notificationId: string): Promise<void> {
    const userId = this.authFacade.currentUser()?.id;
    if (!userId) {
      return;
    }
    await this.service.markAsRead(notificationId, userId);
  }

  async markAllAsRead(): Promise<void> {
    const userId = this.authFacade.currentUser()?.id;
    if (!userId) {
      return;
    }
    const unreadIds = this.notifications()
      .filter((notification) => !notification.readBy.includes(userId))
      .map((notification) => notification.id);
    await this.service.markAllAsRead(unreadIds, userId);
  }

  async dismiss(notificationId: string): Promise<void> {
    const userId = this.authFacade.currentUser()?.id;
    if (!userId) {
      return;
    }
    await this.service.dismiss(notificationId, userId);
  }

  async dismissAll(): Promise<void> {
    const userId = this.authFacade.currentUser()?.id;
    if (!userId) {
      return;
    }
    await this.service.dismissAll(
      this.notifications().map((notification) => notification.id),
      userId,
    );
  }
}
