import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, applyEach, form, min, required, submit } from '@angular/forms/signals';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { formatCurrency } from '../../../../shared/utils/format-currency';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { ServicesFacade } from '../../../services/facades/services.facade';
import { QuotesFacade } from '../../facades/quotes.facade';
import type { NewQuoteItem } from '../../models/quote.model';

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
  imports: [Modal, Button, FormField],
  templateUrl: './quote-form-modal.html',
  styleUrl: './quote-form-modal.scss',
})
export class QuoteFormModal {
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly servicesFacade = inject(ServicesFacade);
  private readonly quotesFacade = inject(QuotesFacade);

  readonly open = input(false);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly formatCurrency = formatCurrency;

  protected readonly activeClients = computed(() =>
    this.clientsFacade.clients().filter((client) => client.status === 'ACTIVE'),
  );

  protected readonly activeServices = this.servicesFacade.activeServices;

  protected readonly model = signal<QuoteFormModel>(emptyModel());

  protected readonly quoteForm = form(this.model, (schemaPath) => {
    required(schemaPath.clientId, { message: 'Selecciona un cliente.' });
    required(schemaPath.validUntil, { message: 'La fecha de vigencia es obligatoria.' });
    applyEach(schemaPath.items, (item) => {
      required(item.serviceId, { message: 'Selecciona un servicio.' });
      min(item.quantity, 1, { message: 'La cantidad debe ser mayor a 0.' });
    });
  });

  protected readonly subtotal = computed(() =>
    this.model().items.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0),
  );

  constructor() {
    this.servicesFacade.init();
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

        await this.quotesFacade.addQuote(
          {
            clientId: client.id,
            clientBusinessName: client.businessName,
            validUntil: new Date(value.validUntil),
            currency: 'COP',
            subtotal: total,
            tax: 0,
            discount: 0,
            total,
            notes: value.notes || undefined,
          },
          items,
        );
        this.close();
      } finally {
        this.saving.set(false);
      }
    });
  }
}
