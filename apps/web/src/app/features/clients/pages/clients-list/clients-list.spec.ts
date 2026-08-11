import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ClientsList } from './clients-list';
import { ClientsFacade } from '../../facades/clients.facade';
import { ClientsListPaginationFacade } from '../../facades/clients-list-pagination.facade';
import { ClientTagsFacade } from '../../facades/client-tags.facade';
import { OrdersFacade } from '../../../orders/facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import type { Client } from '../../models/client.model';
import { ClientPortalAccessFacade } from '../../facades/client-portal-access-facade';

describe('ClientsList', () => {
  let component: ClientsList;
  let fixture: ComponentFixture<ClientsList>;
  const setTag = vi.fn(async () => undefined);
  const updateClient = vi.fn(async () => undefined);
  const deleteClient = vi.fn(async () => undefined);
  const tags = signal([
    {
      id: 'vip',
      label: 'VIP',
      color: '#ef4444',
      createdAt: new Date('2026-08-01'),
      createdBy: 'admin',
    },
    {
      id: 'new',
      label: 'Nuevo',
      color: '#3b82f6',
      createdAt: new Date('2026-08-01'),
      createdBy: 'admin',
    },
  ]);
  const clients = signal<Client[]>([
    createClient('client-1', 'Textiles Andinos', 'ACTIVE', 'Medellín', ['vip', 'new']),
    createClient('client-2', 'Industrias del Valle', 'ACTIVE', 'medellin'),
    createClient('client-3', 'Logística Caribe', 'INACTIVE', 'Barranquilla'),
  ]);

  beforeEach(async () => {
    setTag.mockClear();
    updateClient.mockClear();
    deleteClient.mockClear();
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
            setTag,
            updateClient,
            deleteClient,
          },
        },
        {
          provide: ClientsListPaginationFacade,
          useValue: {
            clients,
            total: signal(3),
            activeTotal: signal(2),
            hasMore: signal(false),
            loadFirstPage: async () => undefined,
            loadNextPage: async () => undefined,
          },
        },
        { provide: OrdersFacade, useValue: { orders: signal([]) } },
        { provide: AuthFacade, useValue: { currentRole: signal('ADMIN') } },
        {
          provide: ClientPortalAccessFacade,
          useValue: {
            users: signal([]),
            inviteUser: async () => ({ uid: 'viewer' }),
            replaceUser: async () => ({ uid: 'viewer' }),
            sendAccessEmail: async () => undefined,
            setStatus: async () => undefined,
          },
        },
        {
          provide: ClientTagsFacade,
          useValue: {
            tags,
            loading: signal(false),
            init: () => undefined,
            byId: (id: string) => tags().find((tag) => tag.id === id),
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

  it('should render one compact desktop filter row without the old filter card header', () => {
    const filterBar: HTMLElement = fixture.nativeElement.querySelector(
      '.clients-desktop-filter-bar',
    );

    expect(filterBar).toBeTruthy();
    expect(filterBar.querySelector('input[type="search"]')).toBeTruthy();
    expect(filterBar.querySelectorAll('select')).toHaveLength(3);
    expect(filterBar.querySelector('.clients-summary')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.filter-panel-header')).toBeNull();
  });

  it('should consolidate desktop row actions into sites and one contextual menu', async () => {
    const actionsCell: HTMLElement = fixture.nativeElement.querySelector(
      '.clients-table tbody .actions-cell',
    );

    expect(actionsCell.querySelector('.sites-btn')).toBeTruthy();
    expect(actionsCell.closest('table')?.querySelector('.actions-header')?.textContent).toContain(
      'Acciones',
    );
    expect(actionsCell.querySelector('.row-actions-trigger')).toBeTruthy();
    expect(actionsCell.querySelectorAll('.icon-btn')).toHaveLength(0);

    actionsCell.querySelector<HTMLButtonElement>('.row-actions-trigger')?.click();
    await fixture.whenStable();

    const menu: HTMLElement = actionsCell.querySelector('.row-actions-popover')!;
    expect(menu.querySelectorAll('[role="menuitem"]')).toHaveLength(4);
    expect(menu.textContent).toContain('Ver detalle');
    expect(menu.textContent).toContain('Editar cliente');
    expect(menu.textContent).toContain('Gestionar etiquetas');
    expect(menu.textContent).toContain('Eliminar');
  });

  it('should leave empty tag cells clean and use semantic pastel tag colors', () => {
    const rows = fixture.nativeElement.querySelectorAll('.clients-table tbody tr');
    const firstRowTags: HTMLElement = rows[0].querySelector('.tag-chips');
    const secondRowTags: HTMLElement = rows[1].querySelector('.tag-chips');
    const chips = firstRowTags.querySelectorAll<HTMLElement>('.tag-chip');

    expect(secondRowTags.textContent?.trim()).toBe('');
    expect(chips[0].style.getPropertyValue('--tag-color')).toBe('#db2777');
    expect(chips[1].style.getPropertyValue('--tag-color')).toBe('#059669');
  });

  it('should assign a tag to every selected client from the floating bulk bar', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const checkboxes = root.querySelectorAll<HTMLInputElement>(
      '.clients-table tbody input[type="checkbox"]',
    );
    checkboxes[0].click();
    checkboxes[1].click();
    await fixture.whenStable();

    const bulkBar: HTMLElement = fixture.nativeElement.querySelector('.bulk-actions-bar');
    expect(bulkBar.textContent).toContain('2 clientes seleccionados');

    bulkBar.querySelector<HTMLButtonElement>('.bulk-action-btn')?.click();
    await fixture.whenStable();
    bulkBar.querySelector<HTMLButtonElement>('.bulk-action-popover .tag-option')?.click();
    await fixture.whenStable();

    expect(setTag).toHaveBeenCalledTimes(2);
    expect(setTag).toHaveBeenCalledWith('client-1', 'vip', true);
    expect(setTag).toHaveBeenCalledWith('client-2', 'vip', true);
    expect(fixture.nativeElement.querySelector('.bulk-actions-bar')).toBeNull();
  });

  it('should change the status of every selected client from the bulk bar', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const checkbox = root.querySelector<HTMLInputElement>(
      '.clients-table tbody input[type="checkbox"]',
    )!;
    checkbox.click();
    await fixture.whenStable();

    const actionButtons = root.querySelectorAll<HTMLButtonElement>(
      '.bulk-actions-bar .bulk-action-btn',
    );
    actionButtons[1].click();
    await fixture.whenStable();
    const statusOptions = root.querySelectorAll<HTMLButtonElement>(
      '.bulk-action-popover .tag-option',
    );
    statusOptions[1].click();
    await fixture.whenStable();

    expect(updateClient).toHaveBeenCalledWith('client-1', { status: 'INACTIVE' });
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
  tags: string[] = [],
): Client {
  return {
    id,
    businessName,
    taxId: `90000000${id.at(-1)}`,
    city,
    status,
    tags,
    createdAt: new Date('2026-08-01'),
    createdBy: 'admin',
    updatedAt: new Date('2026-08-01'),
    updatedBy: 'admin',
  };
}
