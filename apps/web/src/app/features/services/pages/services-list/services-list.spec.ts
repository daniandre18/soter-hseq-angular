import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { ServicesList } from './services-list';
import { ServicesFacade } from '../../facades/services.facade';
import { ServiceCategoriesFacade } from '../../facades/service-categories.facade';
import type { Service } from '../../models/service.model';
import type { ServiceCategory } from '../../models/service-category.model';

describe('ServicesList', () => {
  let component: ServicesList;
  let fixture: ComponentFixture<ServicesList>;
  const services = signal<Service[]>([
    {
      id: 'service-1',
      name: 'Auditoría ISO 45001',
      description: 'Revisión del sistema de seguridad y salud en el trabajo.',
      category: 'category-1',
      price: 850000,
      unit: 'servicio',
      active: true,
      createdAt: new Date('2026-08-01'),
      createdBy: 'admin',
      updatedAt: new Date('2026-08-01'),
      updatedBy: 'admin',
    },
  ]);
  const categories = signal<ServiceCategory[]>([
    {
      id: 'category-1',
      label: 'Seguridad Industrial',
      icon: '🦺',
      color: '#3b82f6',
      createdAt: new Date('2026-08-01'),
      createdBy: 'admin',
    },
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesList],
      providers: [
        provideRouter([]),
        {
          provide: ServicesFacade,
          useValue: {
            services,
            loading: signal(false),
            deleteService: async () => undefined,
            init: () => undefined,
          },
        },
        {
          provide: ServiceCategoriesFacade,
          useValue: {
            categories,
            byId: (id: string) => categories().find((category) => category.id === id),
            init: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the mobile service card with its category and price', () => {
    fixture.detectChanges();

    const mobileCard = fixture.nativeElement.querySelector('.mobile-service-row');

    expect(mobileCard?.textContent).toContain('Auditoría ISO 45001');
    expect(mobileCard?.textContent).toContain('Seguridad Industrial');
    expect(mobileCard?.textContent).toContain('850.000');
  });
});
