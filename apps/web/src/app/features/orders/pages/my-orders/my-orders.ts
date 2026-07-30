import { Component, computed, inject, signal } from '@angular/core';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { Card } from '../../../../shared/components/card/card';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { OrderDetailModal } from '../../components/order-detail-modal/order-detail-modal';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import { formatDateTime } from '../../../../shared/utils/format-date';
import type { ServiceOrder } from '../../models/order.model';

const ACTIVE_STATUSES = new Set<ServiceOrder['status']>(['ASSIGNED', 'IN_PROGRESS']);

@Component({
  selector: 'app-my-orders',
  imports: [Card, StatCard, StatusBadge, OrderDetailModal],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.scss',
})
export class MyOrders {
  protected readonly ordersFacade = inject(OrdersFacade);
  private readonly authFacade = inject(AuthFacade);

  protected readonly detailOrderId = signal<string | null>(null);
  protected readonly formatDateTime = formatDateTime;

  protected readonly myOrders = computed(() => {
    const uid = this.authFacade.currentUser()?.id;
    return uid ? this.ordersFacade.orders().filter((order) => order.assignedTechnicianIds.includes(uid)) : [];
  });

  protected readonly assignedCount = computed(
    () => this.myOrders().filter((order) => order.status === 'ASSIGNED').length,
  );

  protected readonly inProgressCount = computed(
    () => this.myOrders().filter((order) => order.status === 'IN_PROGRESS').length,
  );

  protected readonly activeOrders = computed(() =>
    this.myOrders()
      .filter((order) => ACTIVE_STATUSES.has(order.status))
      .sort((a, b) => (a.scheduledStart?.getTime() ?? 0) - (b.scheduledStart?.getTime() ?? 0)),
  );

  protected readonly otherOrders = computed(() =>
    this.myOrders()
      .filter((order) => !ACTIVE_STATUSES.has(order.status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
  );

  protected readonly liveDetailOrder = computed<ServiceOrder | null>(() => {
    const id = this.detailOrderId();
    return id ? (this.myOrders().find((order) => order.id === id) ?? null) : null;
  });

  constructor() {
    this.ordersFacade.init();
  }

  protected statusLabel(status: ServiceOrder['status']): string {
    return ORDER_STATUS_CONFIG[status].label;
  }

  protected statusColor(status: ServiceOrder['status']): string {
    return ORDER_STATUS_CONFIG[status].color;
  }

  protected openDetail(order: ServiceOrder): void {
    this.detailOrderId.set(order.id);
  }

  protected closeDetail(): void {
    this.detailOrderId.set(null);
  }
}
