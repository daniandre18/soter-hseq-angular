import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrdersQuery } from '../state/orders.query';
import { OrdersService } from '../state/orders.service';
import { ORDER_STATUS_CONFIG } from '../models/order-status-config';
import type { ServiceOrder } from '../models/order.model';
import type { PieSlice } from '../../../shared/components/pie-chart/pie-chart';
import type { BarListItem } from '../../../shared/components/bar-list/bar-list';

const OPEN_STATUSES = new Set<ServiceOrder['status']>([
  'SCHEDULED',
  'ASSIGNED',
  'IN_PROGRESS',
  'EVIDENCE_PENDING',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
]);

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Único punto de contacto entre la UI y el feature de órdenes.
 * Encapsula Akita (Store/Query) y Firestore (Service); los componentes
 * solo leen Signals, nunca el pipe `async` ni la Query directamente.
 */
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  private readonly query = inject(OrdersQuery);
  private readonly service = inject(OrdersService);

  readonly orders = toSignal(this.query.orders$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });
  readonly error = toSignal(this.query.error$, { initialValue: null });

  readonly assignedCount = computed(
    () => this.orders().filter((order) => order.status === 'ASSIGNED').length,
  );
  readonly inProgressCount = computed(
    () => this.orders().filter((order) => order.status === 'IN_PROGRESS').length,
  );
  readonly underReviewCount = computed(
    () => this.orders().filter((order) => order.status === 'UNDER_REVIEW').length,
  );
  readonly closedCount = computed(
    () => this.orders().filter((order) => order.status === 'CLOSED').length,
  );

  /** Órdenes que aún no llegan a un estado final (CLOSED/CANCELLED). */
  readonly openCount = computed(
    () => this.orders().filter((order) => OPEN_STATUSES.has(order.status)).length,
  );

  readonly pendingCount = computed(
    () => this.orders().filter((order) => order.status === 'DRAFT').length,
  );

  /** Programadas para hoy con fecha de fin vencida y sin cerrar/cancelar. */
  readonly overdueCount = computed(() => {
    const now = new Date();
    return this.orders().filter(
      (order) =>
        order.scheduledEnd !== undefined &&
        order.scheduledEnd < now &&
        order.status !== 'CLOSED' &&
        order.status !== 'CANCELLED',
    ).length;
  });

  readonly todayVisitsCount = computed(() => {
    const today = new Date();
    return this.orders().filter(
      (order) => order.scheduledStart !== undefined && isSameLocalDay(order.scheduledStart, today),
    ).length;
  });

  readonly techniciansInFieldCount = computed(() => {
    const technicianIds = new Set<string>();
    for (const order of this.orders()) {
      if (order.status === 'IN_PROGRESS') {
        order.assignedTechnicianIds.forEach((id) => technicianIds.add(id));
      }
    }
    return technicianIds.size;
  });

  readonly recentOrders = computed(() =>
    [...this.orders()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5),
  );

  readonly upcomingVisits = computed(() => {
    const today = startOfToday();
    return this.orders()
      .filter((order) => order.scheduledStart !== undefined && order.scheduledStart >= today)
      .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime())
      .slice(0, 5);
  });

  /** Para el PieChart "Órdenes por Estado". */
  readonly statusBreakdown = computed<PieSlice[]>(() => {
    const counts = new Map<ServiceOrder['status'], number>();
    for (const order of this.orders()) {
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([status, value]) => ({
      key: status,
      label: ORDER_STATUS_CONFIG[status].label,
      value,
      color: ORDER_STATUS_CONFIG[status].hex,
    }));
  });

  /**
   * Para el BarList "Servicios más solicitados". Se agrupa por el texto
   * libre `serviceSummary` (CLAUDE.md no define un catálogo de servicios
   * normalizado con id propio todavía).
   */
  readonly topServices = computed<BarListItem[]>(() => {
    const counts = new Map<string, number>();
    for (const order of this.orders()) {
      const label = order.serviceSummary?.trim();
      if (!label) {
        continue;
      }
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ key: label, label, value }));
  });

  init(): void {
    this.service.watchOrders();
  }

  async generateClosingActDraft(orderId: string, notes: string): Promise<void> {
    try {
      await this.service.generateClosingActDraft(orderId, notes);
    } catch (error) {
      console.error('Error generando el borrador del acta de cierre:', error);
      throw error;
    }
  }
}
