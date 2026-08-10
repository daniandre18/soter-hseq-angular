import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { USERS_REPOSITORY } from '../../../core/repositories/users.repository';
import { USER_MANAGEMENT_GATEWAY } from '../../users/domain/user-management.gateway';

import { ClientPortalAccessService } from './client-portal-access';

describe('ClientPortalAccessService', () => {
  const managementGateway = {
    inviteClientUser: vi.fn(async () => 'viewer-1'),
    replaceClientUser: vi.fn(async () => 'viewer-2'),
    setClientUserStatus: vi.fn(async () => undefined),
    sendAccessEmail: vi.fn(async () => undefined),
  };

  beforeEach(() => {
    managementGateway.inviteClientUser.mockClear();
    managementGateway.replaceClientUser.mockClear();
    managementGateway.setClientUserStatus.mockClear();
    managementGateway.sendAccessEmail.mockClear();
    TestBed.configureTestingModule({
      providers: [
        ClientPortalAccessService,
        { provide: USERS_REPOSITORY, useValue: { watchByRole: () => of([]) } },
        { provide: USER_MANAGEMENT_GATEWAY, useValue: managementGateway },
      ],
    });
  });

  it('creates the account even when Firebase cannot deliver the invitation email', async () => {
    managementGateway.sendAccessEmail.mockRejectedValueOnce(new Error('mail unavailable'));
    const service = TestBed.inject(ClientPortalAccessService);

    const result = await service.inviteUser({
      clientId: 'client-1',
      displayName: 'Laura Gómez',
      email: 'laura@cliente.com',
    });

    expect(result).toEqual({ uid: 'viewer-1', invitationSent: false });
  });

  it('replaces the previous account and sends the invitation to the new email', async () => {
    const service = TestBed.inject(ClientPortalAccessService);

    const result = await service.replaceUser({
      clientId: 'client-1',
      currentUid: 'viewer-old',
      displayName: 'Carlos Pérez',
      email: 'carlos@cliente.com',
    });

    expect(managementGateway.replaceClientUser).toHaveBeenCalledWith(
      expect.objectContaining({ currentUid: 'viewer-old', email: 'carlos@cliente.com' }),
    );
    expect(managementGateway.sendAccessEmail).toHaveBeenCalledWith('carlos@cliente.com');
    expect(result).toEqual({ uid: 'viewer-2', invitationSent: true });
  });

  it('should be created', () => {
    const service = TestBed.inject(ClientPortalAccessService);
    expect(service).toBeTruthy();
  });

  it('changes status through the client-scoped gateway operation', async () => {
    const service = TestBed.inject(ClientPortalAccessService);

    await service.setStatus('client-1', 'viewer-1', 'INACTIVE');

    expect(managementGateway.setClientUserStatus).toHaveBeenCalledWith({
      clientId: 'client-1',
      uid: 'viewer-1',
      status: 'INACTIVE',
    });
  });
});
