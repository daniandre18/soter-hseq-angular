import { Component, computed, inject, signal } from '@angular/core';
import { ClientsFacade } from '../../facades/clients.facade';
import { ClientTagsFacade } from '../../facades/client-tags.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { Modal } from '../../../../shared/components/modal/modal';
import { ClientFormModal } from '../../components/client-form-modal/client-form-modal';
import { ClientDetailModal } from '../../components/client-detail-modal/client-detail-modal';
import { ClientTagsManagerModal } from '../../components/client-tags-manager-modal/client-tags-manager-modal';
import { CLIENT_TAG_COLOR_PALETTE } from '../../models/client-tag.model';
import type { Client } from '../../models/client.model';

type StatusFilter = 'all' | 'ACTIVE' | 'INACTIVE';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-clients-list',
  imports: [
    Card,
    Button,
    StatusBadge,
    Icon,
    Modal,
    ClientFormModal,
    ClientDetailModal,
    ClientTagsManagerModal,
  ],
  templateUrl: './clients-list.html',
  styleUrl: './clients-list.scss',
})
export class ClientsList {
  protected readonly clientsFacade = inject(ClientsFacade);
  protected readonly tagsFacade = inject(ClientTagsFacade);
  private readonly authFacade = inject(AuthFacade);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly visibleCount = signal(PAGE_SIZE);

  protected readonly formOpen = signal(false);
  protected readonly editingClient = signal<Client | null>(null);
  protected readonly detailClient = signal<Client | null>(null);
  protected readonly openTagPickerId = signal<string | null>(null);
  protected readonly tagSearch = signal('');
  protected readonly creatingTag = signal(false);
  protected readonly managerOpen = signal(false);
  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly deletingIds = signal<string[] | null>(null);
  protected readonly deleting = signal(false);

  protected readonly canDelete = computed(() => this.authFacade.currentRole() === 'ADMIN');

  /** Etiquetas del catálogo que coinciden con el texto de búsqueda del
   *  picker abierto — vacío el texto, muestra todas. */
  protected readonly filteredTags = computed(() => {
    const term = this.tagSearch().trim().toLowerCase();
    return this.tagsFacade.tags().filter((tag) => !term || tag.label.toLowerCase().includes(term));
  });

  /** Solo se ofrece "crear" cuando el texto no coincide con ninguna
   *  etiqueta existente (evita duplicados con el mismo nombre). */
  protected readonly canCreateTagFromSearch = computed(() => {
    const term = this.tagSearch().trim();
    if (!term) {
      return false;
    }
    return !this.tagsFacade.tags().some((tag) => tag.label.toLowerCase() === term.toLowerCase());
  });

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
    this.tagsFacade.init();
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
    this.tagSearch.set('');
    this.openTagPickerId.update((current) => (current === clientId ? null : clientId));
  }

  protected closeTagPicker(event: Event): void {
    event.stopPropagation();
    this.openTagPickerId.set(null);
  }

  protected onTagSearchInput(event: Event): void {
    this.tagSearch.set((event.target as HTMLInputElement).value);
  }

  protected hasTag(client: Client, tagId: string): boolean {
    return client.tags.includes(tagId);
  }

  protected async toggleTag(client: Client, tagId: string, event: Event): Promise<void> {
    event.stopPropagation();
    await this.clientsFacade.setTag(client.id, tagId, !this.hasTag(client, tagId));
  }

  /** "Buscar o crear etiqueta": si el texto no matchea ninguna existente,
   *  crea una nueva (color siguiente de la paleta, cíclico) y la aplica al
   *  cliente en el mismo paso. */
  protected async createAndApplyTag(client: Client, event: Event): Promise<void> {
    event.stopPropagation();
    const label = this.tagSearch().trim();
    if (!label || !this.canCreateTagFromSearch()) {
      return;
    }
    const color = CLIENT_TAG_COLOR_PALETTE[this.tagsFacade.tags().length % CLIENT_TAG_COLOR_PALETTE.length];
    const newTagId = await this.tagsFacade.addTag({ label, color });
    await this.clientsFacade.setTag(client.id, newTagId, true);
    this.tagSearch.set('');
  }

  protected openManager(event: Event): void {
    event.stopPropagation();
    this.openTagPickerId.set(null);
    this.managerOpen.set(true);
  }

  protected closeManager(): void {
    this.managerOpen.set(false);
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
