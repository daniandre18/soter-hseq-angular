import { Component, computed, inject, signal } from '@angular/core';
import { OrdersFacade } from '../../facades/orders.facade';
import { Card } from '../../../../shared/components/card/card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { OrderDetailModal } from '../../components/order-detail-modal/order-detail-modal';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import { formatDateTime } from '../../../../shared/utils/format-date';
import type { OrderStatus, ServiceOrder } from '../../models/order.model';

type StatusFilterOption = 'all' | OrderStatus;

@Component({
  selector: 'app-orders-list',
  imports: [Card, StatusBadge, Avatar, OrderDetailModal],
  templateUrl: './orders-list.html',
  styleUrl: './orders-list.scss',
})
export class OrdersList {
  protected readonly ordersFacade = inject(OrdersFacade);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilterOption>('all');
  protected readonly detailOrderId = signal<string | null>(null);

  protected readonly statusOptions = Object.entries(ORDER_STATUS_CONFIG) as [
    OrderStatus,
    { label: string; color: string },
  ][];

  protected readonly formatDateTime = formatDateTime;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.ordersFacade
      .orders()
      .filter((order) => {
        const matchesSearch =
          !term ||
          order.orderNumber.toLowerCase().includes(term) ||
          order.clientBusinessName.toLowerCase().includes(term);
        const matchesStatus = status === 'all' || order.status === status;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });

  /** Referencia "viva": si la orden cambia mientras el modal sigue abierto,
   *  refleja el dato actualizado en vez de una foto vieja. */
  protected readonly liveDetailOrder = computed<ServiceOrder | null>(() => {
    const id = this.detailOrderId();
    return id ? (this.ordersFacade.orders().find((order) => order.id === id) ?? null) : null;
  });

  constructor() {
    this.ordersFacade.init();
  }

  protected statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_CONFIG[status].label;
  }

  protected statusColor(status: OrderStatus): string {
    return ORDER_STATUS_CONFIG[status].color;
  }

  protected technicianNames(order: ServiceOrder): string[] {
    return order.assignedTechnicianIds.map((id) => this.ordersFacade.technicianName(id));
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilterOption);
  }

  protected openDetail(order: ServiceOrder): void {
    this.detailOrderId.set(order.id);
  }

  protected closeDetail(): void {
    this.detailOrderId.set(null);
  }
}
