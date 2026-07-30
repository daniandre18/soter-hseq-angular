import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { OrdersState, OrdersStore } from './orders.store';

@Injectable({ providedIn: 'root' })
export class OrdersQuery extends QueryEntity<OrdersState> {
  readonly orders$ = this.selectAll();
  readonly loading$ = this.selectLoading();
  readonly error$ = this.selectError<string | null>();

  constructor() {
    super(inject(OrdersStore));
  }
}
