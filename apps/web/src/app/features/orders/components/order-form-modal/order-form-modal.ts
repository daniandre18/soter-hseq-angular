import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { ServicesFacade } from '../../../services/facades/services.facade';
import { OrdersFacade } from '../../facades/orders.facade';
import { ORDER_PRIORITY_CONFIG, ORDER_PRIORITY_KEYS } from '../../models/order-priority-config';
import type { OrderPriority, ServiceOrder } from '../../models/order.model';

interface OrderFormModel {
  clientId: string;
  title: string;
  /** Transitorio: solo alimenta el `<select>` del catálogo, nunca se
   *  persiste — lo que se guarda es `serviceSummary` (texto libre, ver
   *  `onServiceSelected`), igual que en `ServiceOrder`. */
  serviceId: string;
  serviceSummary: string;
  technicianId: string;
  priority: OrderPriority;
  dueDate: string;
  description: string;
}

function emptyModel(): OrderFormModel {
  return {
    clientId: '',
    title: '',
    serviceId: '',
    serviceSummary: '',
    technicianId: '',
    priority: 'MEDIUM',
    dueDate: '',
    description: '',
  };
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-order-form-modal',
  imports: [Modal, Button, FormField],
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

  protected readonly activeClients = computed(() =>
    this.clientsFacade.clients().filter((client) => client.status === 'ACTIVE'),
  );
  protected readonly activeServices = this.servicesFacade.activeServices;
  protected readonly technicians = this.ordersFacade.technicians;

  protected readonly priorityLabels = ORDER_PRIORITY_CONFIG;
  protected readonly priorityKeys = ORDER_PRIORITY_KEYS;

  protected readonly title = computed(() => (this.editingOrder() ? 'Editar Orden' : 'Nueva Orden de Trabajo'));

  protected readonly orderForm = form(this.model, (schemaPath) => {
    required(schemaPath.clientId, { message: 'Selecciona un cliente.' });
    required(schemaPath.title, { message: 'El título es obligatorio.' });
    required(schemaPath.serviceSummary, { message: 'Selecciona un servicio.' });
    required(schemaPath.dueDate, { message: 'La fecha límite es obligatoria.' });
  });

  protected readonly currentServiceHint = computed(() => {
    const order = this.editingOrder();
    const summary = this.model().serviceSummary;
    return order && summary ? summary : null;
  });

  constructor() {
    this.servicesFacade.init();
    effect(() => {
      const order = this.editingOrder();
      if (!this.open()) {
        return;
      }
      this.model.set(
        order
          ? {
              clientId: order.clientId,
              title: order.title,
              serviceId: '',
              serviceSummary: order.serviceSummary,
              technicianId: '',
              priority: order.priority,
              dueDate: order.dueDate ? toDateInputValue(order.dueDate) : '',
              description: order.description ?? '',
            }
          : emptyModel(),
      );
    });
  }

  protected onServiceSelected(serviceId: string): void {
    const service = this.servicesFacade.byId(serviceId);
    if (!service) {
      return;
    }
    this.model.update((m) => ({ ...m, serviceSummary: service.name }));
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
          await this.ordersFacade.updateOrderDetails(editing.id, {
            clientId: client.id,
            clientBusinessName: client.businessName,
            title: value.title,
            serviceSummary: value.serviceSummary,
            priority: value.priority,
            dueDate: new Date(value.dueDate),
            description: value.description || undefined,
          });
        } else {
          await this.ordersFacade.createOrder({
            clientId: client.id,
            clientBusinessName: client.businessName,
            title: value.title,
            serviceSummary: value.serviceSummary,
            priority: value.priority,
            dueDate: new Date(value.dueDate),
            description: value.description || undefined,
            technicianId: value.technicianId || undefined,
          });
        }
        this.close();
      } finally {
        this.saving.set(false);
      }
    });
  }
}
