import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import type { AppUser } from '../../../core/models/app-user.model';

export type InternalUsersState = EntityState<AppUser, string>;

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'internalUsers', idKey: 'id' })
export class InternalUsersStore extends EntityStore<InternalUsersState> {
  constructor() {
    super();
  }
}
