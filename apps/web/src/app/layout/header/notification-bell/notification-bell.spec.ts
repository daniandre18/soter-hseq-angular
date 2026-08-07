import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { NotificationBell } from './notification-bell';
import { NotificationsFacade } from '../../../features/notifications/facades/notifications.facade';
import { AuthFacade } from '../../../features/auth/facades/auth.facade';
import type { AppNotification } from '../../../features/notifications/models/notification.model';

@Component({ selector: 'app-blank', template: '' })
class BlankComponent {}

describe('NotificationBell', () => {
  let fixture: ComponentFixture<NotificationBell>;
  let markAsRead: ReturnType<typeof vi.fn>;
  let markAllAsRead: ReturnType<typeof vi.fn>;
  let dismiss: ReturnType<typeof vi.fn>;
  let dismissAll: ReturnType<typeof vi.fn>;

  const notification: AppNotification = {
    id: 'notif-1',
    type: 'ORDER_STATUS_CHANGED',
    title: 'Orden VIS-0005 actualizada',
    description: 'Estado cambiado de ASSIGNED a IN_PROGRESS',
    entityType: 'ORDER',
    entityId: 'order-1',
    readBy: [],
    dismissedBy: [],
    createdAt: new Date(),
    createdBy: 'tech-1',
  };

  beforeEach(async () => {
    markAsRead = vi.fn().mockResolvedValue(undefined);
    markAllAsRead = vi.fn().mockResolvedValue(undefined);
    dismiss = vi.fn().mockResolvedValue(undefined);
    dismissAll = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [NotificationBell],
      providers: [
        provideRouter([
          { path: 'ordenes/:id', component: BlankComponent },
          { path: 'cotizaciones', component: BlankComponent },
        ]),
        {
          provide: NotificationsFacade,
          useValue: {
            notifications: signal([notification]),
            unreadCount: signal(1),
            markAsRead,
            markAllAsRead,
            dismiss,
            dismissAll,
          },
        },
        {
          provide: AuthFacade,
          useValue: { currentUser: signal({ id: 'admin-1' }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the unread badge and toggles the panel on click', () => {
    expect(fixture.nativeElement.querySelector('.bell-badge')?.textContent?.trim()).toBe('1');
    expect(fixture.nativeElement.querySelector('.notification-panel')).toBeFalsy();

    fixture.nativeElement.querySelector('.bell-button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.notification-panel')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Orden VIS-0005 actualizada');
  });

  it('marks a notification as read when its CTA is clicked', async () => {
    fixture.nativeElement.querySelector('.bell-button').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.notification-cta').click();
    // Deja resolver la navegación real de `routerLink` (provideRouter([]))
    // antes de que el test termine y TestBed destruya el injector — si no,
    // la promesa de navegación rechaza después, como unhandled rejection.
    await fixture.whenStable();

    expect(markAsRead).toHaveBeenCalledWith('notif-1');
  });

  it('marks all as read when the header action is clicked', () => {
    fixture.nativeElement.querySelector('.bell-button').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.mark-all-read-btn').click();

    expect(markAllAsRead).toHaveBeenCalled();
  });

  it('dismisses one notification from its close button', () => {
    fixture.nativeElement.querySelector('.bell-button').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.notification-dismiss-btn').click();

    expect(dismiss).toHaveBeenCalledWith('notif-1');
  });

  it('dismisses all notifications from the footer action', () => {
    fixture.nativeElement.querySelector('.bell-button').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.dismiss-all-btn').click();

    expect(dismissAll).toHaveBeenCalled();
  });
});
