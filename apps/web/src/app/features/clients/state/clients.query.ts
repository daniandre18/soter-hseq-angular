import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { ClientsState, ClientsStore } from './clients.store';

@Injectable({ providedIn: 'root' })
export class ClientsQuery extends QueryEntity<ClientsState> {
  readonly clients$ = this.selectAll();
  readonly loading$ = this.selectLoading();
  readonly error$ = this.selectError<string | null>();

  constructor() {
    super(inject(ClientsStore));
  }
}
