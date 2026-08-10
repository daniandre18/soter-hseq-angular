import { Injectable, inject } from '@angular/core';
import type { UserStatus } from '../../../core/models/app-user.model';
import { USERS_REPOSITORY } from '../../../core/repositories/users.repository';
import { USER_MANAGEMENT_GATEWAY } from '../domain/user-management.gateway';
import type {
  InternalUserUpdate,
  InviteInternalUserResult,
  NewInternalUserData,
} from '../models/internal-user.model';
import { isInternalUser } from '../models/internal-user.model';
import { InternalUsersStore } from './internal-users.store';
import {
  ReferenceCountedListener,
  type ReleaseListener,
} from '../../../shared/utils/reference-counted-listener';

/** Casos de uso de cuentas administrativas; la UI nunca llama Firebase directamente. */
@Injectable({ providedIn: 'root' })
export class InternalUsersService {
  private readonly store = inject(InternalUsersStore);
  private readonly usersRepository = inject(USERS_REPOSITORY);
  private readonly managementGateway = inject(USER_MANAGEMENT_GATEWAY);
  private readonly listener = new ReferenceCountedListener();

  watchUsers(): ReleaseListener {
    return this.listener.acquire(() => {
      this.store.setLoading(true);
      return this.usersRepository.watchAll().subscribe({
        next: (users) => {
          this.store.set(users.filter(isInternalUser));
          this.store.setError(null);
          this.store.setLoading(false);
        },
        error: (error: Error) => {
          this.store.setError(error.message);
          this.store.setLoading(false);
          this.listener.markDisconnected();
        },
      });
    });
  }

  async inviteUser(data: NewInternalUserData): Promise<InviteInternalUserResult> {
    const uid = await this.managementGateway.inviteInternalUser(data);
    try {
      await this.managementGateway.sendAccessEmail(data.email);
      return { uid, invitationSent: true };
    } catch {
      return { uid, invitationSent: false };
    }
  }

  updateUser(uid: string, changes: InternalUserUpdate): Promise<void> {
    return this.managementGateway.updateInternalUser({ uid, ...changes });
  }

  setStatus(uid: string, status: UserStatus): Promise<void> {
    return this.managementGateway.setUserStatus(uid, status);
  }

  sendAccessEmail(email: string): Promise<void> {
    return this.managementGateway.sendAccessEmail(email);
  }
}
