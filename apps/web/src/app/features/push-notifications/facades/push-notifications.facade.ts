import { Injectable, inject, signal } from '@angular/core';
import { PushNotificationsService } from '../state/push-notifications.service';

@Injectable({ providedIn: 'root' })
export class PushNotificationsFacade {
  private readonly service = inject(PushNotificationsService);

  readonly enabled = signal(false);
  readonly enabling = signal(false);
  readonly error = signal<string | null>(null);

  readonly supported = this.service.supported;

  async enable(): Promise<void> {
    this.enabling.set(true);
    this.error.set(null);
    try {
      const granted = await this.service.enable();
      this.enabled.set(granted);
      if (!granted) {
        this.error.set('No se pudo activar: revisa el permiso de notificaciones del navegador.');
      }
    } catch {
      this.error.set('No se pudo activar las notificaciones. Intenta de nuevo.');
    } finally {
      this.enabling.set(false);
    }
  }

  async disable(): Promise<void> {
    this.enabling.set(true);
    try {
      await this.service.disable();
    } finally {
      this.enabled.set(false);
      this.enabling.set(false);
    }
  }
}
