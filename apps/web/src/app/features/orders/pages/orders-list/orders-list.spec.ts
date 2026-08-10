import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { OrdersList } from './orders-list';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { ServicesFacade } from '../../../services/facades/services.facade';
import type { ServiceOrder } from '../../models/order.model';

describe('OrdersList', () => {
  let component: OrdersList;
  let fixture: ComponentFixture<OrdersList>;
  const orders = signal<ServiceOrder[]>([
    {
      id: 'order-1',
      orderNumber: 'ORD-2026-001',
      clientId: 'client-1',
      clientBusinessName: 'Textiles Andinos Ltda.',
      assignedTechnicianIds: ['technician-1'],
      title: 'Auditoría ISO 45001',
      priority: 'HIGH',
      dueDate: new Date('2026-08-07'),
      progress: 45,
      status: 'IN_PROGRESS',
      serviceSummary: 'Auditoría del sistema de seguridad',
      evidenceCount: 0,
      createdAt: new Date('2026-08-01'),
      createdBy: 'admin',
      updatedAt: new Date('2026-08-01'),
      updatedBy: 'admin',
    },
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersList],
      providers: [
        provideRouter([]),
        {
          provide: OrdersFacade,
          useValue: {
            orders,
            loading: signal(false),
            technicians: signal([]),
            technicianName: () => 'Andrés Morales',
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
            currentRole: signal('ADMIN'),
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

  it('should render the mobile order card with its main tracking data', () => {
    const mobileCard = fixture.nativeElement.querySelector('.mobile-order-row');

    expect(mobileCard?.textContent).toContain('ORD-2026-001');
    expect(mobileCard?.textContent).toContain('Textiles Andinos Ltda.');
    expect(mobileCard?.textContent).toContain('Andrés Morales');
    expect(mobileCard?.textContent).toContain('45%');
  });

  it('should expose compact action and filter rows on mobile', () => {
    const mobileAction = fixture.nativeElement.querySelector('.mobile-create-order-btn');
    const mobileCount = fixture.nativeElement.querySelector('.mobile-orders-count');
    const mobileSearch = fixture.nativeElement.querySelector('.mobile-order-search input');
    const mobileStatus = fixture.nativeElement.querySelector('.mobile-order-status');

    expect(mobileAction?.textContent).toContain('Nueva orden');
    expect(mobileCount?.textContent).toContain('1 orden');
    expect(mobileSearch).toBeTruthy();
    expect(mobileStatus).toBeTruthy();
  });

  it('should replace the inline actions with a single actions menu', () => {
    const mobileCard = fixture.nativeElement.querySelector('.mobile-order-row');

    expect(mobileCard?.querySelectorAll('.mobile-order-menu')).toHaveLength(1);
    expect(mobileCard?.querySelectorAll('.mobile-order-actions')).toHaveLength(0);
  });

  it('should close the mobile actions menu when clicking outside', async () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.mobile-order-menu-trigger',
    );

    trigger.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.mobile-order-menu-popover')).toBeTruthy();

    document.body.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.mobile-order-menu-popover')).toBeNull();
  });
});
