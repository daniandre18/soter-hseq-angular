import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { formatCurrency } from '../../../../shared/utils/format-currency';
import { formatDate } from '../../../../shared/utils/format-date';
import { QuotesFacade } from '../../facades/quotes.facade';
import { QUOTE_STATUS_CONFIG, nextQuoteStatuses } from '../../models/quote-status-config';
import type { Quote, QuoteStatus } from '../../models/quote.model';

@Component({
  selector: 'app-quote-detail-modal',
  imports: [Modal, Button, StatusBadge],
  templateUrl: './quote-detail-modal.html',
  styleUrl: './quote-detail-modal.scss',
})
export class QuoteDetailModal {
  private readonly quotesFacade = inject(QuotesFacade);

  readonly quote = input<Quote | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDate = formatDate;

  protected readonly items = toSignal(
    toObservable(this.quote).pipe(
      switchMap((quote) => (quote ? this.quotesFacade.watchItems(quote.id) : of([]))),
    ),
    { initialValue: [] },
  );

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
    return quote ? nextQuoteStatuses(quote.status).filter((status) => status !== 'CONVERTED') : [];
  });

  protected statusButtonLabel(status: QuoteStatus): string {
    return QUOTE_STATUS_CONFIG[status].label;
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected async setStatus(status: QuoteStatus): Promise<void> {
    const quote = this.quote();
    if (!quote) {
      return;
    }
    this.saving.set(true);
    try {
      await this.quotesFacade.updateStatus(quote.id, status);
      this.close();
    } finally {
      this.saving.set(false);
    }
  }

  protected async convertToOrder(): Promise<void> {
    const quote = this.quote();
    if (!quote) {
      return;
    }
    this.saving.set(true);
    try {
      await this.quotesFacade.convertToOrder(quote.id);
      this.close();
    } finally {
      this.saving.set(false);
    }
  }
}
