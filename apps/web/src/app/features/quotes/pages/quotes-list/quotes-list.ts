import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { QuotesFacade } from '../../facades/quotes.facade';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { Modal } from '../../../../shared/components/modal/modal';
import { QuoteFormModal } from '../../components/quote-form-modal/quote-form-modal';
import { QuoteDetailModal } from '../../components/quote-detail-modal/quote-detail-modal';
import { QUOTE_STATUS_CONFIG } from '../../models/quote-status-config';
import type { Quote, QuoteStatus } from '../../models/quote.model';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedCurrencyPipe } from '../../../../shared/pipes/localized-currency.pipe';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import {
  RowActionsMenu,
  type RowMenuAction,
  type RowMenuActionSelection,
} from '../../../../shared/components/row-actions-menu/row-actions-menu';
import { releaseOnDestroy } from '../../../../shared/utils/release-on-destroy';

type StatusFilterOption = 'all' | QuoteStatus;
const QUOTE_ROW_ACTIONS: readonly RowMenuAction[] = [
  { id: 'edit', icon: 'square-pen', labelKey: 'quotes.edit' },
  { id: 'delete', icon: 'trash-2', labelKey: 'quotes.delete', tone: 'danger' },
];

@Component({
  selector: 'app-quotes-list',
  imports: [
    Button,
    Card,
    StatusBadge,
    Icon,
    Modal,
    QuoteFormModal,
    QuoteDetailModal,
    TranslocoPipe,
    LocalizedCurrencyPipe,
    LocalizedDatePipe,
    RowActionsMenu,
  ],
  providers: [...provideTranslocoScope('quotes')],
  templateUrl: './quotes-list.html',
  styleUrl: './quotes-list.scss',
})
export class QuotesList {
  protected readonly quotesFacade = inject(QuotesFacade);
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

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
  protected readonly editingQuote = signal<Quote | null>(null);
  protected readonly deletingQuote = signal<Quote | null>(null);
  protected readonly deleting = signal(false);
  protected readonly openActionsId = signal<string | null>(null);
  protected readonly rowActions = QUOTE_ROW_ACTIONS;

  protected readonly statusOptions = Object.entries(QUOTE_STATUS_CONFIG) as [
    QuoteStatus,
    { translationKey: string; color: string },
  ][];

  protected readonly canManageQuotes = this.quotesFacade.canManageQuotes;
  protected readonly canEditDraftQuotes = this.quotesFacade.canEditDraftQuotes;

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

  protected readonly hasActiveFilters = computed(
    () => this.search().trim().length > 0 || this.statusFilter() !== 'all',
  );

  protected readonly activeFilterCount = computed(
    () => Number(this.search().trim().length > 0) + Number(this.statusFilter() !== 'all'),
  );

  /** Referencia "viva" del detalle: si el estado cambia mientras el modal
   *  sigue abierto, refleja el dato actualizado en vez de una foto vieja. */
  protected readonly liveDetailQuote = computed<Quote | null>(() => {
    const id = this.detailQuoteId();
    return id ? (this.quotesFacade.quotes().find((quote) => quote.id === id) ?? null) : null;
  });

  constructor() {
    releaseOnDestroy(this.quotesFacade.init());
    if (this.canManageQuotes()) {
      releaseOnDestroy(this.clientsFacade.init());
    }

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
        void this.router.navigate([], {
          queryParams: { open: null },
          queryParamsHandling: 'merge',
        });
      }
    });
  }

  protected statusLabel(status: QuoteStatus): string {
    this.language.currentLanguage();
    return this.transloco.translate(QUOTE_STATUS_CONFIG[status].translationKey);
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

  protected clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
  }

  protected openCreate(): void {
    this.editingQuote.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(quote: Quote, event: Event): void {
    event.stopPropagation();
    this.openActionsId.set(null);
    if (!this.canEditDraftQuotes() || quote.status !== 'DRAFT') {
      return;
    }
    this.editingQuote.set(quote);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingQuote.set(null);
  }

  protected confirmDelete(quote: Quote, event: Event): void {
    event.stopPropagation();
    this.openActionsId.set(null);
    if (this.canEditDraftQuotes() && quote.status === 'DRAFT') {
      this.deletingQuote.set(quote);
    }
  }

  protected cancelDelete(): void {
    if (!this.deleting()) {
      this.deletingQuote.set(null);
    }
  }

  protected async deleteConfirmed(): Promise<void> {
    const quote = this.deletingQuote();
    if (!quote) {
      return;
    }
    this.deleting.set(true);
    try {
      await this.quotesFacade.deleteDraft(quote.id);
      this.deletingQuote.set(null);
    } finally {
      this.deleting.set(false);
    }
  }

  protected openDetail(quote: Quote): void {
    this.detailQuoteId.set(quote.id);
  }

  protected closeDetail(): void {
    this.detailQuoteId.set(null);
  }

  protected toggleActions(quoteId: string, event: Event): void {
    event.stopPropagation();
    this.openActionsId.update((current) => (current === quoteId ? null : quoteId));
  }

  protected handleRowAction(selection: RowMenuActionSelection, quote: Quote): void {
    if (selection.id === 'edit') {
      this.openEdit(quote, selection.event);
    } else if (selection.id === 'delete') {
      this.confirmDelete(quote, selection.event);
    }
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  protected closeActions(): void {
    this.openActionsId.set(null);
  }
}
