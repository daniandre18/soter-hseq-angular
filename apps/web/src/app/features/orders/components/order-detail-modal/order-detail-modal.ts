import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { OrdersFacade } from '../../facades/orders.facade';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import {
  formatDateTime,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '../../../../shared/utils/format-date';
import type { ServiceOrder } from '../../models/order.model';

const SCHEDULABLE_STATUSES = new Set<ServiceOrder['status']>(['DRAFT', 'SCHEDULED']);
const ASSIGNABLE_STATUSES = new Set<ServiceOrder['status']>(['SCHEDULED', 'ASSIGNED']);
const CANCELLABLE_STATUSES = new Set<ServiceOrder['status']>(['DRAFT', 'SCHEDULED', 'ASSIGNED']);

@Component({
  selector: 'app-order-detail-modal',
  imports: [Modal, Button, StatusBadge, Avatar],
  templateUrl: './order-detail-modal.html',
  styleUrl: './order-detail-modal.scss',
})
export class OrderDetailModal {
  private readonly authFacade = inject(AuthFacade);
  private readonly ordersFacade = inject(OrdersFacade);

  readonly order = input<ServiceOrder | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly formatDateTime = formatDateTime;
  protected readonly technicians = this.ordersFacade.technicians;

  protected readonly statusLabel = computed(() => {
    const order = this.order();
    return order ? ORDER_STATUS_CONFIG[order.status].label : '';
  });

  protected readonly statusColor = computed(() => {
    const order = this.order();
    return order ? ORDER_STATUS_CONFIG[order.status].color : 'gray';
  });

  private readonly canManage = computed(() => {
    const role = this.authFacade.currentRole();
    return role === 'ADMIN' || role === 'COORDINATOR';
  });

  protected readonly canSchedule = computed(
    () => this.canManage() && !!this.order() && SCHEDULABLE_STATUSES.has(this.order()!.status),
  );

  protected readonly canAssign = computed(
    () => this.canManage() && !!this.order() && ASSIGNABLE_STATUSES.has(this.order()!.status),
  );

  protected readonly canCancel = computed(
    () => this.canManage() && !!this.order() && CANCELLABLE_STATUSES.has(this.order()!.status),
  );

  protected readonly canExecute = computed(() => {
    const order = this.order();
    const uid = this.authFacade.currentUser()?.id;
    return (
      !!order &&
      this.authFacade.currentRole() === 'TECHNICIAN' &&
      !!uid &&
      order.assignedTechnicianIds.includes(uid) &&
      order.status === 'ASSIGNED'
    );
  });

  protected readonly assignedTechnicianNames = computed(() =>
    (this.order()?.assignedTechnicianIds ?? []).map((id) => this.ordersFacade.technicianName(id)),
  );

  protected readonly scheduledStartValue = linkedSignal(() => {
    const order = this.order();
    return order?.scheduledStart ? toDateTimeLocalValue(order.scheduledStart) : '';
  });

  protected readonly scheduledEndValue = linkedSignal(() => {
    const order = this.order();
    return order?.scheduledEnd ? toDateTimeLocalValue(order.scheduledEnd) : '';
  });

  protected readonly selectedTechnicianIds = linkedSignal<string[]>(
    () => this.order()?.assignedTechnicianIds ?? [],
  );

  protected close(): void {
    this.closeRequested.emit();
  }

  protected onScheduledStartInput(event: Event): void {
    this.scheduledStartValue.set((event.target as HTMLInputElement).value);
  }

  protected onScheduledEndInput(event: Event): void {
    this.scheduledEndValue.set((event.target as HTMLInputElement).value);
  }

  protected toggleTechnician(technicianId: string, checked: boolean): void {
    this.selectedTechnicianIds.update((ids) =>
      checked ? [...ids, technicianId] : ids.filter((id) => id !== technicianId),
    );
  }

  protected async saveSchedule(): Promise<void> {
    const order = this.order();
    const start = fromDateTimeLocalValue(this.scheduledStartValue());
    const end = fromDateTimeLocalValue(this.scheduledEndValue());
    if (!order || !start || !end) {
      return;
    }
    this.saving.set(true);
    try {
      await this.ordersFacade.schedule(order.id, start, end);
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveAssignment(): Promise<void> {
    const order = this.order();
    if (!order) {
      return;
    }
    this.saving.set(true);
    try {
      await this.ordersFacade.assignTechnicians(order.id, this.selectedTechnicianIds());
    } finally {
      this.saving.set(false);
    }
  }

  protected async cancelOrder(): Promise<void> {
    const order = this.order();
    if (!order) {
      return;
    }
    this.saving.set(true);
    try {
      await this.ordersFacade.updateStatus(order.id, 'CANCELLED');
      this.close();
    } finally {
      this.saving.set(false);
    }
  }

  protected async startExecution(): Promise<void> {
    const order = this.order();
    if (!order) {
      return;
    }
    this.saving.set(true);
    try {
      await this.ordersFacade.updateStatus(order.id, 'IN_PROGRESS');
      this.close();
    } finally {
      this.saving.set(false);
    }
  }
}
