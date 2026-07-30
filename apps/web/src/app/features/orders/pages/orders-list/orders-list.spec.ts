import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { OrdersList } from './orders-list';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';

describe('OrdersList', () => {
  let component: OrdersList;
  let fixture: ComponentFixture<OrdersList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersList],
      providers: [
        {
          provide: OrdersFacade,
          useValue: {
            orders: signal([]),
            loading: signal(false),
            technicians: signal([]),
            technicianName: () => '',
            init: () => undefined,
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

    fixture = TestBed.createComponent(OrdersList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
