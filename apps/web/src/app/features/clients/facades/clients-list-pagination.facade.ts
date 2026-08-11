import { Injectable, inject, signal } from '@angular/core';
import { CLIENT_REPOSITORY } from '../domain/client.repository';
import type { Client } from '../models/client.model';

/** Estado aislado del listado paginado. No sustituye el directorio completo
 * usado por formularios y detalles, por lo que la migración es segura. */
@Injectable({ providedIn: 'root' })
export class ClientsListPaginationFacade {
  private readonly repository = inject(CLIENT_REPOSITORY);
  private cursor: import('../domain/client.repository').ClientPageCursor | null = null;

  readonly clients = signal<Client[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasMore = signal(true);
  readonly total = signal(0);
  readonly activeTotal = signal(0);

  async loadFirstPage(pageSize: number): Promise<void> {
    this.cursor = null;
    this.clients.set([]);
    this.hasMore.set(true);
    await Promise.all([
      this.loadNextPage(pageSize),
      this.repository.count().then((total) => this.total.set(total)),
      this.repository.count('ACTIVE').then((total) => this.activeTotal.set(total)),
    ]);
  }

  async loadNextPage(pageSize: number): Promise<void> {
    if (this.loading() || !this.hasMore()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const page = await this.repository.listPage(this.cursor, pageSize);
      this.clients.update((current) => [...current, ...page.clients]);
      this.cursor = page.nextCursor;
      this.hasMore.set(page.nextCursor !== null);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los clientes.');
    } finally {
      this.loading.set(false);
    }
  }
}
