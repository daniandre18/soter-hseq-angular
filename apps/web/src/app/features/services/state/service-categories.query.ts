import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { ServiceCategoriesState, ServiceCategoriesStore } from './service-categories.store';

@Injectable({ providedIn: 'root' })
export class ServiceCategoriesQuery extends QueryEntity<ServiceCategoriesState> {
  readonly categories$ = this.selectAll();
  readonly loading$ = this.selectLoading();
  readonly error$ = this.selectError<string | null>();

  constructor() {
    super(inject(ServiceCategoriesStore));
  }
}
