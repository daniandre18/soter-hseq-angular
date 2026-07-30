import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import type { ServiceOrder } from '../models/order.model';

export type OrdersState = EntityState<ServiceOrder, string>;

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'orders', idKey: 'id' })
export class OrdersStore extends EntityStore<OrdersState> {
  constructor() {
    super();
  }
}
