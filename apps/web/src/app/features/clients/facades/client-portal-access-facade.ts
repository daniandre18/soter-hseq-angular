import { Service, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type {
  NewClientPortalUser,
  ReplacementClientPortalUser,
} from '../models/client-portal-user.model';
import { ClientPortalAccessService } from '../state/client-portal-access';
import type { UserStatus } from '../../../core/models/app-user.model';

@Service()
export class ClientPortalAccessFacade {
  private readonly service = inject(ClientPortalAccessService);

  readonly users = toSignal(this.service.watchUsers(), { initialValue: [] });

  inviteUser(data: NewClientPortalUser) {
    return this.service.inviteUser(data);
  }

  replaceUser(data: ReplacementClientPortalUser) {
    return this.service.replaceUser(data);
  }

  sendAccessEmail(email: string): Promise<void> {
    return this.service.sendAccessEmail(email);
  }

  setStatus(clientId: string, uid: string, status: UserStatus): Promise<void> {
    return this.service.setStatus(clientId, uid, status);
  }
}
