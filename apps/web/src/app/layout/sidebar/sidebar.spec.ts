import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Sidebar } from './sidebar';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import { SettingsFacade } from '../../features/settings/facades/settings.facade';
import { PushNotificationsFacade } from '../../features/push-notifications/facades/push-notifications.facade';

const pushFacadeStub = {
  supported: false,
  enabled: signal(false),
  enabling: signal(false),
  error: signal<string | null>(null),
  enable: async () => undefined,
  disable: async () => undefined,
};

const settingsFacadeStub = {
  settings: signal({
    businessName: 'SOTER HSEQ',
    logoUrl: undefined,
    logoDesktopSize: 44,
    logoMobileSize: 36,
    logoAlignment: 'left' as const,
    updatedAt: new Date(0),
    updatedBy: '',
  }),
  loading: signal(false),
  init: () => undefined,
};

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            currentUser: signal(null),
            currentRole: signal(null),
            logout: async () => undefined,
          },
        },
        { provide: SettingsFacade, useValue: settingsFacadeStub },
        { provide: PushNotificationsFacade, useValue: pushFacadeStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the SOTER HSEQ brand logo', () => {
    const logo: HTMLImageElement | null =
      fixture.nativeElement.querySelector('.sidebar-logo-image');

    // Sin tema explícito en localStorage y sin preferencia de SO oscura
    // (polyfill de `matchMedia` en test-providers.ts), `ThemeService`
    // resuelve a 'light' — el logo por defecto en ese tema.
    expect(logo?.getAttribute('src')).toBe('soter-hseq-logo-light.png');
    expect(logo?.getAttribute('alt')).toContain('SOTER HSEQ');
  });

  it('should show the services submenu for authorized roles', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            currentUser: signal(null),
            currentRole: signal('ADMIN'),
            logout: async () => undefined,
          },
        },
        { provide: SettingsFacade, useValue: settingsFacadeStub },
        { provide: PushNotificationsFacade, useValue: pushFacadeStub },
      ],
    }).compileComponents();

    const authorizedFixture = TestBed.createComponent(Sidebar);
    authorizedFixture.detectChanges();

    const sectionTitles = Array.from<HTMLElement>(
      authorizedFixture.nativeElement.querySelectorAll('.sidebar-section-title'),
    ).map((heading) => heading.textContent?.trim());
    const commercialSection: HTMLElement | null = authorizedFixture.nativeElement.querySelector(
      '[aria-labelledby="sidebar-section-commercial"]',
    );
    const primarySection: HTMLElement | null = authorizedFixture.nativeElement.querySelector(
      '[aria-labelledby="sidebar-section-primary"]',
    );
    const operationsSection: HTMLElement | null = authorizedFixture.nativeElement.querySelector(
      '[aria-labelledby="sidebar-section-operations"]',
    );

    expect(sectionTitles).toEqual(['Principal', 'Gestión comercial', 'Gestión operativa']);
    expect(commercialSection?.textContent).toContain('Clientes');
    expect(commercialSection?.textContent).toContain('Cotizaciones');
    expect(commercialSection?.textContent).toContain('Servicios');
    expect(commercialSection?.textContent).not.toContain('Órdenes de trabajo');
    expect(primarySection?.querySelector('a[href="/usuarios"]')).toBeNull();
    expect(
      operationsSection?.querySelector<HTMLElement>('a[href="/usuarios"]')?.textContent?.trim(),
    ).toBe('Usuarios');
    expect(operationsSection?.textContent).toContain('Técnicos');

    const toggle = authorizedFixture.nativeElement.querySelector('.sidebar-group-toggle');
    toggle.click();
    authorizedFixture.detectChanges();

    expect(authorizedFixture.nativeElement.querySelectorAll('.sidebar-sublink')).toHaveLength(2);
  });

  it('shows orders, agenda and quotes to the Cliente/VIEWER role', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            currentUser: signal(null),
            currentRole: signal('VIEWER'),
            logout: async () => undefined,
          },
        },
        { provide: SettingsFacade, useValue: settingsFacadeStub },
        { provide: PushNotificationsFacade, useValue: pushFacadeStub },
      ],
    }).compileComponents();

    const viewerFixture = TestBed.createComponent(Sidebar);
    viewerFixture.detectChanges();
    const links = Array.from<HTMLElement>(
      viewerFixture.nativeElement.querySelectorAll('.sidebar-link-label'),
    ).map((link) => link.textContent?.trim());

    expect(links).toEqual(['Órdenes de trabajo', 'Agenda de visitas', 'Cotizaciones']);
    expect(viewerFixture.nativeElement.textContent).not.toContain('Panel');
    expect(viewerFixture.nativeElement.textContent).not.toContain('Clientes');
  });
});
