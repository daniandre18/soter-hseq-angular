import { Injectable, computed, inject, signal } from '@angular/core';
import { DASHBOARD_REPOSITORY } from '../domain/dashboard.repository';
import {
  EMPTY_DASHBOARD_SNAPSHOT,
  type DashboardSnapshot,
} from '../models/dashboard-snapshot.model';
import { ORDER_STATUS_CONFIG } from '../../orders/models/order-status-config';
import type { OrderStatus, ServiceOrder } from '../../orders/models/order.model';
import type { QuoteStatus } from '../../quotes/models/quote.model';
import type { PieSlice } from '../../../shared/components/pie-chart/pie-chart';
import type { ReleaseListener } from '../../../shared/utils/reference-counted-listener';
import { ReferenceCountedListener } from '../../../shared/utils/reference-counted-listener';

const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'SCHEDULED',
  'ASSIGNED',
  'IN_PROGRESS',
  'EVIDENCE_PENDING',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
];

export interface DashboardFunnelCounts {
  sent: number;
  approved: number;
  converted: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  private readonly repository = inject(DASHBOARD_REPOSITORY);
  private readonly listener = new ReferenceCountedListener();
  private readonly snapshotSignal = signal<DashboardSnapshot>(EMPTY_DASHBOARD_SNAPSHOT);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly recentOrders = computed(() => this.snapshotSignal().recentOrders);
  readonly upcomingVisits = computed(() => this.snapshotSignal().upcomingVisits);
  readonly overdueCount = computed(() => this.snapshotSignal().overdueOrderCount);
  readonly todayVisitsCount = computed(() => this.snapshotSignal().todayVisitsCount);
  readonly visitsThisWeekCount = computed(() => this.snapshotSignal().visitsThisWeekCount);
  readonly techniciansInFieldCount = computed(
    () => this.snapshotSignal().techniciansInFieldCount,
  );
  readonly technicianCount = computed(() => this.snapshotSignal().technicianCount);

  readonly ordersTotal = computed(() =>
    Object.values(this.snapshotSignal().orderStatusCounts).reduce(
      (total, count) => total + (count ?? 0),
      0,
    ),
  );
  readonly openCount = computed(() =>
    OPEN_ORDER_STATUSES.reduce((total, status) => total + this.orderStatusCount(status), 0),
  );
  readonly pendingCount = computed(() => this.orderStatusCount('DRAFT'));
  readonly correctionRequiredCount = computed(() => this.orderStatusCount('CORRECTION_REQUIRED'));

  readonly statusBreakdown = computed<PieSlice[]>(() =>
    (Object.entries(this.snapshotSignal().orderStatusCounts) as [OrderStatus, number][])
      .filter(([, value]) => value > 0)
      .map(([status, value]) => ({
        key: status,
        label: ORDER_STATUS_CONFIG[status].translationKey,
        value,
        color: ORDER_STATUS_CONFIG[status].hex,
      })),
  );

  readonly quotesTotal = computed(() =>
    Object.values(this.snapshotSignal().quoteStatusCounts).reduce(
      (total, count) => total + (count ?? 0),
      0,
    ),
  );
  readonly convertedCount = computed(() => this.quoteStatusCount('CONVERTED'));
  readonly conversionRate = computed(() => {
    const total = this.quotesTotal();
    return total === 0 ? 0 : Math.round((this.convertedCount() / total) * 100);
  });
  readonly funnelCounts = computed<DashboardFunnelCounts>(() => ({
    sent: this.quotesTotal() - this.quoteStatusCount('DRAFT'),
    approved: this.quoteStatusCount('APPROVED') + this.convertedCount(),
    converted: this.convertedCount(),
  }));

  init(): ReleaseListener {
    return this.listener.acquire(() => {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);
      return this.repository.watchSnapshot().subscribe({
        next: (snapshot) => {
          this.snapshotSignal.set(snapshot);
          this.errorSignal.set(null);
          this.loadingSignal.set(false);
        },
        error: (error: unknown) => {
          this.errorSignal.set(
            error instanceof Error ? error.message : 'No fue posible cargar el dashboard.',
          );
          this.loadingSignal.set(false);
          this.listener.markDisconnected();
        },
      });
    });
  }

  technicianNameFor(order: ServiceOrder): string {
    return order.assignedTechnicianNames?.[0] ?? (order.assignedTechnicianIds.length ? 'Técnico' : '');
  }

  private orderStatusCount(status: OrderStatus): number {
    return this.snapshotSignal().orderStatusCounts[status] ?? 0;
  }

  private quoteStatusCount(status: QuoteStatus): number {
    return this.snapshotSignal().quoteStatusCounts[status] ?? 0;
  }
}
