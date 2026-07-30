import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ServicesList } from './services-list';
import { ServicesFacade } from '../../facades/services.facade';

describe('ServicesList', () => {
  let component: ServicesList;
  let fixture: ComponentFixture<ServicesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesList],
      providers: [
        {
          provide: ServicesFacade,
          useValue: {
            services: signal([]),
            loading: signal(false),
            deleteService: async () => undefined,
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
});
