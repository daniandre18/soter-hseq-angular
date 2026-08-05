import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientFormModal } from './client-form-modal';
import { ClientsFacade } from '../../facades/clients.facade';
import type { Client, NewClientSite } from '../../models/client.model';

const CLIENT: Client = {
  id: 'client-1',
  businessName: 'Textiles Andinos',
  taxId: '900123456-7',
  status: 'ACTIVE',
  tags: [],
  createdAt: new Date(),
  createdBy: 'admin-1',
  updatedAt: new Date(),
  updatedBy: 'admin-1',
};

describe('ClientFormModal', () => {
  let component: ClientFormModal;
  let fixture: ComponentFixture<ClientFormModal>;
  let createdSites: NewClientSite[] | null;

  beforeEach(async () => {
    createdSites = null;
    await TestBed.configureTestingModule({
      imports: [ClientFormModal],
      providers: [
        {
          provide: ClientsFacade,
          useValue: {
            addClient: async () => 'new-id',
            addClientWithSites: async (_client: unknown, sites: NewClientSite[]) => {
              createdSites = sites;
              return 'new-id';
            },
            updateClient: async () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('offers direct access to sites when editing a client', async () => {
    const requested: Client[] = [];
    component.manageSitesRequested.subscribe((client) => requested.push(client));
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('editingClient', CLIENT);
    await fixture.whenStable();

    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    const manageButton = Array.from(buttons).find((button) =>
      button.textContent?.includes('Administrar sedes'),
    );

    expect(manageButton).toBeTruthy();
    manageButton?.click();

    expect(requested).toEqual([CLIENT]);
  });

  it('allows adding an optional site while creating a client', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('editingClient', null);
    await fixture.whenStable();

    const addSiteButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Agregar una sede'));
    expect(addSiteButton).toBeTruthy();

    addSiteButton?.click();
    await fixture.whenStable();

    setInputValue(fixture, '.site-draft-form [placeholder="Ej. Sede Norte"]', 'Sede Principal');
    setInputValue(
      fixture,
      '.site-draft-form [placeholder="Calle 80 # 45-22"]',
      'Carrera 7 # 10-20',
    );
    setInputValue(fixture, '.site-draft-form [placeholder="Bogotá"]', 'Bogotá');
    setInputValue(fixture, '.site-draft-form [placeholder="Nombre completo"]', 'Laura Gómez');
    setInputValue(fixture, '.site-draft-form [placeholder="+57 300 000 0000"]', '300 555 1234');
    await fixture.whenStable();

    const saveSiteButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.site-draft-form button[type="submit"]',
    );
    expect(saveSiteButton.disabled).toBe(false);
    saveSiteButton.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Sede Principal');
    expect(fixture.nativeElement.textContent).toContain('Laura Gómez');
    expect(fixture.nativeElement.textContent).toContain('Agregar otra sede');

    setInputValue(fixture, '[placeholder="Empresa S.A.S."]', 'Empresa Nueva');
    setInputValue(fixture, '[placeholder="900.000.000-0"]', '900999888-1');
    await fixture.whenStable();

    const saveClientButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.modal-footer button',
      ) as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === 'Guardar');
    expect(saveClientButton?.disabled).toBe(false);
    saveClientButton?.click();
    await fixture.whenStable();

    expect(createdSites).toHaveLength(1);
    expect(createdSites?.[0]?.name).toBe('Sede Principal');
  });
});

function setInputValue(
  fixture: ComponentFixture<ClientFormModal>,
  selector: string,
  value: string,
) {
  const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}
