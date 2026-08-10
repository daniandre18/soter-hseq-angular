import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Button } from '../../../../shared/components/button/button';
import { ToastService } from '../../../../shared/services/toast.service';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../../../shared/utils/format-date';
import { OrdersFacade } from '../../facades/orders.facade';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import type { OrderStatus, ServiceOrder } from '../../models/order.model';
import { dueDateKey, visitScheduleError } from '../../utils/order-schedule-validation';

/** Estados que un cambio manual libre puede fijar. `APPROVED`/`CLOSED`
 *  quedan afuera a propósito: solo se alcanzan mediante el flujo de Acta
 *  (`approveClosingAct`/`closeOrderWithPdf`), que deja auditoría y genera
 *  el PDF — permitirlos aquí saltaría ese flujo sin dejar rastro. */
const FREELY_SETTABLE_STATUSES: OrderStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'ASSIGNED',
  'IN_PROGRESS',
  'EVIDENCE_PENDING',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
  'CANCELLED',
];

/** Programación, asignación de técnicos y cambio de estado libre —
 *  exclusivo de ADMIN/COORDINATOR. Reemplaza tres bloques del antiguo
 *  modal (incluido su modal secundario de cambio de estado, ahora un
 *  `<select>` inline: ya no debe quedar ningún modal en el detalle). */
@Component({
  selector: 'app-order-management-card',
  imports: [Avatar, Button, TranslocoPipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-management-card.html',
  styleUrl: './order-management-card.scss',
})
export class OrderManagementCard {
  private readonly ordersFacade = inject(OrdersFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly order = input.required<ServiceOrder>();
  readonly canSchedule = input(false);
  readonly canAssign = input(false);
  readonly canChangeStatusFreely = input(false);

  protected readonly technicians = this.ordersFacade.technicians;
  protected readonly freelySettableStatuses = FREELY_SETTABLE_STATUSES;
  protected readonly statusOptionLabel = (status: OrderStatus) =>
    ORDER_STATUS_CONFIG[status].translationKey;

  protected readonly scheduledStartValue = linkedSignal(() => {
    const order = this.order();
    return order.scheduledStart ? toDateTimeLocalValue(order.scheduledStart) : '';
  });
  protected readonly scheduledEndValue = linkedSignal(() => {
    const order = this.order();
    return order.scheduledEnd ? toDateTimeLocalValue(order.scheduledEnd) : '';
  });
  protected readonly saving = signal(false);

  protected readonly selectedTechnicianIds = linkedSignal<string[]>(
    () => this.order().assignedTechnicianIds,
  );
  protected readonly assigning = signal(false);

  protected readonly statusChangeTarget = linkedSignal<OrderStatus>(() => this.order().status);
  protected readonly changingStatus = signal(false);

  protected readonly dueDateMax = computed(() => {
    const dueDate = this.order().dueDate;
    if (!dueDate) {
      return undefined;
    }
    const key = dueDateKey(dueDate).toString();
    return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}T23:59`;
  });

  protected readonly scheduleErrorKey = computed(() => {
    const start = fromDateTimeLocalValue(this.scheduledStartValue());
    const end = fromDateTimeLocalValue(this.scheduledEndValue());
    if (!start || !end) {
      return null;
    }
    const error = visitScheduleError(start, end, this.order().dueDate);
    return error ? `orders.detail.schedule.validation.${error}` : null;
  });

  protected readonly canConfirmSchedule = computed(
    () =>
      !this.saving() &&
      !!this.scheduledStartValue() &&
      !!this.scheduledEndValue() &&
      !this.scheduleErrorKey(),
  );

  protected onScheduledStartInput(event: Event): void {
    this.scheduledStartValue.set((event.target as HTMLInputElement).value);
  }

  protected onScheduledEndInput(event: Event): void {
    this.scheduledEndValue.set((event.target as HTMLInputElement).value);
  }

  protected async saveSchedule(): Promise<void> {
    const start = fromDateTimeLocalValue(this.scheduledStartValue());
    const end = fromDateTimeLocalValue(this.scheduledEndValue());
    if (!start || !end) {
      return;
    }
    this.saving.set(true);
    try {
      await this.ordersFacade.schedule(this.order().id, start, end);
      this.toast.success(this.transloco.translate('orders.detail.schedule.success'));
    } catch {
      this.toast.error(this.transloco.translate('orders.detail.schedule.error'));
    } finally {
      this.saving.set(false);
    }
  }

  protected toggleTechnician(technicianId: string, checked: boolean): void {
    this.selectedTechnicianIds.update((ids) =>
      checked ? [...ids, technicianId] : ids.filter((id) => id !== technicianId),
    );
  }

  protected async saveAssignment(): Promise<void> {
    this.assigning.set(true);
    try {
      await this.ordersFacade.assignTechnicians(this.order().id, this.selectedTechnicianIds());
    } finally {
      this.assigning.set(false);
    }
  }

  protected async confirmStatusChange(): Promise<void> {
    this.changingStatus.set(true);
    try {
      await this.ordersFacade.updateStatus(this.order().id, this.statusChangeTarget());
      this.toast.success(this.transloco.translate('orders.toast.statusUpdated'));
    } catch {
      this.toast.error(this.transloco.translate('orders.toast.statusError'));
    } finally {
      this.changingStatus.set(false);
    }
  }
}
