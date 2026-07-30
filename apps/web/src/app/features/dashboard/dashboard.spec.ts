import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { OrdersFacade } from '../orders/facades/orders.facade';
import { ClientsFacade } from '../clients/facades/clients.facade';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
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
            upcomingVisits: signal([]),
            statusBreakdown: signal([]),
            topServices: signal([]),
            init: () => undefined,
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
