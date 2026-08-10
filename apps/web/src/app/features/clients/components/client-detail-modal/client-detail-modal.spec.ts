import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';

import { ClientDetailModal } from './client-detail-modal';
import { ClientsFacade } from '../../facades/clients.facade';
import { OrdersFacade } from '../../../orders/facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { ClientPortalAccessFacade } from '../../facades/client-portal-access-facade';
import type { Client, ClientSite } from '../../models/client.model';

const CLIENT: Client = {
  id: 'client-1',
  businessName: 'Empresa Demo',
  taxId: '900123456-7',
  status: 'ACTIVE',
  tags: [],
  createdAt: new Date(),
  createdBy: 'admin-1',
  updatedAt: new Date(),
  updatedBy: 'admin-1',
};

const SITE: ClientSite = {
  id: 'site-1',
  name: 'Sede Norte',
  address: 'Calle 80 # 45-22',
  city: 'Bogotá',
  responsible: {
    name: 'Ana Ramírez',
    position: 'Coordinadora HSEQ',
    email: 'ana@empresa.com',
    phone: '300 123 4567',
  },
  status: 'ACTIVE',
  createdAt: new Date(),
  createdBy: 'admin-1',
  updatedAt: new Date(),
  updatedBy: 'admin-1',
};

describe('ClientDetailModal', () => {
  let component: ClientDetailModal;
  let fixture: ComponentFixture<ClientDetailModal>;
  let sites$: BehaviorSubject<ClientSite[]>;

  beforeEach(async () => {
    sites$ = new BehaviorSubject<ClientSite[]>([]);
    await TestBed.configureTestingModule({
      imports: [ClientDetailModal],
      providers: [
        {
          provide: ClientsFacade,
          useValue: {
            watchContacts: () => of([]),
            watchSites: () => sites$,
            addSite: async () => 'site-id',
            updateSite: async () => undefined,
            deleteSite: async () => undefined,
          },
        },
        { provide: OrdersFacade, useValue: { orders: signal([]) } },
        { provide: AuthFacade, useValue: { currentRole: signal('ADMIN') } },
        {
          provide: ClientPortalAccessFacade,
          useValue: {
            users: signal([]),
            inviteUser: async () => ({ uid: 'viewer-1', invitationSent: true }),
            replaceUser: async () => ({ uid: 'viewer-2', invitationSent: true }),
            setStatus: async () => undefined,
            sendAccessEmail: async () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the sites section and opens the inline create form', async () => {
    fixture.componentRef.setInput('client', CLIENT);
    await fixture.whenStable();

    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    const addButton = Array.from(buttons).find((button) =>
      button.textContent?.includes('Agregar una sede'),
    );
    expect(fixture.nativeElement.textContent).toContain('Sedes y responsables');
    expect(addButton).toBeTruthy();

    addButton?.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.site-simple-form')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Agregar sede');
  });

  it('shows portal access management to authorized client managers', async () => {
    fixture.componentRef.setInput('client', CLIENT);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-client-portal-access')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Acceso al portal');
  });

  it('renders a compact site row and opens it with its current values', async () => {
    sites$.next([SITE]);
    fixture.componentRef.setInput('client', CLIENT);
    await fixture.whenStable();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Sede Norte');
    expect(content).toContain('Ana Ramírez');
    expect(content).toContain('ana@empresa.com');

    const editButton = fixture.nativeElement.querySelector(
      'button[aria-label="Editar sede Sede Norte"]',
    ) as HTMLButtonElement | null;
    const deleteButton = fixture.nativeElement.querySelector(
      'button[aria-label="Eliminar sede Sede Norte"]',
    ) as HTMLButtonElement | null;
    expect(editButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();

    editButton?.click();
    await fixture.whenStable();

    const nameInput = fixture.nativeElement.querySelector(
      'input[autocomplete="organization"]',
    ) as HTMLInputElement | null;
    expect(fixture.nativeElement.querySelector('.site-simple-form')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Editar sede');
    expect(nameInput?.value).toBe('Sede Norte');
  });
});
