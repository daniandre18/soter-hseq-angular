import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import type { Quote } from '../models/quote.model';

export type QuotesState = EntityState<Quote, string>;

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'quotes', idKey: 'id' })
export class QuotesStore extends EntityStore<QuotesState> {
  constructor() {
    super();
  }
}
