import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ServiceCategoriesManagerModal } from './service-categories-manager-modal';
import { ServiceCategoriesFacade } from '../../facades/service-categories.facade';

describe('ServiceCategoriesManagerModal', () => {
  let component: ServiceCategoriesManagerModal;
  let fixture: ComponentFixture<ServiceCategoriesManagerModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceCategoriesManagerModal],
      providers: [
        {
          provide: ServiceCategoriesFacade,
          useValue: {
            categories: signal([]),
            addCategory: async () => 'new-id',
            deleteCategory: async () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCategoriesManagerModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
