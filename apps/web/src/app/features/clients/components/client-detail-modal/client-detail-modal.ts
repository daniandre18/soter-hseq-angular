import { Component, computed, inject, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { ClientsFacade } from '../../facades/clients.facade';
import { OrdersFacade } from '../../../orders/facades/orders.facade';
import type { Client } from '../../models/client.model';

@Component({
  selector: 'app-client-detail-modal',
  imports: [Modal, StatusBadge],
  templateUrl: './client-detail-modal.html',
  styleUrl: './client-detail-modal.scss',
})
export class ClientDetailModal {
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly ordersFacade = inject(OrdersFacade);

  readonly client = input<Client | null>(null);
  readonly closeRequested = output<void>();

  protected readonly contacts = toSignal(
    toObservable(this.client).pipe(
      switchMap((client) => (client ? this.clientsFacade.watchContacts(client.id) : of([]))),
    ),
    { initialValue: [] },
  );

  protected readonly clientOrders = computed(() => {
    const client = this.client();
    if (!client) {
      return [];
    }
    return this.ordersFacade.orders().filter((order) => order.clientId === client.id);
  });

  protected close(): void {
    this.closeRequested.emit();
  }
}
