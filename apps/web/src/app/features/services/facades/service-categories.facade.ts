import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ServiceCategoriesQuery } from '../state/service-categories.query';
import { ServiceCategoriesService } from '../state/service-categories.service';
import { AuthFacade } from '../../auth/facades/auth.facade';
import type { NewServiceCategory, ServiceCategory } from '../models/service-category.model';
import type { ReleaseListener } from '../../../shared/utils/reference-counted-listener';

/** Único punto de contacto entre la UI y el catálogo de categorías de servicio. */
@Injectable({ providedIn: 'root' })
export class ServiceCategoriesFacade {
  private readonly query = inject(ServiceCategoriesQuery);
  private readonly service = inject(ServiceCategoriesService);
  private readonly authFacade = inject(AuthFacade);

  readonly categories = toSignal(this.query.categories$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });

  init(): ReleaseListener {
    return this.service.watchCategories();
  }

  byId(id: string): ServiceCategory | undefined {
    return this.categories().find((category) => category.id === id);
  }

  async addCategory(data: NewServiceCategory): Promise<string> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    return this.service.addCategory(data, userId);
  }

  async updateCategory(id: string, data: NewServiceCategory): Promise<void> {
    await this.service.updateCategory(id, data);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.service.deleteCategory(id);
  }
}
