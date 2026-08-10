import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { DASHBOARD_REPOSITORY } from '../domain/dashboard.repository';
import type { DashboardSnapshot } from '../models/dashboard-snapshot.model';
import { DashboardFacade } from './dashboard.facade';

const SNAPSHOT: DashboardSnapshot = {
  orderStatusCounts: {
    DRAFT: 2,
    SCHEDULED: 3,
    IN_PROGRESS: 1,
    CORRECTION_REQUIRED: 1,
    CLOSED: 3,
  },
  quoteStatusCounts: {
    DRAFT: 4,
    SENT: 2,
    APPROVED: 2,
    REJECTED: 1,
    CONVERTED: 1,
  },
  overdueOrderCount: 2,
  todayVisitsCount: 3,
  visitsThisWeekCount: 8,
  techniciansInFieldCount: 1,
  technicianCount: 1,
  recentOrders: [],
  upcomingVisits: [],
};

describe('DashboardFacade', () => {
  it('derives global KPI values from the repository snapshot', async () => {
    TestBed.configureTestingModule({
      providers: [
        DashboardFacade,
        {
          provide: DASHBOARD_REPOSITORY,
          useValue: { watchSnapshot: vi.fn(() => of(SNAPSHOT)) },
        },
      ],
    });
    const facade = TestBed.inject(DashboardFacade);

    facade.init();
    await vi.waitFor(() => expect(facade.loading()).toBe(false));

    expect(facade.ordersTotal()).toBe(10);
    expect(facade.openCount()).toBe(5);
    expect(facade.pendingCount()).toBe(2);
    expect(facade.overdueCount()).toBe(2);
    expect(facade.correctionRequiredCount()).toBe(1);
    expect(facade.quotesTotal()).toBe(10);
    expect(facade.conversionRate()).toBe(10);
    expect(facade.funnelCounts()).toEqual({ sent: 6, approved: 3, converted: 1 });
    expect(facade.technicianCount()).toBe(1);
  });

  it('exposes a readable error when the snapshot fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        DashboardFacade,
        {
          provide: DASHBOARD_REPOSITORY,
          useValue: { watchSnapshot: vi.fn(() => throwError(() => new Error('Sin conexión'))) },
        },
      ],
    });
    const facade = TestBed.inject(DashboardFacade);

    facade.init();
    await vi.waitFor(() => expect(facade.loading()).toBe(false));

    expect(facade.error()).toBe('Sin conexión');
  });

  it('updates KPI values when the metrics document emits again', () => {
    const metrics = new Subject<DashboardSnapshot>();
    TestBed.configureTestingModule({
      providers: [
        DashboardFacade,
        {
          provide: DASHBOARD_REPOSITORY,
          useValue: { watchSnapshot: vi.fn(() => metrics.asObservable()) },
        },
      ],
    });
    const facade = TestBed.inject(DashboardFacade);
    const release = facade.init();
    metrics.next(SNAPSHOT);
    expect(facade.ordersTotal()).toBe(10);

    metrics.next({
      ...SNAPSHOT,
      orderStatusCounts: { ...SNAPSHOT.orderStatusCounts, DRAFT: 3 },
    });

    expect(facade.ordersTotal()).toBe(11);
    release();
    expect(metrics.observed).toBe(false);
  });
});
