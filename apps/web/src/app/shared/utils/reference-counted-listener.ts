import type { Subscription } from 'rxjs';

export type ReleaseListener = () => void;

/**
 * Comparte una única suscripción entre varios consumidores y la libera
 * cuando el último sale de la vista. También conserva el mismo conteo al
 * reintentar una conexión que falló de forma transitoria.
 */
export class ReferenceCountedListener {
  private consumers = 0;
  private subscription: Subscription | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connect: (() => Subscription) | null = null;

  acquire(connect: () => Subscription): ReleaseListener {
    this.consumers += 1;
    this.connect ??= connect;
    this.ensureConnected();

    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      this.consumers = Math.max(0, this.consumers - 1);
      if (this.consumers === 0) {
        this.stop();
      }
    };
  }

  markDisconnected(): void {
    this.subscription = null;
  }

  retryAfter(delayMs: number): void {
    this.markDisconnected();
    if (this.consumers === 0 || this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, delayMs);
  }

  private ensureConnected(): void {
    if (this.subscription || this.reconnectTimer || !this.connect || this.consumers === 0) {
      return;
    }
    this.subscription = this.connect();
  }

  private stop(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.connect = null;
  }
}
