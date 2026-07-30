import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { OrderFormModal } from './order-form-modal';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { ServicesFacade } from '../../../services/facades/services.facade';
import { OrdersFacade } from '../../facades/orders.facade';

describe('OrderFormModal', () => {
  let component: OrderFormModal;
  let fixture: ComponentFixture<OrderFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderFormModal],
      providers: [
        { provide: ClientsFacade, useValue: { clients: signal([]) } },
        { provide: ServicesFacade, useValue: { activeServices: signal([]), byId: () => undefined, init: () => undefined } },
        {
          provide: OrdersFacade,
          useValue: {
            technicians: signal([]),
            createOrder: async () => 'new-id',
            updateOrderDetails: async () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
