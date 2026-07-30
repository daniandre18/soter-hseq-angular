import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { ServicesState, ServicesStore } from './services.store';

@Injectable({ providedIn: 'root' })
export class ServicesQuery extends QueryEntity<ServicesState> {
  readonly services$ = this.selectAll();
  readonly loading$ = this.selectLoading();
  readonly error$ = this.selectError<string | null>();

  constructor() {
    super(inject(ServicesStore));
  }
}
