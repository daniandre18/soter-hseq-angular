import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { SERVICE_CATEGORY_REPOSITORY } from '../domain/service-category.repository';
import { ServiceCategoriesStore } from './service-categories.store';
import type { NewServiceCategory } from '../models/service-category.model';

/** Mantiene el ServiceCategoriesStore de Akita sincronizado con
 *  `ServiceCategoryRepository` — el catálogo administrable que reemplaza
 *  el enum fijo que tenía antes este proyecto. */
@Injectable({ providedIn: 'root' })
export class ServiceCategoriesService {
  private readonly store = inject(ServiceCategoriesStore);
  private readonly repository = inject(SERVICE_CATEGORY_REPOSITORY);

  private categoriesSubscription: Subscription | null = null;
  private categoriesRetriedAfterError = false;

  watchCategories(): void {
    if (this.categoriesSubscription) {
      return;
    }

    this.store.setLoading(true);
    this.categoriesSubscription = this.repository.watchAll().subscribe({
      next: (categories) => {
        this.categoriesRetriedAfterError = false;
        this.store.setError(null);
        this.store.set(categories);
        this.store.setLoading(false);
      },
      error: (error: Error & { code?: string }) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
        // Ver el mismo comentario en OrdersService.watchOrders: sin limpiar
        // el guard, un permission-denied transitorio justo tras el login
        // deja el listener atascado hasta recargar la página.
        this.categoriesSubscription = null;
        if (error.code === 'permission-denied' && !this.categoriesRetriedAfterError) {
          this.categoriesRetriedAfterError = true;
          setTimeout(() => this.watchCategories(), 1000);
        }
      },
    });
  }

  async addCategory(data: NewServiceCategory, createdBy: string): Promise<string> {
    return this.repository.addCategory(data, createdBy);
  }

  async updateCategory(id: string, data: NewServiceCategory): Promise<void> {
    await this.repository.updateCategory(id, data);
  }

  /** Hard delete: sin "historial" propio (mismo criterio que `clientTags`).
   *  Los servicios que ya tenían esta categoría se quedan con ese `id` en
   *  `category` — la UI debe tolerar un `id` sin match. */
  async deleteCategory(id: string): Promise<void> {
    await this.repository.deleteCategory(id);
  }
}
