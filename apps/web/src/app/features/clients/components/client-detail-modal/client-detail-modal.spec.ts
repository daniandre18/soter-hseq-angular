import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { ClientDetailModal } from './client-detail-modal';
import { ClientsFacade } from '../../facades/clients.facade';
import { OrdersFacade } from '../../../orders/facades/orders.facade';

describe('ClientDetailModal', () => {
  let component: ClientDetailModal;
  let fixture: ComponentFixture<ClientDetailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientDetailModal],
      providers: [
        { provide: ClientsFacade, useValue: { watchContacts: () => of([]) } },
        { provide: OrdersFacade, useValue: { orders: signal([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
