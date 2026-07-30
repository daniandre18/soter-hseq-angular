import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { OrderDetailModal } from './order-detail-modal';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';

describe('OrderDetailModal', () => {
  let component: OrderDetailModal;
  let fixture: ComponentFixture<OrderDetailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetailModal],
      providers: [
        {
          provide: OrdersFacade,
          useValue: {
            technicians: signal([]),
            technicianName: () => '',
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
