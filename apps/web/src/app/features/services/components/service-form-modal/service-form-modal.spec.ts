import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ServiceFormModal } from './service-form-modal';
import { ServicesFacade } from '../../facades/services.facade';
import { ServiceCategoriesFacade } from '../../facades/service-categories.facade';

describe('ServiceFormModal', () => {
  let component: ServiceFormModal;
  let fixture: ComponentFixture<ServiceFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceFormModal],
      providers: [
        { provide: ServicesFacade, useValue: { addService: async () => 'new-id', updateService: async () => undefined } },
        { provide: ServiceCategoriesFacade, useValue: { categories: signal([]), init: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
