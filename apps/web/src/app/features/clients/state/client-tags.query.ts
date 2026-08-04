import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { ClientTagsState, ClientTagsStore } from './client-tags.store';

@Injectable({ providedIn: 'root' })
export class ClientTagsQuery extends QueryEntity<ClientTagsState> {
  readonly tags$ = this.selectAll();
  readonly loading$ = this.selectLoading();
  readonly error$ = this.selectError<string | null>();

  constructor() {
    super(inject(ClientTagsStore));
  }
}
