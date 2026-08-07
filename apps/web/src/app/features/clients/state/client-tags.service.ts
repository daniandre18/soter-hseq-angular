import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CLIENT_TAG_REPOSITORY } from '../domain/client-tag.repository';
import { ClientTagsStore } from './client-tags.store';
import type { NewClientTag } from '../models/client-tag.model';

/** Mantiene el ClientTagsStore de Akita sincronizado con `ClientTagRepository`
 *  — el catálogo administrable que reemplaza la paleta fija de etiquetas
 *  que tenía antes este proyecto. */
@Injectable({ providedIn: 'root' })
export class ClientTagsService {
  private readonly store = inject(ClientTagsStore);
  private readonly repository = inject(CLIENT_TAG_REPOSITORY);

  private tagsSubscription: Subscription | null = null;
  private tagsRetriedAfterError = false;

  watchTags(): void {
    if (this.tagsSubscription) {
      return;
    }

    this.store.setLoading(true);
    this.tagsSubscription = this.repository.watchAll().subscribe({
      next: (tags) => {
        this.tagsRetriedAfterError = false;
        this.store.setError(null);
        this.store.set(tags);
        this.store.setLoading(false);
      },
      error: (error: Error & { code?: string }) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
        // Ver el mismo comentario en OrdersService.watchOrders: sin limpiar
        // el guard, un permission-denied transitorio justo tras el login
        // deja el listener atascado hasta recargar la página.
        this.tagsSubscription = null;
        if (error.code === 'permission-denied' && !this.tagsRetriedAfterError) {
          this.tagsRetriedAfterError = true;
          setTimeout(() => this.watchTags(), 1000);
        }
      },
    });
  }

  async addTag(data: NewClientTag, createdBy: string): Promise<string> {
    return this.repository.addTag(data, createdBy);
  }

  /** Hard delete: a diferencia de clientes/órdenes, una etiqueta no tiene
   *  "historial" propio que proteger. Los clientes que ya la tenían
   *  aplicada se quedan con ese `id` en su arreglo `tags` — la UI debe
   *  tolerar un `id` sin match (mismo criterio que borrar un servicio no
   *  rompe las cotizaciones ya creadas con él). */
  async deleteTag(id: string): Promise<void> {
    await this.repository.deleteTag(id);
  }
}
