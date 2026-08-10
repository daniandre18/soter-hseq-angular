import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormField, applyEach, form, required, submit, validate } from '@angular/forms/signals';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { ServicesFacade } from '../../../services/facades/services.facade';
import { OrdersFacade } from '../../facades/orders.facade';
import { ORDER_PRIORITY_CONFIG, ORDER_PRIORITY_KEYS } from '../../models/order-priority-config';
import type { NewOrderServiceRow, OrderPriority, ServiceOrder } from '../../models/order.model';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';

/** Una fila = un servicio = una orden nueva al guardar (ver `onSubmit`). */
interface OrderServiceRow {
  serviceId: string;
  serviceSummary: string;
  priority: OrderPriority;
  dueDate: string;
  visitDate: string;
  visitTime: string;
  description: string;
}

interface OrderFormModel {
  clientId: string;
  // Campos planos: solo los usa el modo edición (una orden existente).
  title: string;
  serviceId: string;
  serviceSummary: string;
  priority: OrderPriority;
  dueDate: string;
  visitDate: string;
  visitTime: string;
  description: string;
  // Solo lo usa el modo creación: varias filas = varias órdenes nuevas.
  rows: OrderServiceRow[];
}

function normalizeServiceName(value: string): string {
  return value.trim().toLocaleLowerCase('es-CO');
}

function emptyRow(): OrderServiceRow {
  return {
    serviceId: '',
    serviceSummary: '',
    priority: 'MEDIUM',
    dueDate: '',
    visitDate: '',
    visitTime: '',
    description: '',
  };
}

function emptyModel(): OrderFormModel {
  return {
    clientId: '',
    title: '',
    serviceId: '',
    serviceSummary: '',
    priority: 'MEDIUM',
    dueDate: '',
    visitDate: '',
    visitTime: '',
    description: '',
    rows: [emptyRow()],
  };
}

