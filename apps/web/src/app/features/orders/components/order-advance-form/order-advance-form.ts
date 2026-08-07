import { Component, inject, input, linkedSignal, signal } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/components/button/button';
import { ProgressBar } from '../../../../shared/components/progress-bar/progress-bar';
import { ToastService } from '../../../../shared/services/toast.service';
import { OrdersFacade } from '../../facades/orders.facade';
import type { ServiceOrder } from '../../models/order.model';

type AdvanceStatus = 'NORMAL' | 'INCIDENT';

/**
 * "Registro de Avance": actividad realizada + % de avance + si el avance
 * es una novedad (hallazgo/incidente) en vez de progreso normal. La
 * actividad se guarda como `TechnicalNote` — `ACTIVITY` en curso normal,
 * `INCIDENT` si se marca "Novedad" — y el porcentaje aparte, vía
 * `updateProgress` sin nota embebida (evita duplicar el mismo texto en dos
 * notas distintas). Gate: `canLog` (igual que el resto del registro de
 * campo en CLAUDE.md §3.4).
 */
@Component({
  selector: 'app-order-advance-form',
  imports: [Button, ProgressBar, TranslocoPipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-advance-form.html',
  styleUrl: './order-advance-form.scss',
})
export class OrderAdvanceForm {
  private readonly ordersFacade = inject(OrdersFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly order = input.required<ServiceOrder>();
  readonly canLog = input(false);

  protected readonly progressValue = linkedSignal(() => this.order().progress);
  protected readonly activityText = signal('');
  protected readonly status = signal<AdvanceStatus>('NORMAL');
  protected readonly saving = signal(false);

  protected onProgressInput(event: Event): void {
    this.progressValue.set(Number((event.target as HTMLInputElement).value));
  }

  protected onActivityInput(event: Event): void {
    this.activityText.set((event.target as HTMLTextAreaElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as AdvanceStatus);
  }

  protected async save(): Promise<void> {
    const order = this.order();
    this.saving.set(true);
    try {
      await this.ordersFacade.updateProgress(order.id, this.progressValue());
      const content = this.activityText().trim();
      if (content) {
        await this.ordersFacade.addNote(order.id, this.status() === 'INCIDENT' ? 'INCIDENT' : 'ACTIVITY', content);
      }
      this.activityText.set('');
      this.status.set('NORMAL');
      this.toast.success(this.transloco.translate('orders.toast.noteAdded'));
    } catch {
      this.toast.error(this.transloco.translate('orders.toast.noteError'));
    } finally {
      this.saving.set(false);
    }
  }
}
