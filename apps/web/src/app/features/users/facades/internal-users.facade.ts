import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { UserStatus } from '../../../core/models/app-user.model';
import type { InternalUserUpdate, NewInternalUserData } from '../models/internal-user.model';
import { InternalUsersQuery } from '../state/internal-users.query';
import { InternalUsersService } from '../state/internal-users.service';
import type { ReleaseListener } from '../../../shared/utils/reference-counted-listener';

@Injectable({ providedIn: 'root' })
export class InternalUsersFacade {
  private readonly query = inject(InternalUsersQuery);
  private readonly service = inject(InternalUsersService);

  readonly users = toSignal(this.query.users$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });
  readonly error = toSignal(this.query.error$, { initialValue: null });

  init(): ReleaseListener {
    return this.service.watchUsers();
  }

  inviteUser(data: NewInternalUserData) {
    return this.service.inviteUser(data);
  }

  updateUser(uid: string, changes: InternalUserUpdate): Promise<void> {
    return this.service.updateUser(uid, changes);
  }

  setStatus(uid: string, status: UserStatus): Promise<void> {
    return this.service.setStatus(uid, status);
  }

  sendAccessEmail(email: string): Promise<void> {
    return this.service.sendAccessEmail(email);
  }
}
