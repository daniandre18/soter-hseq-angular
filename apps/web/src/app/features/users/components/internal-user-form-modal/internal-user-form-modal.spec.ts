import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InternalUsersFacade } from '../../facades/internal-users.facade';
import { InternalUserFormModal } from './internal-user-form-modal';

describe('InternalUserFormModal', () => {
  let fixture: ComponentFixture<InternalUserFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternalUserFormModal],
      providers: [
        {
          provide: InternalUsersFacade,
          useValue: {
            inviteUser: async () => ({ uid: 'new-user', invitationSent: true }),
            updateUser: async () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InternalUserFormModal);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
  });

  it('uses an invitation flow without a password field', () => {
    expect(fixture.nativeElement.textContent).toContain('Acceso seguro por invitación');
    expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('input[type="email"]')).toBeTruthy();
  });

  it('offers only the three internal roles', () => {
    const options = Array.from<HTMLOptionElement>(fixture.nativeElement.querySelectorAll('option'));
    expect(options.map((option) => option.value)).toEqual([
      'ADMIN',
      'COORDINATOR',
      'COMMERCIAL',
    ]);
  });
});
