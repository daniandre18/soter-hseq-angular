import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AppUser } from '../../../../core/models/app-user.model';
import { ClientPortalAccessFacade } from '../../facades/client-portal-access-facade';
import type { Client } from '../../models/client.model';

import { ClientPortalAccess } from './client-portal-access';

describe('ClientPortalAccess', () => {
  let component: ClientPortalAccess;
  let fixture: ComponentFixture<ClientPortalAccess>;

  const users = signal<AppUser[]>([]);
  const facade = {
    users,
    inviteUser: vi.fn(async () => ({ uid: 'viewer-new', invitationSent: true })),
    replaceUser: vi.fn(async () => ({ uid: 'viewer-replacement', invitationSent: true })),
    setStatus: vi.fn(async () => undefined),
    sendAccessEmail: vi.fn(async () => undefined),
  };

  beforeEach(async () => {
    users.set([]);
    facade.inviteUser.mockClear();
    facade.replaceUser.mockClear();
    facade.setStatus.mockClear();
    facade.sendAccessEmail.mockClear();
    await TestBed.configureTestingModule({
      imports: [ClientPortalAccess],
      providers: [{ provide: ClientPortalAccessFacade, useValue: facade }],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientPortalAccess);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('client', CLIENT);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('invites the first portal user without asking for a password', async () => {
    expect(fixture.nativeElement.textContent).toContain('Invitar usuario');
    (fixture.nativeElement.querySelector('app-button button') as HTMLButtonElement).click();
    await fixture.whenStable();

    setInput(fixture, 'input[autocomplete="name"]', 'Laura Gómez');
    setInput(fixture, 'input[type="email"]', 'LAURA@CLIENTE.COM');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeFalsy();

    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(facade.inviteUser).toHaveBeenCalledWith({
      clientId: 'client-1',
      displayName: 'Laura Gómez',
      email: 'laura@cliente.com',
      phone: undefined,
    });
  });

  it('replaces the active user with a different person and email', async () => {
    users.set([VIEWER]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('actual@cliente.com');

    const buttons = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'));
    buttons.find((button) => button.textContent?.includes('Reemplazar usuario'))?.click();
    await fixture.whenStable();
    setInput(fixture, 'input[autocomplete="name"]', 'Carlos Pérez');
    setInput(fixture, 'input[type="email"]', 'nuevo@cliente.com');
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(facade.replaceUser).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        currentUid: 'viewer-current',
        email: 'nuevo@cliente.com',
      }),
    );
  });

  it('asks for confirmation before deactivating portal access', async () => {
    users.set([VIEWER]);
    await fixture.whenStable();

    findButton(fixture, 'Desactivar acceso')?.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('¿Desactivar el acceso al portal?');

    findButton(fixture, 'Sí, desactivar')?.click();
    await fixture.whenStable();

    expect(facade.setStatus).toHaveBeenCalledWith('client-1', 'viewer-current', 'INACTIVE');
  });

  it('allows an inactive portal account to be activated again', async () => {
    users.set([{ ...VIEWER, status: 'INACTIVE' }]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Acceso inactivo');

    findButton(fixture, 'Activar acceso')?.click();
    await fixture.whenStable();

    expect(facade.setStatus).toHaveBeenCalledWith('client-1', 'viewer-current', 'ACTIVE');
  });
});

const CLIENT: Client = {
  id: 'client-1',
  businessName: 'Empresa Demo',
  taxId: '900123456-7',
  status: 'ACTIVE',
  tags: [],
  createdAt: new Date('2026-08-01'),
  createdBy: 'admin',
  updatedAt: new Date('2026-08-01'),
  updatedBy: 'admin',
};

const VIEWER: AppUser = {
  id: 'viewer-current',
  uid: 'viewer-current',
  displayName: 'Usuario Actual',
  email: 'actual@cliente.com',
  clientId: 'client-1',
  role: 'VIEWER',
  status: 'ACTIVE',
  createdAt: new Date('2026-08-01'),
  createdBy: 'admin',
  updatedAt: new Date('2026-08-01'),
  updatedBy: 'admin',
};

function setInput(
  fixture: ComponentFixture<ClientPortalAccess>,
  selector: string,
  value: string,
): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function findButton(
  fixture: ComponentFixture<ClientPortalAccess>,
  text: string,
): HTMLButtonElement | undefined {
  return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(
    (button) => button.textContent?.includes(text),
  );
}
