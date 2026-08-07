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

  it('should expose the mobile tabs, compact action and filter row', () => {
    const mobileTabs = fixture.nativeElement.querySelectorAll('.mobile-order-tab');
    const mobileAction = fixture.nativeElement.querySelector('.mobile-create-order-btn');
    const mobileSearch = fixture.nativeElement.querySelector('.mobile-order-search input');
    const mobileStatus = fixture.nativeElement.querySelector('.mobile-order-status');

    expect(mobileTabs).toHaveLength(3);
    expect(mobileAction?.textContent).toContain('Nueva orden');
    expect(mobileSearch).toBeTruthy();
    expect(mobileStatus).toBeTruthy();
  });

  it('should apply the active orders quick filter', async () => {
    const activeFilter: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-status-filter="active"]',
    );

    activeFilter.click();
    await fixture.whenStable();

    expect(activeFilter.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('.mobile-orders-count')?.textContent).toContain(
      '1 orden',
    );
  });
});
