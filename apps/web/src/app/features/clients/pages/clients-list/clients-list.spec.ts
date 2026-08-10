import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { ClientsList } from './clients-list';
import { ClientsFacade } from '../../facades/clients.facade';
import { ClientTagsFacade } from '../../facades/client-tags.facade';
import { OrdersFacade } from '../../../orders/facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import type { Client } from '../../models/client.model';

describe('ClientsList', () => {
  let component: ClientsList;
  let fixture: ComponentFixture<ClientsList>;
  const clients = signal<Client[]>([
    createClient('client-1', 'Textiles Andinos', 'ACTIVE', 'Medellín'),
    createClient('client-2', 'Industrias del Valle', 'ACTIVE', 'medellin'),
    createClient('client-3', 'Logística Caribe', 'INACTIVE', 'Barranquilla'),
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientsList],
      providers: [
        {
          provide: ClientsFacade,
          useValue: {
            clients,
            loading: signal(false),
            init: () => undefined,
            watchContacts: () => of([]),
            watchSites: () => of([]),
          },
        },
        { provide: OrdersFacade, useValue: { orders: signal([]) } },
        { provide: AuthFacade, useValue: { currentRole: signal(null) } },
        {
          provide: ClientTagsFacade,
          useValue: {
            tags: signal([]),
            loading: signal(false),
            init: () => undefined,
            byId: () => undefined,
            addTag: async () => 'new-id',
            deleteTag: async () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate the main client indicators from stored data', () => {
    fixture.detectChanges();

    const stats = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('app-stat-card'));

    expect(stats[0]?.textContent).toContain('Total clientes');
    expect(stats[0]?.textContent).toContain('3');
    expect(stats[1]?.textContent).toContain('Clientes activos');
    expect(stats[1]?.textContent).toContain('2');
    expect(stats[2]?.textContent).toContain('67%');
    expect(stats[3]?.textContent).toContain('2');
  });

  it('should filter clients by city and clear all filters', () => {
    fixture.detectChanges();
    const citySelect: HTMLSelectElement = fixture.nativeElement.querySelector('.city-select');

    citySelect.value = 'barranquilla';
    citySelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.mobile-client-row')).toHaveLength(1);
    const summaryText = fixture.nativeElement
      .querySelector('.clients-summary')
      ?.textContent.replace(/\s+/g, ' ');
    expect(summaryText).toContain('Mostrando 1 cliente');

    fixture.nativeElement.querySelector('.clear-filters-btn').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.mobile-client-row')).toHaveLength(3);
  });

  it('should expose the compact mobile search and advanced filters modal', async () => {
    expect(fixture.nativeElement.querySelector('.mobile-client-search input')).toBeTruthy();

    const filtersButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.mobile-advanced-filters-btn',
    );
    filtersButton.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.mobile-advanced-filters')).toBeTruthy();
  });

  it('should keep visible checkboxes for quick multi-selection', () => {
    const mobileCards = fixture.nativeElement.querySelectorAll('.mobile-client-row');
    const mobileCheckboxes = fixture.nativeElement.querySelectorAll(
      '.mobile-client-header > input[type="checkbox"]',
    );

    expect(mobileCheckboxes).toHaveLength(mobileCards.length);
  });

  it('should close the mobile client actions menu when clicking outside', async () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.mobile-client-menu-trigger',
    );
    trigger.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.mobile-client-menu-popover')).toBeTruthy();

    document.body.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.mobile-client-menu-popover')).toBeNull();
  });

  it('opens sites and responsible contacts directly from a client action', async () => {
    const sitesButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-label="Administrar sedes de Textiles Andinos"]',
    );

    expect(sitesButton).toBeTruthy();
    sitesButton.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.sites-section')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Sedes y responsables');
  });
});

function createClient(
  id: string,
  businessName: string,
  status: Client['status'],
  city: string,
): Client {
  return {
    id,
    businessName,
    taxId: `90000000${id.at(-1)}`,
    city,
    status,
    tags: [],
    createdAt: new Date('2026-08-01'),
    createdBy: 'admin',
    updatedAt: new Date('2026-08-01'),
    updatedBy: 'admin',
  };
}
