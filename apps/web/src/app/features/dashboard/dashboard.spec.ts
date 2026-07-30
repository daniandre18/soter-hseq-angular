import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Dashboard } from './dashboard';
import { OrdersFacade } from '../orders/facades/orders.facade';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
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
