import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Sidebar } from './sidebar';
import { AuthFacade } from '../../features/auth/facades/auth.facade';

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

    expect(logo?.getAttribute('src')).toBe('/soter-hseq-logo-menu.jpeg');
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

    expect(sectionTitles).toEqual(['Principal', 'Gestión comercial', 'Gestión operativa']);
    expect(commercialSection?.textContent).toContain('Clientes');
    expect(commercialSection?.textContent).toContain('Cotizaciones');
    expect(commercialSection?.textContent).toContain('Servicios');
    expect(commercialSection?.textContent).not.toContain('Órdenes de trabajo');

    const toggle = authorizedFixture.nativeElement.querySelector('.sidebar-group-toggle');
    toggle.click();
    authorizedFixture.detectChanges();

    expect(authorizedFixture.nativeElement.querySelectorAll('.sidebar-sublink')).toHaveLength(2);
  });
});
