import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { TechniciansState, TechniciansStore } from './technicians.store';

@Injectable({ providedIn: 'root' })
export class TechniciansQuery extends QueryEntity<TechniciansState> {
  readonly technicians$ = this.selectAll();
  readonly loading$ = this.selectLoading();
  readonly error$ = this.selectError<string | null>();

  constructor() {
    super(inject(TechniciansStore));
  }
}
