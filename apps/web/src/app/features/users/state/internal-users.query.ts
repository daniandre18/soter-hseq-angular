import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { InternalUsersState, InternalUsersStore } from './internal-users.store';

@Injectable({ providedIn: 'root' })
export class InternalUsersQuery extends QueryEntity<InternalUsersState> {
  readonly users$ = this.selectAll();
  readonly loading$ = this.selectLoading();
  readonly error$ = this.selectError<string | null>();

  constructor() {
    super(inject(InternalUsersStore));
  }
}
