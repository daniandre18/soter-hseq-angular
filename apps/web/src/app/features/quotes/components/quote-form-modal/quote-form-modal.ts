import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormField, applyEach, form, min, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { LocalizedCurrencyPipe } from '../../../../shared/pipes/localized-currency.pipe';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { ServicesFacade } from '../../../services/facades/services.facade';
import { QuotesFacade } from '../../facades/quotes.facade';
import type { NewQuoteItem, Quote } from '../../models/quote.model';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';
import { releaseOnDestroy } from '../../../../shared/utils/release-on-destroy';

interface QuoteItemRow {
  serviceId: string;
  quantity: number;
  unitPrice: number;
}

interface QuoteFormModel {
  clientId: string;
  validUntil: string;
  notes: string;
  items: QuoteItemRow[];
}

function emptyItemRow(): QuoteItemRow {
  return { serviceId: '', quantity: 1, unitPrice: 0 };
}

function defaultValidUntil(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function emptyModel(): QuoteFormModel {
  return {
    clientId: '',
    validUntil: defaultValidUntil(),
    notes: '',
    items: [emptyItemRow()],
  };
}

@Component({
  selector: 'app-quote-form-modal',
  imports: [Modal, Button, FormField, LocalizedCurrencyPipe, TranslocoPipe],
  providers: [...provideTranslocoScope('quotes')],
  templateUrl: './quote-form-modal.html',
  styleUrl: './quote-form-modal.scss',
})
export class QuoteFormModal {
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly servicesFacade = inject(ServicesFacade);
  private readonly quotesFacade = inject(QuotesFacade);

  readonly open = input(false);
  readonly editingQuote = input<Quote | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly loadingDraft = signal(false);

  protected readonly activeClients = computed(() =>
    this.clientsFacade.clients().filter((client) => client.status === 'ACTIVE'),
  );

  protected readonly activeServices = this.servicesFacade.activeServices;

  protected readonly model = signal<QuoteFormModel>(emptyModel());

  protected readonly quoteForm = form(this.model, (schemaPath) => {
    required(schemaPath.clientId, { message: 'quotes.form.validation.clientRequired' });
    required(schemaPath.validUntil, { message: 'quotes.form.validation.validUntilRequired' });
    applyEach(schemaPath.items, (item) => {
      required(item.serviceId, { message: 'quotes.form.validation.serviceRequired' });
      min(item.quantity, 1, { message: 'quotes.form.validation.quantityMin' });
    });
  });

  protected readonly subtotal = computed(() =>
    this.model().items.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0),
  );

  constructor() {
    releaseOnDestroy(this.servicesFacade.init());
    effect(() => {
      const open = this.open();
      const quote = this.editingQuote();
      if (!open) {
        return;
      }
      if (quote) {
        void this.loadDraft(quote);
      } else {
        this.model.set(emptyModel());
      }
    });
  }

  private async loadDraft(quote: Quote): Promise<void> {
    this.loadingDraft.set(true);
    try {
      const items = await firstValueFrom(this.quotesFacade.watchItems(quote.id));
      this.model.set({
        clientId: quote.clientId,
        validUntil: quote.validUntil?.toISOString().slice(0, 10) ?? defaultValidUntil(),
        notes: quote.notes ?? '',
        items:
          items.length > 0
            ? items.map((item) => ({
                serviceId: item.serviceCode ?? '',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              }))
            : [emptyItemRow()],
      });
    } finally {
      this.loadingDraft.set(false);
    }
  }

  protected addRow(): void {
    this.model.update((m) => ({ ...m, items: [...m.items, emptyItemRow()] }));
  }

  protected removeRow(index: number): void {
    this.model.update((m) => ({ ...m, items: m.items.filter((_, i) => i !== index) }));
  }

  protected rowTotal(index: number): number {
    const row = this.model().items[index];
    return row.quantity * row.unitPrice;
  }

  /** El precio se autocompleta desde el catálogo pero sigue siendo un
   *  campo editable después — permite un valor negociado puntual sin
   *  tener que crear un servicio nuevo solo para esa cotización. */
  protected onServiceSelected(index: number, serviceId: string): void {
    const service = this.servicesFacade.byId(serviceId);
    this.model.update((m) => ({
      ...m,
      items: m.items.map((row, i) =>
        i === index ? { ...row, serviceId, unitPrice: service?.price ?? row.unitPrice } : row,
      ),
    }));
  }

  protected close(): void {
    this.model.set(emptyModel());
    this.closeRequested.emit();
  }

  protected onSubmit(): void {
    submit(this.quoteForm, async () => {
      const value = this.model();
      const client = this.clientsFacade.clients().find((c) => c.id === value.clientId);
      if (!client) {
        return;
      }

      this.saving.set(true);
      try {
        const total = this.subtotal();
        const items: NewQuoteItem[] = value.items
          .filter((row) => row.serviceId && row.quantity > 0)
          .map((row, index) => ({
            serviceCode: row.serviceId,
            description: this.servicesFacade.byId(row.serviceId)?.name ?? '',
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            taxRate: 0,
            subtotal: row.quantity * row.unitPrice,
            total: row.quantity * row.unitPrice,
            position: index,
          }));

        const quoteData = {
          clientId: client.id,
          clientBusinessName: client.businessName,
          validUntil: new Date(value.validUntil),
          currency: 'COP' as const,
          subtotal: total,
          tax: 0,
          discount: 0,
          total,
          notes: value.notes || undefined,
        };
        const editing = this.editingQuote();
        if (editing) {
          await this.quotesFacade.updateDraft(editing.id, quoteData, items);
        } else {
          await this.quotesFacade.addQuote(quoteData, items);
        }
        this.close();
      } finally {
        this.saving.set(false);
      }
    });
  }
}
