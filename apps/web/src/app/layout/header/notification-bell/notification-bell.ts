import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';
import { LocalizedRelativeTimePipe } from '../../../shared/pipes/localized-relative-time.pipe';
import { translateDomainCodes } from '../../../shared/utils/domain-labels';
import { AuthFacade } from '../../../features/auth/facades/auth.facade';
import { NotificationsFacade } from '../../../features/notifications/facades/notifications.facade';
import {
  NOTIFICATION_TYPE_ICON,
  type AppNotification,
} from '../../../features/notifications/models/notification.model';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';

/**
 * Inbox de notificaciones del header (ADMIN/COORDINATOR — CLAUDE.md §3.1/§3.3):
 * avisa en tiempo real cuando cambia el estado de una orden/cotización, se
 * asigna un técnico, o se agrega una nota/evidencia. Ver
 * `orders/{orderId}/events` para la bitácora por orden — esto es el inbox
 * global con estado de lectura, poblado por los mismos triggers.
 */
@Component({
  selector: 'app-notification-bell',
  imports: [RouterLink, Icon, LocalizedRelativeTimePipe, TranslocoPipe],
  providers: [...provideTranslocoScope('notifications')],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBell {
  private readonly facade = inject(NotificationsFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly notifications = this.facade.notifications;
  protected readonly unreadCount = this.facade.unreadCount;
  protected readonly open = signal(false);
  protected readonly typeIcon = NOTIFICATION_TYPE_ICON;
  protected readonly translateDomainCodes = translateDomainCodes;

  protected isUnread(notification: AppNotification): boolean {
    const userId = this.authFacade.currentUser()?.id;
    return !!userId && !notification.readBy.includes(userId);
  }

  /** Las órdenes ya tienen ruta de detalle propia (`/ordenes/:id`); las
   *  cotizaciones todavía se abren desde su listado vía `?open=<id>`
   *  (fuera de alcance de este rediseño). */
  protected entityLink(notification: AppNotification): readonly (string | undefined)[] {
    return notification.entityType === 'ORDER'
      ? ['/ordenes', notification.entityId]
      : ['/cotizaciones'];
  }

  protected entityQueryParams(notification: AppNotification): Record<string, string> | null {
    return notification.entityType === 'ORDER' ? null : { open: notification.entityId };
  }

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onNotificationClick(notification: AppNotification): void {
    if (this.isUnread(notification)) {
      void this.facade.markAsRead(notification.id);
    }
    this.close();
  }

  protected markAllAsRead(): void {
    void this.facade.markAllAsRead();
  }

  protected dismiss(notificationId: string): void {
    void this.facade.dismiss(notificationId);
  }

  protected dismissAll(): void {
    void this.facade.dismissAll();
  }

  @HostListener('document:click', ['$event.target'])
  protected onDocumentClick(target: EventTarget | null): void {
    if (this.open() && target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.close();
    }
  }
}
