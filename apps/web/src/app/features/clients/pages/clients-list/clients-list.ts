import { Component, computed, inject, signal } from '@angular/core';
import { ClientsFacade } from '../../facades/clients.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { Modal } from '../../../../shared/components/modal/modal';
import { ClientFormModal } from '../../components/client-form-modal/client-form-modal';
import { ClientDetailModal } from '../../components/client-detail-modal/client-detail-modal';
import { CLIENT_TAG_CONFIG, CLIENT_TAG_KEYS } from '../../models/client.model';
import type { Client, ClientTagKey } from '../../models/client.model';

type StatusFilter = 'all' | 'ACTIVE' | 'INACTIVE';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-clients-list',
  imports: [Card, Button, StatusBadge, Icon, Modal, ClientFormModal, ClientDetailModal],
  templateUrl: './clients-list.html',
  styleUrl: './clients-list.scss',
})
export class ClientsList {
  protected readonly clientsFacade = inject(ClientsFacade);
  private readonly authFacade = inject(AuthFacade);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly visibleCount = signal(PAGE_SIZE);

  protected readonly formOpen = signal(false);
  protected readonly editingClient = signal<Client | null>(null);
  protected readonly detailClient = signal<Client | null>(null);
  protected readonly openTagPickerId = signal<string | null>(null);
  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly deletingIds = signal<string[] | null>(null);
  protected readonly deleting = signal(false);

  protected readonly tagConfig = CLIENT_TAG_CONFIG;
  protected readonly tagKeys = CLIENT_TAG_KEYS;

  protected readonly canDelete = computed(() => this.authFacade.currentRole() === 'ADMIN');

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

  /** Paginación "cargar más": solo recorta la lista ya filtrada, sin volver
   *  a consultar Firestore — toda la colección ya vive en el Store. */
  protected readonly visibleClients = computed(() => this.filtered().slice(0, this.visibleCount()));
  protected readonly hasMore = computed(() => this.visibleCount() < this.filtered().length);
  protected readonly hasCollapsed = computed(() => this.visibleCount() > PAGE_SIZE);
  protected readonly nextBatchSize = computed(() =>
    Math.min(PAGE_SIZE, this.filtered().length - this.visibleCount()),
  );

  protected readonly selectedCount = computed(() => this.selectedIds().size);
  protected readonly allVisibleSelected = computed(() => {
    const visible = this.visibleClients();
    return visible.length > 0 && visible.every((client) => this.selectedIds().has(client.id));
  });

  constructor() {
    this.clientsFacade.init();
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected showMore(): void {
    this.visibleCount.update((count) => count + PAGE_SIZE);
  }

  protected showAll(): void {
    this.visibleCount.set(this.filtered().length);
  }

  protected showLess(): void {
    this.visibleCount.set(PAGE_SIZE);
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

  protected isSelected(clientId: string): boolean {
    return this.selectedIds().has(clientId);
  }

  protected toggleSelect(clientId: string, event: Event): void {
    event.stopPropagation();
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  protected toggleSelectAll(): void {
    const visible = this.visibleClients();
    this.selectedIds.set(this.allVisibleSelected() ? new Set() : new Set(visible.map((client) => client.id)));
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected confirmDelete(client: Client, event: Event): void {
    event.stopPropagation();
    this.deletingIds.set([client.id]);
  }

  protected confirmBulkDelete(): void {
    this.deletingIds.set(Array.from(this.selectedIds()));
  }

  protected cancelDelete(): void {
    this.deletingIds.set(null);
  }

  protected async deleteConfirmed(): Promise<void> {
    const ids = this.deletingIds();
    if (!ids) {
      return;
    }
    this.deleting.set(true);
    try {
      await Promise.all(ids.map((id) => this.clientsFacade.deleteClient(id)));
      this.deletingIds.set(null);
      this.clearSelection();
    } finally {
      this.deleting.set(false);
    }
  }
}
