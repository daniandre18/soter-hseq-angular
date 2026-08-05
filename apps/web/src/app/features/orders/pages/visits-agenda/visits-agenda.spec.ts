import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { VisitsAgenda } from './visits-agenda';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import type { ServiceOrder } from '../../models/order.model';

function buildOrder(overrides: Partial<ServiceOrder>): ServiceOrder {
  return {
    id: overrides.id ?? 'order-1',
    orderNumber: 'VIS-0001',
    clientId: 'client-1',
    clientBusinessName: 'Textiles del Caribe',
    assignedTechnicianIds: [],
    title: 'Visita técnica',
    priority: 'MEDIUM',
    progress: 0,
    status: 'SCHEDULED',
    serviceSummary: 'Visita técnica',
    evidenceCount: 0,
    scheduledStart: new Date('2026-08-10T09:00:00'),
    createdAt: new Date('2026-08-01'),
    createdBy: 'admin',
    updatedAt: new Date('2026-08-01'),
    updatedBy: 'admin',
    ...overrides,
  };
}

describe('VisitsAgenda', () => {
  let component: VisitsAgenda;
  let fixture: ComponentFixture<VisitsAgenda>;
  let orders: ReturnType<typeof signal<ServiceOrder[]>>;

  beforeEach(async () => {
    orders = signal<ServiceOrder[]>([]);

    await TestBed.configureTestingModule({
      imports: [VisitsAgenda],
      providers: [
        provideRouter([]),
        {
          provide: OrdersFacade,
          useValue: {
            orders,
            technicians: signal([]),
            error: signal(null),
            init: () => undefined,
            technicianName: () => 'Técnico',
          },
        },
        { provide: AuthFacade, useValue: { currentRole: signal('ADMIN') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitsAgenda);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should combine search, status, technician and date-range filters', () => {
    orders.set([
      buildOrder({
        id: 'order-1',
        clientBusinessName: 'Textiles del Caribe',
        status: 'SCHEDULED',
        assignedTechnicianIds: ['tech-1'],
        scheduledStart: new Date('2026-08-10T09:00:00'),
      }),
      buildOrder({
        id: 'order-2',
        clientBusinessName: 'Minera Andina',
        status: 'IN_PROGRESS',
        assignedTechnicianIds: ['tech-2'],
        scheduledStart: new Date('2026-08-15T09:00:00'),
      }),
      buildOrder({
        id: 'order-3',
        clientBusinessName: 'Textiles del Norte',
        status: 'CANCELLED',
        assignedTechnicianIds: ['tech-1'],
        scheduledStart: new Date('2026-08-12T09:00:00'),
      }),
    ]);

    expect(component['scheduledVisits']().length).toBe(3);

    component['search'].set('textiles');
    expect(component['scheduledVisits']().map((o) => o.id)).toEqual(['order-1', 'order-3']);

    component['statusFilter'].set('SCHEDULED');
    expect(component['scheduledVisits']().map((o) => o.id)).toEqual(['order-1']);

    component['statusFilter'].set('all');
    component['selectedTechnicianId'].set('tech-1');
    expect(component['scheduledVisits']().map((o) => o.id)).toEqual(['order-1', 'order-3']);

    component['dateFrom'].set('2026-08-11');
    expect(component['scheduledVisits']().map((o) => o.id)).toEqual(['order-3']);

    component['clearFilters']();
    expect(component['scheduledVisits']().length).toBe(3);
  });

  it('shows the technician filter for non-technician roles', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.technician-filter')).toBeTruthy();
  });
});

describe('VisitsAgenda (TECHNICIAN)', () => {
  it('hides the technician filter — a technician only sees their own agenda', async () => {
    await TestBed.configureTestingModule({
      imports: [VisitsAgenda],
      providers: [
        provideRouter([]),
        {
          provide: OrdersFacade,
          useValue: {
            orders: signal([]),
            technicians: signal([]),
            error: signal(null),
            init: () => undefined,
            technicianName: () => 'Técnico',
          },
        },
        { provide: AuthFacade, useValue: { currentRole: signal('TECHNICIAN') } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VisitsAgenda);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.technician-filter')).toBeFalsy();
  });
});
