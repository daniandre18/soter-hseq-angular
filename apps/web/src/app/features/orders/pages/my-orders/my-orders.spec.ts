import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { MyOrders } from './my-orders';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';

describe('MyOrders', () => {
  let component: MyOrders;
  let fixture: ComponentFixture<MyOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyOrders],
      providers: [
        {
          provide: OrdersFacade,
          useValue: {
            orders: signal([]),
            loading: signal(false),
            technicians: signal([]),
            technicianName: () => '',
            init: () => undefined,
            watchNotes: () => of([]),
            watchEvidence: () => of([]),
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            currentUser: signal(null),
            currentRole: signal(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
