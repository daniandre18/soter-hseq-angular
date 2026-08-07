import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { NewServiceCategory, ServiceCategory } from '../models/service-category.model';

/** Puerto de acceso al catálogo administrable `serviceCategories`. */
export interface ServiceCategoryRepository {
  watchAll(): Observable<ServiceCategory[]>;
  addCategory(data: NewServiceCategory, createdBy: string): Promise<string>;
  updateCategory(id: string, data: NewServiceCategory): Promise<void>;
  /** Hard delete: sin "historial" propio (mismo criterio que `clientTags`).
   *  Los servicios que ya tenían esta categoría se quedan con ese `id` en
   *  `category` — la UI debe tolerar un `id` sin match. */
  deleteCategory(id: string): Promise<void>;
}

export const SERVICE_CATEGORY_REPOSITORY = new InjectionToken<ServiceCategoryRepository>(
  'SERVICE_CATEGORY_REPOSITORY',
);
