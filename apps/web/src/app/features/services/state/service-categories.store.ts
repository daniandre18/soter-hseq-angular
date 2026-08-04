import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import type { ServiceCategory } from '../models/service-category.model';

export type ServiceCategoriesState = EntityState<ServiceCategory, string>;

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'service-categories', idKey: 'id' })
export class ServiceCategoriesStore extends EntityStore<ServiceCategoriesState> {
  constructor() {
    super();
  }
}
