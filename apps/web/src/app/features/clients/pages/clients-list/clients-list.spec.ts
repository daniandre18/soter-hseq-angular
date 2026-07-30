import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ClientsList } from './clients-list';
import { ClientsFacade } from '../../facades/clients.facade';
import { OrdersFacade } from '../../../orders/facades/orders.facade';

describe('ClientsList', () => {
  let component: ClientsList;
  let fixture: ComponentFixture<ClientsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientsList],
      providers: [
        {
          provide: ClientsFacade,
          useValue: {
            clients: signal([]),
            loading: signal(false),
            init: () => undefined,
          },
        },
        { provide: OrdersFacade, useValue: { orders: signal([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