function toDateInputValue(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toScheduledStart(dateValue: string, timeValue: string): Date | undefined {
  if (!dateValue || !timeValue) {
    return undefined;
  }
  const scheduledStart = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(scheduledStart.getTime()) ? undefined : scheduledStart;
}

function shiftedScheduledEnd(order: ServiceOrder, scheduledStart: Date): Date | undefined {
  if (!order.scheduledStart || !order.scheduledEnd) {
    return undefined;
  }
  const previousDuration = order.scheduledEnd.getTime() - order.scheduledStart.getTime();
  return previousDuration > 0 ? new Date(scheduledStart.getTime() + previousDuration) : undefined;
}

@Component({
  selector: 'app-order-form-modal',
  imports: [Modal, Button, FormField, TranslocoPipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-form-modal.html',
  styleUrl: './order-form-modal.scss',
})
export class OrderFormModal {
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly servicesFacade = inject(ServicesFacade);
  private readonly ordersFacade = inject(OrdersFacade);

  readonly open = input(false);
  readonly editingOrder = input<ServiceOrder | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly model = signal<OrderFormModel>(emptyModel());
  private initializedFormKey: string | null = null;

  protected readonly activeClients = computed(() =>
    this.clientsFacade.clients().filter((client) => client.status === 'ACTIVE'),
  );
  protected readonly activeServices = this.servicesFacade.activeServices;

  protected readonly priorityLabels = ORDER_PRIORITY_CONFIG;
  protected readonly priorityKeys = ORDER_PRIORITY_KEYS;

  protected readonly titleKey = computed(() =>
    this.editingOrder() ? 'orders.form.editTitle' : 'orders.form.createTitle',
  );
  /** La tabla de varios servicios necesita más ancho que el formulario plano de edición. */
  protected readonly modalSize = computed(() => (this.editingOrder() ? 'lg' : 'xl'));

  protected readonly orderForm = form(this.model, (schemaPath) => {
    required(schemaPath.clientId, { message: 'orders.validation.selectClient' });

    const editing = () => this.editingOrder() !== null;
    required(schemaPath.title, { message: 'orders.validation.titleRequired', when: editing });
    required(schemaPath.serviceSummary, { message: 'orders.validation.selectService', when: editing });
    required(schemaPath.dueDate, { message: 'orders.validation.dueDateRequired', when: editing });
    required(schemaPath.visitDate, {
      message: 'orders.validation.visitDateRequired',
      when: ({ valueOf }) => editing() && Boolean(valueOf(schemaPath.visitTime)),
    });
    required(schemaPath.visitTime, {
      message: 'orders.validation.visitTimeRequired',
      when: ({ valueOf }) => editing() && Boolean(valueOf(schemaPath.visitDate)),
    });
    validate(schemaPath.visitDate, ({ value, valueOf }) => {
      const visitDate = value();
      const dueDate = valueOf(schemaPath.dueDate);
      return visitDate && dueDate && visitDate > dueDate
        ? { kind: 'visitAfterDueDate', message: 'orders.validation.visitAfterDueDate' }
        : undefined;
    });

    const creating = () => this.editingOrder() === null;
    applyEach(schemaPath.rows, (row) => {
      required(row.serviceId, { message: 'orders.validation.selectService', when: creating });
      required(row.dueDate, { message: 'orders.validation.dueDateRequired', when: creating });
      required(row.visitDate, {
        message: 'orders.validation.visitDateRequired',
        when: ({ valueOf }) => creating() && Boolean(valueOf(row.visitTime)),
      });
      required(row.visitTime, {
        message: 'orders.validation.visitTimeRequired',
        when: ({ valueOf }) => creating() && Boolean(valueOf(row.visitDate)),
      });
      validate(row.visitDate, ({ value, valueOf }) => {
        const visitDate = value();
        const dueDate = valueOf(row.dueDate);
        return visitDate && dueDate && visitDate > dueDate
          ? { kind: 'visitAfterDueDate', message: 'orders.validation.visitAfterDueDate' }
          : undefined;
      });
    });
  });

  protected readonly currentServiceHint = computed(() => {
    const order = this.editingOrder();
    const model = this.model();
    return order && model.serviceSummary && !model.serviceId ? model.serviceSummary : null;
  });

  constructor() {
    this.servicesFacade.init();
    effect(() => {
      const order = this.editingOrder();
      const services = this.activeServices();
      if (!this.open()) {
        this.initializedFormKey = null;
        return;
      }

      const formKey = order ? `edit:${order.id}` : 'create';
      const serviceId = order
        ? (services.find(
            (service) =>
              normalizeServiceName(service.name) === normalizeServiceName(order.serviceSummary),
          )?.id ?? '')
        : '';

      if (this.initializedFormKey !== formKey) {
        this.initializedFormKey = formKey;
        this.model.set(
          order
            ? {
                ...emptyModel(),
                clientId: order.clientId,
                title: order.title,
                serviceId,
                serviceSummary: order.serviceSummary,
                priority: order.priority,
                dueDate: order.dueDate ? toDateInputValue(order.dueDate) : '',
                visitDate: order.scheduledStart ? toDateInputValue(order.scheduledStart) : '',
                visitTime: order.scheduledStart ? toTimeInputValue(order.scheduledStart) : '',
                description: order.description ?? '',
                rows: [],
              }
            : emptyModel(),
        );
        return;
      }

      // El catálogo puede llegar después de abrir el modal. En ese caso solo
      // completa el id faltante, sin reiniciar los cambios que el usuario ya
      // haya realizado en el resto del formulario.
      const currentModel = untracked(this.model);
      if (
        order &&
        serviceId &&
        !currentModel.serviceId &&
        normalizeServiceName(currentModel.serviceSummary) ===
          normalizeServiceName(order.serviceSummary)
      ) {
        this.model.update((current) => ({ ...current, serviceId }));
      }
    });
  }

  protected onServiceSelected(serviceId: string): void {
    const service = this.servicesFacade.byId(serviceId);
    if (!service) {
      return;
    }
    this.model.update((m) => ({ ...m, serviceSummary: service.name }));
  }

  protected onRowServiceSelected(index: number, serviceId: string): void {
    const service = this.servicesFacade.byId(serviceId);
    if (!service) {
      return;
    }
    this.model.update((m) => ({
      ...m,
      rows: m.rows.map((row, i) =>
        i === index ? { ...row, serviceId, serviceSummary: service.name } : row,
      ),
    }));
  }

  protected addRow(): void {
    this.model.update((m) => ({ ...m, rows: [...m.rows, emptyRow()] }));
  }

  protected removeRow(index: number): void {
    this.model.update((m) => ({ ...m, rows: m.rows.filter((_, i) => i !== index) }));
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected onSubmit(): void {
    submit(this.orderForm, async () => {
      const value = this.model();
      const client = this.clientsFacade.clients().find((c) => c.id === value.clientId);
      if (!client) {
        return;
      }

      this.saving.set(true);
      try {
        const editing = this.editingOrder();
        if (editing) {
          const scheduledStart = toScheduledStart(value.visitDate, value.visitTime);
          await this.ordersFacade.updateOrderDetails(editing.id, {
            clientId: client.id,
            clientBusinessName: client.businessName,
            title: value.title,
            serviceSummary: value.serviceSummary,
            priority: value.priority,
            dueDate: new Date(value.dueDate),
            description: value.description || undefined,
          });
          if (scheduledStart && scheduledStart.getTime() !== editing.scheduledStart?.getTime()) {
            await this.ordersFacade.schedule(
              editing.id,
              scheduledStart,
              shiftedScheduledEnd(editing, scheduledStart),
            );
          }
        } else {
          const rows: NewOrderServiceRow[] = value.rows
            .filter((row) => row.serviceId && row.dueDate)
            .map((row) => ({
              serviceSummary: row.serviceSummary,
              priority: row.priority,
              dueDate: new Date(row.dueDate),
              scheduledStart: toScheduledStart(row.visitDate, row.visitTime),
              description: row.description || undefined,
            }));
          await this.ordersFacade.createOrders(client.id, client.businessName, rows);
        }
        this.close();
      } finally {
        this.saving.set(false);
      }
    });
  }
}
