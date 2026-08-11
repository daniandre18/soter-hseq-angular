import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly messages = signal<ToastMessage[]>([]);

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 6000);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  /** Toast sin auto-descarte, con un botón de acción — para avisos que el
   *  usuario debe decidir atender (ej. "nueva versión disponible"), no algo
   *  que deba desaparecer solo mientras todavía es relevante. */
  action(message: string, action: ToastAction): void {
    const id = ++this.nextId;
    this.messages.update((messages) => [...messages, { id, message, type: 'info', action }]);
  }

  dismiss(id: number): void {
    this.messages.update((messages) => messages.filter((message) => message.id !== id));
  }

  private show(message: string, type: ToastType, duration = 4000): void {
    const id = ++this.nextId;
    this.messages.update((messages) => [...messages, { id, message, type }]);
    window.setTimeout(() => this.dismiss(id), duration);
  }
}
