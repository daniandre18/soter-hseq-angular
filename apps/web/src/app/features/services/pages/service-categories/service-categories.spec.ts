import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ServiceCategories } from './service-categories';
import { ServiceCategoriesFacade } from '../../facades/service-categories.facade';
import { ServicesFacade } from '../../facades/services.facade';
import type { ServiceCategory } from '../../models/service-category.model';

describe('ServiceCategories', () => {
  let fixture: ComponentFixture<ServiceCategories>;
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
      imports: [ServiceCategories],
      providers: [
        {
          provide: ServiceCategoriesFacade,
          useValue: {
            categories,
            loading: signal(false),
            init: () => undefined,
            addCategory: async () => 'category-id',
            updateCategory: async () => undefined,
            deleteCategory: async () => undefined,
          },
        },
        {
          provide: ServicesFacade,
          useValue: {
            services: signal([]),
            init: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCategories);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open the edit form with the category values from its card', () => {
    fixture.nativeElement.querySelector('.edit-category-btn').click();
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.create-row input');

    expect(input.value).toBe('Seguridad Industrial');
    expect(fixture.nativeElement.querySelector('.form-title')?.textContent).toContain(
      'Editar categoría',
    );
  });
});
