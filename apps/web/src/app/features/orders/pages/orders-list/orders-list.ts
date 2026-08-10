import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { OrderFormModal } from '../../components/order-form-modal/order-form-modal';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import { ORDER_PRIORITY_CONFIG } from '../../models/order-priority-config';
import type { OrderPriority, OrderStatus, ServiceOrder } from '../../models/order.model';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';

type StatusFilterOption = 'all' | 'active' | 'closed' | OrderStatus;

const PAGE_SIZE = 10;
const CLOSED_ORDER_STATUSES = new Set<OrderStatus>(['CLOSED', 'CANCELLED']);

@Component({
  selector: 'app-orders-list',
  imports: [Card, Button, StatusBadge, ProgressBar, Avatar, Modal, Icon, OrderFormModal, TranslocoPipe, LocalizedDatePipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './orders-list.html',
  styleUrl: './orders-list.scss',
})
export class OrdersList {
  protected readonly ordersFacade = inject(OrdersFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilterOption>('all');
  protected readonly visibleCount = signal(PAGE_SIZE);
  protected readonly formOpen = signal(false);
  protected readonly editingOrder = signal<ServiceOrder | null>(null);
  protected readonly deletingOrder = signal<ServiceOrder | null>(null);
  protected readonly deleting = signal(false);
  protected readonly openMobileActionsId = signal<string | null>(null);

  protected readonly canManage = computed(() => {
    const role = this.authFacade.currentRole();
    return role === 'ADMIN' || role === 'COORDINATOR';
  });

  /** Eliminar es más destructivo que crear/editar (revierte la cotización
   *  de origen si la hay) — se restringe a ADMIN, ver `firestore.rules`. */
  protected readonly canDelete = computed(() => this.authFacade.currentRole() === 'ADMIN');

  protected readonly statusOptions = Object.entries(ORDER_STATUS_CONFIG) as [
    OrderStatus,
    { translationKey: string; color: string },
  ][];

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
        const isClosed = CLOSED_ORDER_STATUSES.has(order.status);
        const matchesStatus =
          status === 'all' ||
          (status === 'active' && !isClosed) ||
          (status === 'closed' && isClosed) ||
          order.status === status;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });

  protected readonly visibleOrders = computed(() => this.filtered().slice(0, this.visibleCount()));
  protected readonly hasMore = computed(() => this.visibleCount() < this.filtered().length);
  protected readonly hasCollapsed = computed(() => this.visibleCount() > PAGE_SIZE);
  protected readonly nextBatchSize = computed(() =>
    Math.min(PAGE_SIZE, this.filtered().length - this.visibleCount()),
  );

  constructor() {
    this.ordersFacade.init();
    if (this.canManage()) {
      this.clientsFacade.init();
    }
    // Acceso directo desde el acceso rápido "+ Nueva Orden" del dashboard
    // (`?crear=1`) — abre el mismo modal que el botón "Nueva orden" de esta
    // página, sin duplicar su lógica.
    if (this.canManage() && this.route.snapshot.queryParamMap.get('crear') === '1') {
      this.openCreate();
      void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  protected statusLabel(status: OrderStatus): string {
    this.language.currentLanguage();
    return this.transloco.translate(ORDER_STATUS_CONFIG[status].translationKey);
  }

  protected statusColor(status: OrderStatus): string {
    return ORDER_STATUS_CONFIG[status].color;
  }

  protected priorityLabel(priority: OrderPriority): string {
    this.language.currentLanguage();
    return this.transloco.translate(ORDER_PRIORITY_CONFIG[priority].translationKey);
  }

  protected priorityColor(priority: OrderPriority): string {
    return ORDER_PRIORITY_CONFIG[priority].color;
  }

  protected technicianNames(order: ServiceOrder): string[] {
    return order.assignedTechnicianNames?.length
      ? order.assignedTechnicianNames
      : order.assignedTechnicianIds.map((id) => this.ordersFacade.technicianName(id));
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected onStatusChange(event: Event): void {
    this.selectStatusFilter((event.target as HTMLSelectElement).value as StatusFilterOption);
  }

  protected selectStatusFilter(status: StatusFilterOption): void {
    this.statusFilter.set(status);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected showMore(): void {
    this.visibleCount.update((count) => count + PAGE_SIZE);
  }

  protected showAll(): void {
    this.visibleCount.set(this.filtered().length);
  }

  protected showLess(): void {
    this.visibleCount.set(PAGE_SIZE);
  }

  protected openDetail(order: ServiceOrder): void {
    void this.router.navigate(['/ordenes', order.id]);
  }

  protected toggleMobileActions(orderId: string, event: Event): void {
    event.stopPropagation();
    this.openMobileActionsId.update((currentId) => (currentId === orderId ? null : orderId));
  }

  @HostListener('document:click')
  protected closeMobileActions(): void {
    this.openMobileActionsId.set(null);
  }

  protected openCreate(): void {
    this.editingOrder.set(null);
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
