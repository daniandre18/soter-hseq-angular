import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechnicianFormModal } from './technician-form-modal';
import { TechniciansFacade } from '../../facades/technicians.facade';

describe('TechnicianFormModal', () => {
  let component: TechnicianFormModal;
  let fixture: ComponentFixture<TechnicianFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicianFormModal],
      providers: [
        {
          provide: TechniciansFacade,
          useValue: { createTechnician: async () => 'new-uid', updateTechnician: async () => undefined },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TechnicianFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
