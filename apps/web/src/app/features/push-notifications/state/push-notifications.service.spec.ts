import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PUSH_NOTIFICATIONS_GATEWAY } from '../domain/push-notifications.gateway';
import { PushNotificationsService } from './push-notifications.service';

// jsdom/happy-dom no implementan la Notification API — se define un stub
// mínimo para poder controlar el permiso desde cada prueba.
class NotificationStub {
  static permission: NotificationPermission = 'default';
  static requestPermission = (): Promise<NotificationPermission> =>
    Promise.resolve(NotificationStub.permission);
}

describe('PushNotificationsService', () => {
  const originalNotification = globalThis.Notification;

  beforeEach(() => {
    (globalThis as unknown as { Notification: unknown }).Notification = NotificationStub;
  });

  afterEach(() => {
    (globalThis as unknown as { Notification: unknown }).Notification = originalNotification;
  });

  function setup(swPushStub: Partial<SwPush>) {
    const saveSubscription = vi.fn().mockResolvedValue(undefined);
    const deleteSubscription = vi.fn().mockResolvedValue(undefined);
    const navigateByUrl = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        PushNotificationsService,
        { provide: SwPush, useValue: swPushStub },
        { provide: PUSH_NOTIFICATIONS_GATEWAY, useValue: { saveSubscription, deleteSubscription } },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });

    return {
      service: TestBed.inject(PushNotificationsService),
      saveSubscription,
      deleteSubscription,
      navigateByUrl,
    };
  }

  it('does nothing when the browser has no service worker support', async () => {
    const { service, saveSubscription } = setup({ isEnabled: false });

    const result = await service.enable();

    expect(result).toBe(false);
    expect(saveSubscription).not.toHaveBeenCalled();
  });

  it('does not subscribe when the user denies the permission', async () => {
    NotificationStub.permission = 'denied';
    const { service, saveSubscription } = setup({ isEnabled: true });

    const result = await service.enable();

    expect(result).toBe(false);
    expect(saveSubscription).not.toHaveBeenCalled();
  });

  it('saves the subscription when the permission is granted', async () => {
    NotificationStub.permission = 'granted';
    const fakeSubscription = {
      toJSON: () => ({
        endpoint: 'https://push.example.com/abc',
        keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
      }),
    };
    const { service, saveSubscription } = setup({
      isEnabled: true,
      requestSubscription: vi.fn().mockResolvedValue(fakeSubscription),
    } as unknown as Partial<SwPush>);

    const result = await service.enable();

    expect(result).toBe(true);
    expect(saveSubscription).toHaveBeenCalledWith({
      endpoint: 'https://push.example.com/abc',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    });
  });

  it('deletes the subscription on disable', async () => {
    const fakeSubscription = {
      endpoint: 'https://push.example.com/abc',
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const { service, deleteSubscription } = setup({
      isEnabled: true,
      subscription: of(fakeSubscription),
    } as unknown as Partial<SwPush>);

    await service.disable();

    expect(deleteSubscription).toHaveBeenCalledWith('https://push.example.com/abc');
    expect(fakeSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('navigates to the notification data url when clicked', () => {
    const notificationClicks = of({
      action: '',
      notification: { data: { url: '/ordenes/VIS-0005' } } as unknown as NotificationOptions,
    });
    const { service, navigateByUrl } = setup({
      isEnabled: true,
      notificationClicks,
    } as unknown as Partial<SwPush>);

    service.listenForClicks();

    expect(navigateByUrl).toHaveBeenCalledWith('/ordenes/VIS-0005');
  });
});
