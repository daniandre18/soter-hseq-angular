import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { QuotesFacade } from '../../facades/quotes.facade';
import { QUOTE_STATUS_CONFIG, nextQuoteStatuses } from '../../models/quote-status-config';
import type { Quote, QuoteStatus } from '../../models/quote.model';
import { OrdersFacade } from '../../../orders/facades/orders.facade';
import { ORDER_STATUS_CONFIG } from '../../../orders/models/order-status-config';
import type { ServiceOrder } from '../../../orders/models/order.model';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedCurrencyPipe } from '../../../../shared/pipes/localized-currency.pipe';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { COMPANY_PROFILE } from '../../../../shared/data/company-profile';
import { generateQuotePdf, quotePdfFileName } from '../../utils/quote-pdf.generator';

@Component({
  selector: 'app-quote-detail-modal',
  imports: [
    Modal,
    Button,
    StatusBadge,
    Icon,
    RouterLink,
    TranslocoPipe,
    LocalizedCurrencyPipe,
    LocalizedDatePipe,
  ],
  providers: [...provideTranslocoScope('quotes'), ...provideTranslocoScope('orders')],
  templateUrl: './quote-detail-modal.html',
  styleUrl: './quote-detail-modal.scss',
})
export class QuoteDetailModal {
  private readonly quotesFacade = inject(QuotesFacade);
  private readonly ordersFacade = inject(OrdersFacade);
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  readonly quote = input<Quote | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly orderStatusConfig = ORDER_STATUS_CONFIG;
  protected readonly canManageQuotes = this.quotesFacade.canManageQuotes;
  protected readonly company = COMPANY_PROFILE;

  protected readonly client = computed(() => {
    const clientId = this.quote()?.clientId;
    return clientId ? this.clientsFacade.clients().find((c) => c.id === clientId) : undefined;
  });

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
    this.clientsFacade.init();
  }

  protected readonly statusLabel = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    const quote = this.quote();
    return quote
      ? this.transloco.translate(QUOTE_STATUS_CONFIG[quote.status].translationKey)
      : '';
  });

  protected readonly statusColor = computed(() => {
    const quote = this.quote();
    return quote ? QUOTE_STATUS_CONFIG[quote.status].color : 'gray';
  });

  protected readonly canClientApprove = computed(() =>
    this.quotesFacade.canApproveQuote(this.quote()),
  );

  protected readonly nextStatuses = computed(() => {
    const quote = this.quote();
    if (!quote) {
      return [];
    }
    if (this.canManageQuotes()) {
      return nextQuoteStatuses(quote.status).filter((status) => status !== 'CONVERTED');
    }
    return this.canClientApprove() ? (['APPROVED'] satisfies QuoteStatus[]) : [];
  });

  protected statusButtonLabel(status: QuoteStatus): string {
    return this.transloco.translate(QUOTE_STATUS_CONFIG[status].translationKey);
  }

  protected orderStatusLabel(status: ServiceOrder['status']): string {
    this.language.currentLanguage();
    return this.transloco.translate(ORDER_STATUS_CONFIG[status].translationKey);
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected clientLocation(client: { address?: string; city?: string }): string {
    return [client.address, client.city].filter(Boolean).join(', ');
  }

  protected async setStatus(status: QuoteStatus): Promise<void> {
    const quote = this.quote();
    const isAllowedClientApproval = status === 'APPROVED' && this.canClientApprove();
    if (!quote || (!this.canManageQuotes() && !isAllowedClientApproval)) {
      return;
    }
    this.saving.set(true);
    this.actionError.set(null);
    try {
      await this.quotesFacade.updateStatus(quote.id, status);
      this.close();
    } catch {
      this.actionError.set(this.transloco.translate('quotes.detail.statusError'));
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
      this.actionError.set(this.transloco.translate('quotes.detail.convertError'));
    } finally {
      this.saving.set(false);
    }
  }

  private buildPdf() {
    const quote = this.quote();
    if (!quote) {
      return null;
    }
    const client = this.client();
    return generateQuotePdf({
      quote,
      items: this.items(),
      client: client ? { address: client.address, city: client.city, phone: client.phone, email: client.email } : undefined,
      clientName: quote.clientBusinessName,
      locale: this.language.currentLocale(),
      statusLabel: this.statusLabel(),
      labels: {
        documentTitle: this.transloco.translate('quotes.detail.pdfTitle'),
        number: this.transloco.translate('quotes.number'),
        issueDate: this.transloco.translate('quotes.detail.issueDate'),
        validUntil: this.transloco.translate('quotes.validUntil'),
        status: this.transloco.translate('quotes.detail.status'),
        from: this.transloco.translate('quotes.detail.from'),
        to: this.transloco.translate('quotes.detail.to'),
        columnIndex: '#',
        columnService: this.transloco.translate('quotes.detail.service'),
        columnQuantity: this.transloco.translate('quotes.detail.quantity'),
        columnUnitPrice: this.transloco.translate('quotes.detail.unitPrice'),
        columnTax: this.transloco.translate('quotes.detail.tax'),
        columnTotal: this.transloco.translate('common.total'),
        subtotal: this.transloco.translate('quotes.detail.subtotal'),
        tax: this.transloco.translate('quotes.detail.tax'),
        discount: this.transloco.translate('quotes.detail.discount'),
        total: this.transloco.translate('common.total'),
        notes: this.transloco.translate('quotes.detail.notes'),
        terms: this.transloco.translate('quotes.detail.terms'),
        generatedOn: this.transloco.translate('quotes.detail.generatedOn'),
      },
    });
  }

  protected async downloadPdf(): Promise<void> {
    const quote = this.quote();
    const doc = await this.buildPdf();
    if (!doc || !quote) {
      return;
    }
    doc.save(quotePdfFileName(quote));
  }

  protected async print(): Promise<void> {
    const doc = await this.buildPdf();
    if (!doc) {
      return;
    }
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }
}
