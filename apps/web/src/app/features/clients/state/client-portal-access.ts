import { Service, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { USERS_REPOSITORY } from '../../../core/repositories/users.repository';
import { USER_MANAGEMENT_GATEWAY } from '../../users/domain/user-management.gateway';
import type { UserStatus } from '../../../core/models/app-user.model';
import type {
  ClientPortalInvitationResult,
  ClientPortalUser,
  NewClientPortalUser,
  ReplacementClientPortalUser,
} from '../models/client-portal-user.model';
import { isClientPortalUser } from '../models/client-portal-user.model';

@Service()
export class ClientPortalAccessService {
  private readonly usersRepository = inject(USERS_REPOSITORY);
  private readonly managementGateway = inject(USER_MANAGEMENT_GATEWAY);

  watchUsers(): Observable<ClientPortalUser[]> {
    return this.usersRepository
      .watchByRole('VIEWER')
      .pipe(map((users) => users.filter(isClientPortalUser)));
  }

  async inviteUser(data: NewClientPortalUser): Promise<ClientPortalInvitationResult> {
    const uid = await this.managementGateway.inviteClientUser(data);
    return this.sendInvitation(uid, data.email);
  }

  async replaceUser(data: ReplacementClientPortalUser): Promise<ClientPortalInvitationResult> {
    const uid = await this.managementGateway.replaceClientUser(data);
    return this.sendInvitation(uid, data.email);
  }

  sendAccessEmail(email: string): Promise<void> {
    return this.managementGateway.sendAccessEmail(email);
  }

  setStatus(clientId: string, uid: string, status: UserStatus): Promise<void> {
    return this.managementGateway.setClientUserStatus({ clientId, uid, status });
  }

  private async sendInvitation(uid: string, email: string): Promise<ClientPortalInvitationResult> {
    try {
      await this.managementGateway.sendAccessEmail(email);
      return { uid, invitationSent: true };
    } catch {
      return { uid, invitationSent: false };
    }
  }
}
