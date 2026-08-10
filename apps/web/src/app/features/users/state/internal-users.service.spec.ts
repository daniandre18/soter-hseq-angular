import { TestBed } from '@angular/core/testing';
import { NEVER } from 'rxjs';
import { USERS_REPOSITORY } from '../../../core/repositories/users.repository';
import { USER_MANAGEMENT_GATEWAY } from '../domain/user-management.gateway';
import { InternalUsersService } from './internal-users.service';

describe('InternalUsersService', () => {
  it('preserves the created account result when the invitation email fails', async () => {
    await TestBed.configureTestingModule({
      providers: [
        InternalUsersService,
        { provide: USERS_REPOSITORY, useValue: { watchAll: () => NEVER } },
        {
          provide: USER_MANAGEMENT_GATEWAY,
          useValue: {
            inviteInternalUser: async () => 'user-1',
            sendAccessEmail: async () => {
              throw new Error('mail unavailable');
            },
          },
        },
      ],
    }).compileComponents();
    const service = TestBed.inject(InternalUsersService);

    const result = await service.inviteUser({
      displayName: 'Laura Ramírez',
      email: 'laura@soterhseq.com',
      jobTitle: 'Coordinadora HSEQ',
      role: 'COORDINATOR',
    });

    expect(result).toEqual({ uid: 'user-1', invitationSent: false });
  });
});
