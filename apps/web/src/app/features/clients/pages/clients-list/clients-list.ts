import { Component, computed, inject, signal } from '@angular/core';
import { ClientsFacade } from '../../facades/clients.facade';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { ClientFormModal } from '../../components/client-form-modal/client-form-modal';
import { ClientDetailModal } from '../../components/client-detail-modal/client-detail-modal';
import { CLIENT_TAG_CONFIG, CLIENT_TAG_KEYS } from '../../models/client.model';
import type { Client, ClientTagKey } from '../../models/client.model';

type StatusFilter = 'all' | 'ACTIVE' | 'INACTIVE';

@Component({
  selector: 'app-clients-list',
  imports: [Card, Button, StatusBadge, Icon, ClientFormModal, ClientDetailModal],
  templateUrl: './clients-list.html',
  styleUrl: './clients-list.scss',
})
export class ClientsList {
  protected readonly clientsFacade = inject(ClientsFacade);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');

  protected readonly formOpen = signal(false);
  protected readonly editingClient = signal<Client | null>(null);
  protected readonly detailClient = signal<Client | null>(null);
  protected readonly openTagPickerId = signal<string | null>(null);

  protected readonly tagConfig = CLIENT_TAG_CONFIG;
  protected readonly tagKeys = CLIENT_TAG_KEYS;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.clientsFacade.clients().filter((client) => {
      const matchesSearch =
        !term ||
        client.businessName.toLowerCase().includes(term) ||
        client.taxId.includes(term) ||
        (client.city ?? '').toLowerCase().includes(term);
      const matchesStatus = status === 'all' || client.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  protected readonly activeInFiltered = computed(
    () => this.filtered().filter((client) => client.status === 'ACTIVE').length,
  );
  protected readonly inactiveInFiltered = computed(
    () => this.filtered().filter((client) => client.status === 'INACTIVE').length,
  );

  constructor() {
    this.clientsFacade.init();
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  protected openCreate(): void {
    this.editingClient.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(client: Client, event: Event): void {
    event.stopPropagation();
    this.editingClient.set(client);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingClient.set(null);
  }

  protected openDetail(client: Client): void {
    this.detailClient.set(client);
  }

  protected closeDetail(): void {
    this.detailClient.set(null);
  }

  protected toggleTagPicker(clientId: string, event: Event): void {
    event.stopPropagation();
    this.openTagPickerId.update((current) => (current === clientId ? null : clientId));
  }

  protected closeTagPicker(event: Event): void {
    event.stopPropagation();
    this.openTagPickerId.set(null);
  }

  protected hasTag(client: Client, tagKey: ClientTagKey): boolean {
    return client.tags.includes(tagKey);
  }

  protected async toggleTag(client: Client, tagKey: ClientTagKey, event: Event): Promise<void> {
    event.stopPropagation();
    await this.clientsFacade.setTag(client.id, tagKey, !this.hasTag(client, tagKey));
  }
}
