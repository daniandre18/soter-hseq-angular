import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AppUser } from '../../../../core/models/app-user.model';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { InternalUsersFacade } from '../../facades/internal-users.facade';
import { InternalUsersList } from './internal-users-list';

const USERS: AppUser[] = [
  {
    id: 'admin-1',
    uid: 'admin-1',
    displayName: 'Carolina Méndez',
    email: 'carolina@soterhseq.com',
    jobTitle: 'Directora HSEQ',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date('2026-08-01'),
    createdBy: 'seed',
    updatedAt: new Date('2026-08-09'),
    updatedBy: 'seed',
  },
  {
    id: 'commercial-1',
    uid: 'commercial-1',
    displayName: 'Laura Ramírez',
    email: 'laura@soterhseq.com',
    jobTitle: 'Ejecutiva comercial',
    role: 'COMMERCIAL',
    status: 'INACTIVE',
    createdAt: new Date('2026-08-01'),
    createdBy: 'admin-1',
    updatedAt: new Date('2026-08-08'),
    updatedBy: 'admin-1',
  },
];

describe('InternalUsersList', () => {
  let fixture: ComponentFixture<InternalUsersList>;
  const users = signal(USERS);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternalUsersList],
      providers: [
        {
          provide: InternalUsersFacade,
          useValue: {
            users,
            loading: signal(false),
            error: signal(null),
            init: () => undefined,
            setStatus: async () => undefined,
            sendAccessEmail: async () => undefined,
          },
        },
        {
          provide: AuthFacade,
          useValue: { currentUser: signal(USERS[0]) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InternalUsersList);
    await fixture.whenStable();
  });

  it('renders administrative users in desktop and mobile layouts', () => {
    expect(fixture.nativeElement.textContent).toContain('Carolina Méndez');
    expect(fixture.nativeElement.textContent).toContain('Laura Ramírez');
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.mobile-user-card')).toHaveLength(2);
  });

  it('uses one domain action and the standardized desktop menu', () => {
    const table: HTMLElement = fixture.nativeElement.querySelector('.users-card table');

    expect(table.querySelector('.actions-header')?.textContent).toContain('Acciones');
    expect(table.querySelector('.action-cell > .domain-action-btn')).toBeTruthy();
    expect(table.querySelector('.action-cell app-row-actions-menu')).toBeTruthy();
  });

  it('combines search and role filters', async () => {
    const search: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    search.value = 'laura';
    search.dispatchEvent(new Event('input'));
    const role: HTMLSelectElement = fixture.nativeElement.querySelectorAll('select')[0];
    role.value = 'COMMERCIAL';
    role.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Laura Ramírez');
  });

  it('closes the action menu when clicking outside', async () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.menu-trigger');
    trigger.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.action-menu')).toBeTruthy();

    document.body.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.action-menu')).toBeFalsy();
  });
});
