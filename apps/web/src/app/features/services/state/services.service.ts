import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { SERVICE_REPOSITORY } from '../domain/service.repository';
import { ServicesStore } from './services.store';
import type { NewService } from '../models/service.model';

/** Mantiene el ServicesStore de Akita sincronizado con `ServiceRepository`
 *  — el catálogo que se selecciona al armar una cotización. */
@Injectable({ providedIn: 'root' })
export class ServicesService {
  private readonly store = inject(ServicesStore);
  private readonly repository = inject(SERVICE_REPOSITORY);

  private servicesSubscription: Subscription | null = null;
  private servicesRetriedAfterError = false;

  watchServices(): void {
    if (this.servicesSubscription) {
      return;
    }

    this.store.setLoading(true);
    this.servicesSubscription = this.repository.watchAll().subscribe({
      next: (services) => {
        this.servicesRetriedAfterError = false;
        this.store.setError(null);
        this.store.set(services);
        this.store.setLoading(false);
      },
      error: (error: Error & { code?: string }) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
        // Ver el mismo comentario en OrdersService.watchOrders: sin limpiar
        // el guard, un permission-denied transitorio justo tras el login
        // deja el listener atascado hasta recargar la página.
        this.servicesSubscription = null;
        if (error.code === 'permission-denied' && !this.servicesRetriedAfterError) {
          this.servicesRetriedAfterError = true;
          setTimeout(() => this.watchServices(), 1000);
        }
      },
    });
  }

  async addService(data: NewService, createdBy: string): Promise<string> {
    return this.repository.addService(data, createdBy);
  }

  async updateService(id: string, changes: Partial<NewService>, updatedBy: string): Promise<void> {
    await this.repository.updateService(id, changes, updatedBy);
  }

  async deleteService(id: string): Promise<void> {
    await this.repository.deleteService(id);
  }
}
