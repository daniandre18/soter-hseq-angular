import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import type { AppUser } from '../../../core/models/app-user.model';

export type TechniciansState = EntityState<AppUser, string>;

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'technicians', idKey: 'id' })
export class TechniciansStore extends EntityStore<TechniciansState> {
  constructor() {
    super();
  }
}
