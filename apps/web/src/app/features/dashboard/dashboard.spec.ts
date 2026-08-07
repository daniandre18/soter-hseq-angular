import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { OrdersFacade } from '../orders/facades/orders.facade';
import { ClientsFacade } from '../clients/facades/clients.facade';
import { QuotesFacade } from '../quotes/facades/quotes.facade';
import type { ServiceOrder } from '../orders/models/order.model';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let upcomingVisits: WritableSignal<ServiceOrder[]>;

  beforeEach(async () => {
    upcomingVisits = signal<ServiceOrder[]>([]);
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        {
          provide: OrdersFacade,
          useValue: {
            orders: signal([]),
            loading: signal(false),
            error: signal(null),
            assignedCount: signal(0),
            inProgressCount: signal(0),
            underReviewCount: signal(0),
            closedCount: signal(0),
            openCount: signal(0),
            overdueCount: signal(0),
            overdueOrders: signal([]),
            correctionRequiredOrders: signal([]),
            pendingCount: signal(0),
            todayVisitsCount: signal(0),
            techniciansInFieldCount: signal(0),
            recentOrders: signal([]),
            upcomingVisits,
            statusBreakdown: signal([]),
            init: () => undefined,
            technicianName: () => 'Andrés Morales',
          },
        },
        {
          provide: ClientsFacade,
          useValue: {
            clients: signal([]),
            loading: signal(false),
            activeCount: signal(0),
            init: () => undefined,
          },
        },
        {
          provide: QuotesFacade,
          useValue: {
            quotes: signal([]),
            loading: signal(false),
            error: signal(null),
            statusBreakdown: signal([]),
            init: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render all dashboard metrics using the compact card variant', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.stat-card--compact')).toHaveLength(9);
  });

  it('shows the scheduled visit time in upcoming visits', async () => {
    upcomingVisits.set([
      {
        id: 'order-1',
        orderNumber: 'OT-0001',
        clientId: 'client-1',
        clientBusinessName: 'Cliente Uno',
        assignedTechnicianIds: ['technician-1'],
        title: 'Inspección de seguridad',
        priority: 'MEDIUM',
        progress: 0,
        scheduledStart: new Date(2099, 7, 15, 9, 30),
        status: 'ASSIGNED',
        serviceSummary: 'Inspección de seguridad',
        evidenceCount: 0,
        createdAt: new Date('2026-08-01T12:00:00Z'),
        createdBy: 'admin-1',
        updatedAt: new Date('2026-08-01T12:00:00Z'),
        updatedBy: 'admin-1',
      },
    ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.list-row-subtitle')?.textContent).toContain(
      '09:30',
    );
  });
});
