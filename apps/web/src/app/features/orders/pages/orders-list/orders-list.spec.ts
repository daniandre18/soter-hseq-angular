import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { OrdersList } from './orders-list';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { ServicesFacade } from '../../../services/facades/services.facade';

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
            watchNotes: () => of([]),
            watchEvidence: () => of([]),
            watchClosingAct: () => of(null),
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            currentUser: signal(null),
            currentRole: signal(null),
          },
        },
        { provide: ClientsFacade, useValue: { clients: signal([]), init: () => undefined } },
        {
          provide: ServicesFacade,
          useValue: { activeServices: signal([]), byId: () => undefined, init: () => undefined },
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
