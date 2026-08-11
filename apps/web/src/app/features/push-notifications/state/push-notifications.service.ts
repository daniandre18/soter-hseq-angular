import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PUSH_NOTIFICATIONS_GATEWAY } from '../domain/push-notifications.gateway';

interface PushClickData {
  url?: string;
}

/** Casos de uso de Web Push; la UI nunca toca `SwPush` ni Firestore directamente. */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly swPush = inject(SwPush);
  private readonly gateway = inject(PUSH_NOTIFICATIONS_GATEWAY);
  private readonly router = inject(Router);

  get supported(): boolean {
    return this.swPush.isEnabled;
  }

  /** Llamar solo tras una acción explícita del usuario (ej. un botón) —
   *  pedir el permiso sin interacción hace que el navegador lo bloquee
   *  para siempre en visitas futuras. */
  async enable(): Promise<boolean> {
    if (!this.swPush.isEnabled) {
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }

    const subscription = await this.swPush.requestSubscription({
      serverPublicKey: environment.vapidPublicKey,
    });

    const raw = subscription.toJSON();
    await this.gateway.saveSubscription({
      endpoint: raw.endpoint!,
      keys: { p256dh: raw.keys!['p256dh'], auth: raw.keys!['auth'] },
    });
    return true;
  }

  async disable(): Promise<void> {
    if (!this.swPush.isEnabled) {
      return;
    }
    const subscription = await this.swPush.subscription.toPromise();
    if (!subscription) {
      return;
    }
    await this.gateway.deleteSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }

  /** Se suscribe una sola vez al arrancar la app (ver `app.config.ts`) para
   *  redirigir al tocar la notificación, sin depender de que el usuario
   *  tenga abierto ningún componente en particular. */
  listenForClicks(): void {
    if (!this.swPush.isEnabled) {
      return;
    }
    this.swPush.notificationClicks.subscribe(({ notification }) => {
      const data = notification.data as PushClickData;
      if (data?.url) {
        this.router.navigateByUrl(data.url);
      }
    });
  }
}
