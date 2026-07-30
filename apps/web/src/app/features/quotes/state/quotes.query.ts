import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { QuotesState, QuotesStore } from './quotes.store';

@Injectable({ providedIn: 'root' })
export class QuotesQuery extends QueryEntity<QuotesState> {
  readonly quotes$ = this.selectAll();
  readonly loading$ = this.selectLoading();
  readonly error$ = this.selectError<string | null>();

  constructor() {
    super(inject(QuotesStore));
  }
}
