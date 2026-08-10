import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { TechniciansList } from './technicians-list';
import { TechniciansFacade } from '../../facades/technicians.facade';
import type { AppUser } from '../../../../core/models/app-user.model';

describe('TechniciansList', () => {
  let component: TechniciansList;
  let fixture: ComponentFixture<TechniciansList>;
  const technicians = signal<AppUser[]>([
    {
      id: 'technician-1',
      uid: 'technician-1',
      displayName: 'Andrés Morales',
      email: 'andres@soterhseq.com',
      phone: '315 444 2210',
      specialty: 'Seguridad Industrial',
      role: 'TECHNICIAN',
      status: 'ACTIVE',
      createdAt: new Date('2026-08-01'),
      createdBy: 'admin',
      updatedAt: new Date('2026-08-01'),
      updatedBy: 'admin',
    },
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechniciansList],
      providers: [
        {
          provide: TechniciansFacade,
          useValue: {
            technicians,
            loading: signal(false),
            setStatus: async () => undefined,
            deleteTechnician: async () => undefined,
            init: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TechniciansList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the mobile technician card with its contact details', () => {
    fixture.detectChanges();

    const mobileCard = fixture.nativeElement.querySelector('.mobile-technician-row');

    expect(mobileCard?.textContent).toContain('Andrés Morales');
    expect(mobileCard?.textContent).toContain('andres@soterhseq.com');
    expect(mobileCard?.textContent).toContain('315 444 2210');
  });

  it('uses one domain action and the standardized desktop menu', () => {
    const table: HTMLElement = fixture.nativeElement.querySelector('.technicians-table');

    expect(table.querySelector('.actions-header')?.textContent).toContain('Acciones');
    expect(table.querySelector('.actions-cell > .domain-action-btn')).toBeTruthy();
    expect(table.querySelector('.actions-cell app-row-actions-menu')).toBeTruthy();
  });
});
