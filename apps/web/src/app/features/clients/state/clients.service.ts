import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CLIENT_REPOSITORY } from '../domain/client.repository';
import {
  ReferenceCountedListener,
  type ReleaseListener,
} from '../../../shared/utils/reference-counted-listener';
import { ClientsStore } from './clients.store';
import type {
  ClientContact,
  ClientSite,
  NewClient,
  NewClientContact,
  NewClientSite,
} from '../models/client.model';

/** Mantiene el ClientsStore de Akita sincronizado con `ClientRepository`. */
@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly store = inject(ClientsStore);
  private readonly repository = inject(CLIENT_REPOSITORY);

  private readonly listener = new ReferenceCountedListener();
  private clientsRetriedAfterError = false;

  watchClients(): ReleaseListener {
    return this.listener.acquire(() => {
      this.store.setLoading(true);
      return this.repository.watchAll().subscribe({
        next: (clients) => {
          this.clientsRetriedAfterError = false;
          this.store.setError(null);
          this.store.set(clients);
          this.store.setLoading(false);
        },
        error: (error: Error & { code?: string }) => {
          this.store.setError(error.message);
          this.store.setLoading(false);
          this.listener.markDisconnected();
          if (error.code === 'permission-denied' && !this.clientsRetriedAfterError) {
            this.clientsRetriedAfterError = true;
            this.listener.retryAfter(1000);
          }
        },
      });
    });
  }

  async addClient(data: NewClient, createdBy: string): Promise<string> {
    return this.repository.addClient(data, createdBy);
  }

  async addClientWithSites(
    data: NewClient,
    sites: NewClientSite[],
    createdBy: string,
  ): Promise<string> {
    return this.repository.addClientWithSites(data, sites, createdBy);
  }

  async updateClient(id: string, changes: Partial<NewClient>, updatedBy: string): Promise<void> {
    await this.repository.updateClient(id, changes, updatedBy);
  }

  /** Solo ADMIN (ver `firestore.rules`). Las cotizaciones/órdenes ya
   *  creadas guardan `clientBusinessName` por su cuenta, así que no quedan
   *  rotas visualmente — solo se pierde la ficha viva del cliente. */
  async deleteClient(id: string): Promise<void> {
    await this.repository.deleteClient(id);
  }

  async setTag(id: string, tag: string, enabled: boolean, updatedBy: string): Promise<void> {
    await this.repository.setTag(id, tag, enabled, updatedBy);
  }

  watchContacts(clientId: string): Observable<ClientContact[]> {
    return this.repository.watchContacts(clientId);
  }

  async addContact(clientId: string, contact: NewClientContact): Promise<void> {
    await this.repository.addContact(clientId, contact);
  }

  watchSites(clientId: string): Observable<ClientSite[]> {
    return this.repository.watchSites(clientId);
  }

  async addSite(clientId: string, site: NewClientSite, createdBy: string): Promise<string> {
    return this.repository.addSite(clientId, site, createdBy);
  }

  async updateSite(
    clientId: string,
    siteId: string,
    changes: Partial<NewClientSite>,
    updatedBy: string,
  ): Promise<void> {
    await this.repository.updateSite(clientId, siteId, changes, updatedBy);
  }

  async deleteSite(clientId: string, siteId: string): Promise<void> {
    await this.repository.deleteSite(clientId, siteId);
  }
}
