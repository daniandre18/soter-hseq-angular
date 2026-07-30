import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrdersQuery } from '../state/orders.query';
import { OrdersService } from '../state/orders.service';

/**
 * Único punto de contacto entre la UI y el feature de órdenes.
 * Encapsula Akita (Store/Query) y Firestore (Service); los componentes
 * solo leen Signals, nunca el pipe `async` ni la Query directamente.
 */
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  private readonly query = inject(OrdersQuery);
  private readonly service = inject(OrdersService);

  readonly orders = toSignal(this.query.orders$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });
  readonly error = toSignal(this.query.error$, { initialValue: null });

  readonly assignedCount = computed(
    () => this.orders().filter((order) => order.status === 'ASSIGNED').length,
  );
  readonly inProgressCount = computed(
    () => this.orders().filter((order) => order.status === 'IN_PROGRESS').length,
  );
  readonly underReviewCount = computed(
    () => this.orders().filter((order) => order.status === 'UNDER_REVIEW').length,
  );
  readonly closedCount = computed(
    () => this.orders().filter((order) => order.status === 'CLOSED').length,
  );

  init(): void {
    this.service.watchOrders();
  }

  async generateClosingActDraft(orderId: string, notes: string): Promise<void> {
    try {
      await this.service.generateClosingActDraft(orderId, notes);
    } catch (error) {
      console.error('Error generando el borrador del acta de cierre:', error);
      throw error;
    }
  }
}
