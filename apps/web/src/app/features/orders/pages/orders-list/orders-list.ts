import { Component, computed, inject, signal } from '@angular/core';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { ProgressBar } from '../../../../shared/components/progress-bar/progress-bar';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Modal } from '../../../../shared/components/modal/modal';
import { Icon } from '../../../../shared/components/icon/icon';
import { OrderDetailModal } from '../../components/order-detail-modal/order-detail-modal';
import { OrderFormModal } from '../../components/order-form-modal/order-form-modal';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import { ORDER_PRIORITY_CONFIG } from '../../models/order-priority-config';
import { formatDateNumeric } from '../../../../shared/utils/format-date';
import type { OrderPriority, OrderStatus, ServiceOrder } from '../../models/order.model';

type StatusFilterOption = 'all' | OrderStatus;

const PAGE_SIZE = 10;

@Component({
  selector: 'app-orders-list',
  imports: [Card, Button, StatusBadge, ProgressBar, Avatar, Modal, Icon, OrderDetailModal, OrderFormModal],
  templateUrl: './orders-list.html',
  styleUrl: './orders-list.scss',
})
export class OrdersList {
  protected readonly ordersFacade = inject(OrdersFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly clientsFacade = inject(ClientsFacade);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilterOption>('all');
  protected readonly visibleCount = signal(PAGE_SIZE);
  protected readonly detailOrderId = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly editingOrder = signal<ServiceOrder | null>(null);
  protected readonly deletingOrder = signal<ServiceOrder | null>(null);
  protected readonly deleting = signal(false);

  protected readonly canManage = computed(() => {
    const role = this.authFacade.currentRole();
    return role === 'ADMIN' || role === 'COORDINATOR';
  });

  /** Eliminar es más destructivo que crear/editar (revierte la cotización
   *  de origen si la hay) — se restringe a ADMIN, ver `firestore.rules`. */
  protected readonly canDelete = computed(() => this.authFacade.currentRole() === 'ADMIN');

  protected readonly statusOptions = Object.entries(ORDER_STATUS_CONFIG) as [
    OrderStatus,
    { label: string; color: string },
  ][];

  protected readonly formatDateNumeric = formatDateNumeric;

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

  protected readonly visibleOrders = computed(() => this.filtered().slice(0, this.visibleCount()));
  protected readonly hasMore = computed(() => this.visibleCount() < this.filtered().length);
  protected readonly nextBatchSize = computed(() =>
    Math.min(PAGE_SIZE, this.filtered().length - this.visibleCount()),
  );

  /** Referencia "viva": si la orden cambia mientras el modal sigue abierto,
   *  refleja el dato actualizado en vez de una foto vieja. */
  protected readonly liveDetailOrder = computed<ServiceOrder | null>(() => {
    const id = this.detailOrderId();
    return id ? (this.ordersFacade.orders().find((order) => order.id === id) ?? null) : null;
  });

  constructor() {
    this.ordersFacade.init();
    this.clientsFacade.init();
  }

  protected statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_CONFIG[status].label;
  }

  protected statusColor(status: OrderStatus): string {
    return ORDER_STATUS_CONFIG[status].color;
  }

  protected priorityLabel(priority: OrderPriority): string {
    return ORDER_PRIORITY_CONFIG[priority].label;
  }

  protected priorityColor(priority: OrderPriority): string {
    return ORDER_PRIORITY_CONFIG[priority].color;
  }

  protected technicianNames(order: ServiceOrder): string[] {
    return order.assignedTechnicianIds.map((id) => this.ordersFacade.technicianName(id));
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilterOption);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected showMore(): void {
    this.visibleCount.update((count) => count + PAGE_SIZE);
  }

  protected showAll(): void {
    this.visibleCount.set(this.filtered().length);
  }

  protected openDetail(order: ServiceOrder): void {
    this.detailOrderId.set(order.id);
  }

  protected closeDetail(): void {
    this.detailOrderId.set(null);
  }

  protected openCreate(): void {
    this.editingOrder.set(null);
    this.formOpen.set(true);
  }

  /** Disparado desde `OrderDetailModal` ("Editar"): cierra el detalle y
   *  abre el mismo formulario de creación en modo edición. */
  protected openEdit(order: ServiceOrder): void {
    this.detailOrderId.set(null);
    this.editingOrder.set(order);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingOrder.set(null);
  }

  /** "Editar" directo desde la fila de la tabla — mismo destino que el
   *  botón "Editar" del detalle, sin pasar por él. */
  protected openEditFromList(order: ServiceOrder, event: Event): void {
    event.stopPropagation();
    this.editingOrder.set(order);
    this.formOpen.set(true);
  }

  protected confirmDelete(order: ServiceOrder, event: Event): void {
    event.stopPropagation();
    this.deletingOrder.set(order);
  }

  protected cancelDelete(): void {
    this.deletingOrder.set(null);
  }

  protected async deleteConfirmed(): Promise<void> {
    const order = this.deletingOrder();
    if (!order) {
      return;
    }
    this.deleting.set(true);
    try {
      await this.ordersFacade.deleteOrder(order);
      this.deletingOrder.set(null);
    } finally {
      this.deleting.set(false);
    }
  }
}
