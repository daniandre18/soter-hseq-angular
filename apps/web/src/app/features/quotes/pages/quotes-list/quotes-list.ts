import { Component, computed, inject, signal } from '@angular/core';
import { QuotesFacade } from '../../facades/quotes.facade';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { QuoteFormModal } from '../../components/quote-form-modal/quote-form-modal';
import { QuoteDetailModal } from '../../components/quote-detail-modal/quote-detail-modal';
import { QUOTE_STATUS_CONFIG } from '../../models/quote-status-config';
import { formatCurrency } from '../../../../shared/utils/format-currency';
import { formatDate } from '../../../../shared/utils/format-date';
import type { Quote, QuoteStatus } from '../../models/quote.model';

type StatusFilterOption = 'all' | QuoteStatus;

@Component({
  selector: 'app-quotes-list',
  imports: [Button, Card, StatusBadge, QuoteFormModal, QuoteDetailModal],
  templateUrl: './quotes-list.html',
  styleUrl: './quotes-list.scss',
})
export class QuotesList {
  protected readonly quotesFacade = inject(QuotesFacade);
  private readonly clientsFacade = inject(ClientsFacade);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilterOption>('all');
  protected readonly formOpen = signal(false);
  protected readonly detailQuoteId = signal<string | null>(null);

  protected readonly statusOptions = Object.entries(QUOTE_STATUS_CONFIG) as [
    QuoteStatus,
    { label: string; color: string },
  ][];

  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDate = formatDate;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.quotesFacade
      .quotes()
      .filter((quote) => {
        const matchesSearch =
          !term ||
          quote.quoteNumber.toLowerCase().includes(term) ||
          quote.clientBusinessName.toLowerCase().includes(term);
        const matchesStatus = status === 'all' || quote.status === status;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });

  /** Referencia "viva" del detalle: si el estado cambia mientras el modal
   *  sigue abierto, refleja el dato actualizado en vez de una foto vieja. */
  protected readonly liveDetailQuote = computed<Quote | null>(() => {
    const id = this.detailQuoteId();
    return id ? (this.quotesFacade.quotes().find((quote) => quote.id === id) ?? null) : null;
  });

  constructor() {
    this.quotesFacade.init();
    this.clientsFacade.init();
  }

  protected statusLabel(status: QuoteStatus): string {
    return QUOTE_STATUS_CONFIG[status].label;
  }

  protected statusColor(status: QuoteStatus): string {
    return QUOTE_STATUS_CONFIG[status].color;
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilterOption);
  }

  protected openCreate(): void {
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected openDetail(quote: Quote): void {
    this.detailQuoteId.set(quote.id);
  }

  protected closeDetail(): void {
    this.detailQuoteId.set(null);
  }
}
