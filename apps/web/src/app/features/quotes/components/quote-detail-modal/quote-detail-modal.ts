import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { formatCurrency } from '../../../../shared/utils/format-currency';
import { formatDate } from '../../../../shared/utils/format-date';
import { QuotesFacade } from '../../facades/quotes.facade';
import { QUOTE_STATUS_CONFIG, nextQuoteStatuses } from '../../models/quote-status-config';
import type { Quote, QuoteStatus } from '../../models/quote.model';
import { OrdersFacade } from '../../../orders/facades/orders.facade';
import { ORDER_STATUS_CONFIG } from '../../../orders/models/order-status-config';
import type { ServiceOrder } from '../../../orders/models/order.model';

@Component({
  selector: 'app-quote-detail-modal',
  imports: [Modal, Button, StatusBadge, RouterLink],
  templateUrl: './quote-detail-modal.html',
  styleUrl: './quote-detail-modal.scss',
})
export class QuoteDetailModal {
  private readonly quotesFacade = inject(QuotesFacade);
  private readonly ordersFacade = inject(OrdersFacade);

  readonly quote = input<Quote | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDate = formatDate;
  protected readonly orderStatusConfig = ORDER_STATUS_CONFIG;
  protected readonly canManageQuotes = this.quotesFacade.canManageQuotes;

  protected readonly items = toSignal(
    toObservable(this.quote).pipe(
      switchMap((quote) => (quote ? this.quotesFacade.watchItems(quote.id) : of([]))),
    ),
    { initialValue: [] },
  );

  /** Órdenes generadas al convertir esta cotización — una por servicio
   *  (ver `QuotesService.convertToOrder`), resueltas desde `quote.orderIds`. */
  protected readonly relatedOrders = computed<ServiceOrder[]>(() => {
    const ids = this.quote()?.orderIds ?? [];
    if (ids.length === 0) {
      return [];
    }
    const orders = this.ordersFacade.orders();
    return ids
      .map((id) => orders.find((order) => order.id === id))
      .filter((order): order is ServiceOrder => order !== undefined);
  });

  constructor() {
    this.ordersFacade.init();
  }

  protected readonly statusLabel = computed(() => {
    const quote = this.quote();
    return quote ? QUOTE_STATUS_CONFIG[quote.status].label : '';
  });

  protected readonly statusColor = computed(() => {
    const quote = this.quote();
    return quote ? QUOTE_STATUS_CONFIG[quote.status].color : 'gray';
  });

  protected readonly nextStatuses = computed(() => {
    const quote = this.quote();
    return quote && this.canManageQuotes()
      ? nextQuoteStatuses(quote.status).filter((status) => status !== 'CONVERTED')
      : [];
  });

  protected statusButtonLabel(status: QuoteStatus): string {
    return QUOTE_STATUS_CONFIG[status].label;
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected async setStatus(status: QuoteStatus): Promise<void> {
    const quote = this.quote();
    if (!quote || !this.canManageQuotes()) {
      return;
    }
    this.saving.set(true);
    this.actionError.set(null);
    try {
      await this.quotesFacade.updateStatus(quote.id, status);
      this.close();
    } catch {
      this.actionError.set(
        'No fue posible cambiar el estado. Verifica los permisos del perfil e inténtalo nuevamente.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async convertToOrder(): Promise<void> {
    const quote = this.quote();
    if (!quote || !this.canManageQuotes()) {
      return;
    }
    this.saving.set(true);
    this.actionError.set(null);
    try {
      await this.quotesFacade.convertToOrder(quote.id);
      this.close();
    } catch {
      this.actionError.set(
        'No fue posible convertir la cotización. Verifica su estado e inténtalo nuevamente.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
