import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import type { ClientTag } from '../models/client-tag.model';

export type ClientTagsState = EntityState<ClientTag, string>;

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'client-tags', idKey: 'id' })
export class ClientTagsStore extends EntityStore<ClientTagsState> {
  constructor() {
    super();
  }
}
