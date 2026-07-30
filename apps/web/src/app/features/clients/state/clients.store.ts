import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import type { Client } from '../models/client.model';

export type ClientsState = EntityState<Client, string>;

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'clients', idKey: 'id' })
export class ClientsStore extends EntityStore<ClientsState> {
  constructor() {
    super();
  }
}
