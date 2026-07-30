import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import type { Service } from '../models/service.model';

export type ServicesState = EntityState<Service, string>;

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'services', idKey: 'id' })
export class ServicesStore extends EntityStore<ServicesState> {
  constructor() {
    super();
  }
}
