import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** `?open=<id>` — usado por la campanita de notificaciones para abrir
   *  directo el detalle en vez de solo aterrizar en el listado. */
  private readonly openQueryParamId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('open'))),
    { initialValue: null },
  );

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
  protected readonly canManageQuotes = this.quotesFacade.canManageQuotes;

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

    // Espera a que `quotes()` traiga la cotización pedida (puede llegar
    // vacío mientras el listener de Firestore aún carga) y limpia el query
    // param al abrir, para no reabrir el modal si el usuario navega de vuelta.
    effect(() => {
      const id = this.openQueryParamId();
      if (!id) {
        return;
      }
      const quote = this.quotesFacade.quotes().find((candidate) => candidate.id === id);
      if (quote) {
        this.detailQuoteId.set(quote.id);
        void this.router.navigate([], { queryParams: { open: null }, queryParamsHandling: 'merge' });
      }
    });
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
