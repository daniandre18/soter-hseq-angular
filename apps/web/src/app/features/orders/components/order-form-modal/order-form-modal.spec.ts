import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';

import { OrderFormModal } from './order-form-modal';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { ServicesFacade } from '../../../services/facades/services.facade';
import { OrdersFacade } from '../../facades/orders.facade';
import type { Service } from '../../../services/models/service.model';
import type { Client } from '../../../clients/models/client.model';
import type { NewOrderServiceRow, ServiceOrder } from '../../models/order.model';

describe('OrderFormModal', () => {
  let component: OrderFormModal;
  let fixture: ComponentFixture<OrderFormModal>;
  let activeServices: WritableSignal<Service[]>;
  let clients: WritableSignal<Client[]>;
  let createdBatches: { clientId: string; clientBusinessName: string; rows: NewOrderServiceRow[] }[];
  let scheduledVisits: { orderId: string; start: Date; end?: Date }[];

  beforeEach(async () => {
    activeServices = signal<Service[]>([]);
    clients = signal<Client[]>([
      {
        id: 'client-1',
        businessName: 'Cliente Uno',
        taxId: '900123456',
        status: 'ACTIVE',
        tags: [],
        createdAt: new Date('2026-08-01T12:00:00Z'),
        createdBy: 'admin-1',
        updatedAt: new Date('2026-08-01T12:00:00Z'),
        updatedBy: 'admin-1',
      },
    ]);
    createdBatches = [];
    scheduledVisits = [];
    await TestBed.configureTestingModule({
      imports: [OrderFormModal],
      providers: [
        { provide: ClientsFacade, useValue: { clients } },
        {
          provide: ServicesFacade,
          useValue: {
            activeServices,
            byId: (id: string) => activeServices().find((service) => service.id === id),
            init: () => undefined,
          },
        },
        {
          provide: OrdersFacade,
          useValue: {
            technicians: signal([]),
            createOrders: async (
              clientId: string,
              clientBusinessName: string,
              rows: NewOrderServiceRow[],
            ) => {
              createdBatches.push({ clientId, clientBusinessName, rows });
              return rows.map((_, index) => `new-id-${index}`);
            },
            updateOrderDetails: async () => undefined,
            schedule: async (orderId: string, start: Date, end?: Date) => {
              scheduledVisits.push({ orderId, start, end });
            },
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

  it('should render a responsive form and grouped footer actions when opened', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.order-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('label.field--full select[aria-label="Cliente"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.order-rows-section')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.order-form-action')).toHaveLength(2);
  });

  it('shows a single empty service row by default in create mode', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.order-service-row')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('input[aria-label="Título de la orden"]')).toBeFalsy();
  });

  it('adds and removes service rows', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.add-row-btn').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.order-service-row')).toHaveLength(2);

    fixture.nativeElement.querySelector('.remove-row-btn').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.order-service-row')).toHaveLength(1);
  });

  it('restores the selected service when editing, even if the catalog loads later', async () => {
    const order: ServiceOrder = {
      id: 'order-1',
      orderNumber: 'OT-0001',
      clientId: 'client-1',
      clientBusinessName: 'Cliente Uno',
      assignedTechnicianIds: [],
      title: 'Inspección de seguridad',
      priority: 'MEDIUM',
      dueDate: new Date(2099, 7, 20),
      progress: 0,
      scheduledStart: new Date(2099, 7, 15, 8, 30),
      status: 'DRAFT',
      serviceSummary: 'Medición de iluminación y ruido',
      evidenceCount: 0,
      createdAt: new Date('2026-08-01T12:00:00Z'),
      createdBy: 'admin-1',
      updatedAt: new Date('2026-08-01T12:00:00Z'),
      updatedBy: 'admin-1',
    };

    fixture.componentRef.setInput('editingOrder', order);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const serviceSelect = fixture.nativeElement.querySelector(
      'select[aria-label="Servicio"]',
    ) as HTMLSelectElement;
    expect(serviceSelect.value).toBe('');
    expect(
      (fixture.nativeElement.querySelector(
        'input[aria-label="Fecha de visita"]',
      ) as HTMLInputElement).value,
    ).toBe('2099-08-15');
    expect(
      (fixture.nativeElement.querySelector(
        'input[aria-label="Hora de visita"]',
      ) as HTMLInputElement).value,
    ).toBe('08:30');

    activeServices.set([
      {
        id: 'service-1',
        name: 'Medición de iluminación y ruido',
        category: 'category-1',
        price: 250000,
        unit: 'visita',
        active: true,
        createdAt: new Date('2026-08-01T12:00:00Z'),
        createdBy: 'admin-1',
        updatedAt: new Date('2026-08-01T12:00:00Z'),
        updatedBy: 'admin-1',
      },
    ]);
    await fixture.whenStable();

    expect(serviceSelect.value).toBe('service-1');
  });

  it('creates one order per service row', async () => {
    activeServices.set([
      {
        id: 'service-1',
        name: 'Inspección de seguridad',
        category: 'category-1',
        price: 250000,
        unit: 'visita',
        active: true,
        createdAt: new Date('2026-08-01T12:00:00Z'),
        createdBy: 'admin-1',
        updatedAt: new Date('2026-08-01T12:00:00Z'),
        updatedBy: 'admin-1',
      },
      {
        id: 'service-2',
        name: 'Medición de iluminación',
        category: 'category-1',
        price: 180000,
        unit: 'visita',
        active: true,
        createdAt: new Date('2026-08-01T12:00:00Z'),
        createdBy: 'admin-1',
        updatedAt: new Date('2026-08-01T12:00:00Z'),
        updatedBy: 'admin-1',
      },
    ]);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.add-row-btn').click();
    await fixture.whenStable();

    const setControlValue = (element: Element | null, value: string): void => {
      const control = element as HTMLInputElement;
      control.value = value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const clientSelect = fixture.nativeElement.querySelector('select[aria-label="Cliente"]');
    setControlValue(clientSelect, 'client-1');

    const rows = fixture.nativeElement.querySelectorAll('.order-service-row');
    expect(rows).toHaveLength(2);

    setControlValue(rows[0].querySelector('select[aria-label="Servicio"]'), 'service-1');
    setControlValue(rows[0].querySelector('input[aria-label="Fecha límite"]'), '2099-08-20');
    setControlValue(rows[0].querySelector('input[aria-label="Fecha de visita"]'), '2099-08-15');
    setControlValue(rows[0].querySelector('input[aria-label="Hora de visita"]'), '09:30');

    setControlValue(rows[1].querySelector('select[aria-label="Servicio"]'), 'service-2');
    setControlValue(rows[1].querySelector('input[aria-label="Fecha límite"]'), '2099-08-22');
    await fixture.whenStable();

    const createButton = fixture.nativeElement.querySelector(
      '.order-form-action:last-child button',
    ) as HTMLButtonElement;
    expect(createButton.disabled).toBe(false);
    createButton.click();
    await fixture.whenStable();

    expect(createdBatches).toHaveLength(1);
    const [batch] = createdBatches;
    expect(batch.clientId).toBe('client-1');
    expect(batch.rows).toHaveLength(2);
    expect(batch.rows[0].serviceSummary).toBe('Inspección de seguridad');
    expect(batch.rows[0].scheduledStart?.getDate()).toBe(15);
    expect(batch.rows[0].scheduledStart?.getHours()).toBe(9);
    expect(batch.rows[1].serviceSummary).toBe('Medición de iluminación');
    expect(batch.rows[1].scheduledStart).toBeUndefined();
  });

  it('blocks creating an order when the visit is after its due date', async () => {
    activeServices.set([
      {
        id: 'service-1',
        name: 'Inspección de seguridad',
        category: 'category-1',
        price: 250000,
        unit: 'visita',
        active: true,
        createdAt: new Date('2026-08-01T12:00:00Z'),
        createdBy: 'admin-1',
        updatedAt: new Date('2026-08-01T12:00:00Z'),
        updatedBy: 'admin-1',
      },
    ]);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const setControlValue = (element: Element | null, value: string): void => {
      const control = element as HTMLInputElement;
      control.value = value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const row = fixture.nativeElement.querySelector('.order-service-row');
    setControlValue(fixture.nativeElement.querySelector('select[aria-label="Cliente"]'), 'client-1');
    setControlValue(row.querySelector('select[aria-label="Servicio"]'), 'service-1');
    setControlValue(row.querySelector('input[aria-label="Fecha límite"]'), '2099-08-20');
    setControlValue(row.querySelector('input[aria-label="Fecha de visita"]'), '2099-08-21');
    setControlValue(row.querySelector('input[aria-label="Hora de visita"]'), '09:30');
    await fixture.whenStable();

    const createButton = fixture.nativeElement.querySelector(
      '.order-form-action:last-child button',
    ) as HTMLButtonElement;
    expect(createButton.disabled).toBe(true);
    expect(component['orderForm'].rows[0].visitDate().errors()[0].message).toBe(
      'orders.validation.visitAfterDueDate',
    );
  });

  it('updates the visit date and time while preserving an existing duration', async () => {
    activeServices.set([
      {
        id: 'service-1',
        name: 'Inspección de seguridad',
        category: 'category-1',
        price: 250000,
        unit: 'visita',
        active: true,
        createdAt: new Date('2026-08-01T12:00:00Z'),
        createdBy: 'admin-1',
        updatedAt: new Date('2026-08-01T12:00:00Z'),
        updatedBy: 'admin-1',
      },
    ]);
    const order: ServiceOrder = {
      id: 'order-1',
      orderNumber: 'OT-0001',
      clientId: 'client-1',
      clientBusinessName: 'Cliente Uno',
      assignedTechnicianIds: [],
      title: 'Inspección de seguridad',
      priority: 'MEDIUM',
      dueDate: new Date(2099, 7, 20),
      progress: 0,
      scheduledStart: new Date(2099, 7, 15, 8, 30),
      scheduledEnd: new Date(2099, 7, 15, 10, 30),
      status: 'SCHEDULED',
      serviceSummary: 'Inspección de seguridad',
      evidenceCount: 0,
      createdAt: new Date('2026-08-01T12:00:00Z'),
      createdBy: 'admin-1',
      updatedAt: new Date('2026-08-01T12:00:00Z'),
      updatedBy: 'admin-1',
    };
    fixture.componentRef.setInput('editingOrder', order);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const visitDate = fixture.nativeElement.querySelector(
      'input[aria-label="Fecha de visita"]',
    ) as HTMLInputElement;
    const visitTime = fixture.nativeElement.querySelector(
      'input[aria-label="Hora de visita"]',
    ) as HTMLInputElement;
    visitDate.value = '2099-08-16';
    visitDate.dispatchEvent(new Event('input', { bubbles: true }));
    visitTime.value = '11:00';
    visitTime.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    (fixture.nativeElement.querySelector(
      '.order-form-action:last-child button',
    ) as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(scheduledVisits).toHaveLength(1);
    expect(scheduledVisits[0].start.getDate()).toBe(16);
    expect(scheduledVisits[0].start.getHours()).toBe(11);
    expect(scheduledVisits[0].end?.getHours()).toBe(13);
  });
});
