import { Component, inject, input, output, signal } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/components/button/button';
import { ToastService } from '../../../../shared/services/toast.service';
import { OrdersFacade } from '../../facades/orders.facade';
import type { ServiceOrder } from '../../models/order.model';
import type { UserRole } from '../../../../core/models/user-role.model';

/**
 * Columna derecha, tarjeta de acciones — cambia de contenido según el rol:
 * TECHNICIAN ve "Solicitud de Cierre" (CLAUDE.md §3.4, nuevo flujo real vía
 * `OrdersFacade.requestClosure`, ver plan de rediseño); ADMIN/COORDINATOR
 * ve acciones rápidas (Editar, Cancelar Orden). "Iniciar Ejecución" es
 * visible para el técnico asignado antes de que la orden llegue a
 * `IN_PROGRESS`.
 */
@Component({
  selector: 'app-order-closure-actions-card',
  imports: [Button, TranslocoPipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-closure-actions-card.html',
  styleUrl: './order-closure-actions-card.scss',
})
export class OrderClosureActionsCard {
  private readonly ordersFacade = inject(OrdersFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly order = input.required<ServiceOrder>();
  readonly role = input.required<UserRole | null>();
  readonly canExecute = input(false);
  readonly canRequestClosure = input(false);
  readonly closureBlockedReason = input<string | null>(null);
  readonly canEditOrder = input(false);
  readonly canCancel = input(false);

  readonly editRequested = output<void>();

  protected readonly starting = signal(false);
  protected readonly observations = signal('');
  protected readonly submittingClosure = signal(false);
  protected readonly cancelling = signal(false);

  protected async startExecution(): Promise<void> {
    this.starting.set(true);
    try {
      await this.ordersFacade.updateStatus(this.order().id, 'IN_PROGRESS');
    } finally {
      this.starting.set(false);
    }
  }

  protected async requestClosure(): Promise<void> {
    if (this.closureBlockedReason()) {
      return;
    }
    this.submittingClosure.set(true);
    try {
      await this.ordersFacade.requestClosure(this.order().id, this.observations().trim() || undefined);
      this.observations.set('');
      this.toast.success(this.transloco.translate('orders.page.closure.success'));
    } catch {
      this.toast.error(this.transloco.translate('orders.toast.statusError'));
    } finally {
      this.submittingClosure.set(false);
    }
  }

  protected async cancelOrder(): Promise<void> {
    this.cancelling.set(true);
    try {
      await this.ordersFacade.updateStatus(this.order().id, 'CANCELLED');
    } finally {
      this.cancelling.set(false);
    }
  }
}
