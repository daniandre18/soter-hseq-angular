import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
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
import type { OrderPriority, OrderStatus, ServiceOrder } from '../../models/order.model';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';

type StatusFilterOption = 'all' | 'active' | 'closed' | OrderStatus;

const PAGE_SIZE = 10;
const CLOSED_ORDER_STATUSES = new Set<OrderStatus>(['CLOSED', 'CANCELLED']);

@Component({
  selector: 'app-orders-list',
  imports: [
    Card,
    Button,
    StatusBadge,
    ProgressBar,
    Avatar,
    Modal,
    Icon,
    OrderDetailModal,
    OrderFormModal,
    TranslocoPipe,
    LocalizedDatePipe,
  ],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './orders-list.html',
  styleUrl: './orders-list.scss',
})
export class OrdersList {
  protected readonly ordersFacade = inject(OrdersFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  /** `?open=<id>` — usado por la campanita de notificaciones para abrir
   *  directo el detalle en vez de solo aterrizar en el listado. */
  private readonly openQueryParamId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('open'))),
    { initialValue: null },
  );

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
    { translationKey: string; color: string },
  ][];

  protected readonly totalOrdersCount = computed(() => this.ordersFacade.orders().length);
  protected readonly activeOrdersCount = computed(
    () =>
      this.ordersFacade.orders().filter((order) => !CLOSED_ORDER_STATUSES.has(order.status)).length,
  );
  protected readonly closedOrdersCount = computed(
    () =>
      this.ordersFacade.orders().filter((order) => CLOSED_ORDER_STATUSES.has(order.status)).length,
  );


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

  /** Referencia "viva": si la orden cambia mientras el modal sigue abierto,
   *  refleja el dato actualizado en vez de una foto vieja. */
  protected readonly liveDetailOrder = computed<ServiceOrder | null>(() => {
    const id = this.detailOrderId();
    return id ? (this.ordersFacade.orders().find((order) => order.id === id) ?? null) : null;
  });

  constructor() {
    this.ordersFacade.init();
    if (this.canManage()) {
      this.clientsFacade.init();
    }

    // Espera a que `orders()` traiga la orden pedida (puede llegar vacío
    // mientras el listener de Firestore aún carga) y limpia el query param
    // al abrir, para no reabrir el modal si el usuario navega de vuelta.
    effect(() => {
      const id = this.openQueryParamId();
      if (!id) {
        return;
      }
      const order = this.ordersFacade.orders().find((candidate) => candidate.id === id);
      if (order) {
        this.detailOrderId.set(order.id);
        void this.router.navigate([], {
          queryParams: { open: null },
          queryParamsHandling: 'merge',
        });
      }
    });
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
    return order.assignedTechnicianIds.map((id) => this.ordersFacade.technicianName(id));
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
