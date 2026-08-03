import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ClientsQuery } from '../state/clients.query';
import { ClientsService } from '../state/clients.service';
import { AuthFacade } from '../../auth/facades/auth.facade';
import type {
  Client,
  ClientContact,
  ClientTagKey,
  NewClient,
  NewClientContact,
} from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientsFacade {
  private readonly query = inject(ClientsQuery);
  private readonly service = inject(ClientsService);
  private readonly authFacade = inject(AuthFacade);

  readonly clients = toSignal(this.query.clients$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });
  readonly error = toSignal(this.query.error$, { initialValue: null });

  readonly activeCount = computed(
    () => this.clients().filter((client) => client.status === 'ACTIVE').length,
  );

  init(): void {
    this.service.watchClients();
  }

  async addClient(data: NewClient): Promise<string> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    return this.service.addClient(data, userId);
  }

  async updateClient(id: string, changes: Partial<NewClient>): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.updateClient(id, changes, userId);
  }

  async deleteClient(id: string): Promise<void> {
    await this.service.deleteClient(id);
  }

  async setTag(id: string, tag: ClientTagKey, enabled: boolean): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.setTag(id, tag, enabled, userId);
  }

  watchContacts(clientId: string): Observable<ClientContact[]> {
    return this.service.watchContacts(clientId);
  }

  async addContact(clientId: string, contact: NewClientContact): Promise<void> {
    await this.service.addContact(clientId, contact);
  }

  byId(id: string): Client | undefined {
    return this.clients().find((client) => client.id === id);
  }
}
