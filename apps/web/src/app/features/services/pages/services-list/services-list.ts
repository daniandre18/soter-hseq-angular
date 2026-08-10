import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServicesFacade } from '../../facades/services.facade';
import { ServiceCategoriesFacade } from '../../facades/service-categories.facade';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Modal } from '../../../../shared/components/modal/modal';
import { Icon } from '../../../../shared/components/icon/icon';
import { ServiceFormModal } from '../../components/service-form-modal/service-form-modal';
import { LocalizedCurrencyPipe } from '../../../../shared/pipes/localized-currency.pipe';
import type { Service } from '../../models/service.model';
import {
  RowActionsMenu,
  type RowMenuAction,
  type RowMenuActionSelection,
} from '../../../../shared/components/row-actions-menu/row-actions-menu';
import { releaseOnDestroy } from '../../../../shared/utils/release-on-destroy';

const PAGE_SIZE = 10;
const SERVICE_ROW_ACTIONS: readonly RowMenuAction[] = [
  { id: 'edit', icon: 'square-pen', label: 'Editar servicio' },
  { id: 'delete', icon: 'trash-2', label: 'Eliminar', tone: 'danger' },
];

@Component({
  selector: 'app-services-list',
  imports: [
    RouterLink,
    Card,
    Button,
    StatusBadge,
    Modal,
    Icon,
    ServiceFormModal,
    LocalizedCurrencyPipe,
    RowActionsMenu,
  ],
  templateUrl: './services-list.html',
  styleUrl: './services-list.scss',
})
export class ServicesList {
  protected readonly servicesFacade = inject(ServicesFacade);
  protected readonly categoriesFacade = inject(ServiceCategoriesFacade);

  protected readonly search = signal('');
  protected readonly categoryFilter = signal<string>('all');
  protected readonly visibleCount = signal(PAGE_SIZE);

  protected readonly formOpen = signal(false);
  protected readonly editingService = signal<Service | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly openActionsId = signal<string | null>(null);
  protected readonly rowActions = SERVICE_ROW_ACTIONS;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const category = this.categoryFilter();
    return this.servicesFacade.services().filter((service) => {
      const matchesSearch = !term || service.name.toLowerCase().includes(term);
      const matchesCategory = category === 'all' || service.category === category;
      return matchesSearch && matchesCategory;
    });
  });

  protected readonly visibleServices = computed(() =>
    this.filtered().slice(0, this.visibleCount()),
  );
  protected readonly hasActiveFilters = computed(
    () => this.search().trim().length > 0 || this.categoryFilter() !== 'all',
  );
  protected readonly activeFilterCount = computed(
    () => Number(this.search().trim().length > 0) + Number(this.categoryFilter() !== 'all'),
  );
  protected readonly hasMore = computed(() => this.visibleCount() < this.filtered().length);
  protected readonly hasCollapsed = computed(() => this.visibleCount() > PAGE_SIZE);
  protected readonly nextBatchSize = computed(() =>
    Math.min(PAGE_SIZE, this.filtered().length - this.visibleCount()),
  );

  constructor() {
    releaseOnDestroy(this.servicesFacade.init());
    releaseOnDestroy(this.categoriesFacade.init());
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected onCategoryChange(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.categoryFilter.set('all');
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
    this.editingService.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(service: Service): void {
    this.openActionsId.set(null);
    this.editingService.set(service);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingService.set(null);
  }

  protected confirmDelete(service: Service, event: Event): void {
    event.stopPropagation();
    this.openActionsId.set(null);
    this.deletingId.set(service.id);
  }

  protected toggleActions(serviceId: string, event: Event): void {
    event.stopPropagation();
    this.openActionsId.update((current) => (current === serviceId ? null : serviceId));
  }

  protected handleRowAction(selection: RowMenuActionSelection, service: Service): void {
    if (selection.id === 'edit') {
      this.openEdit(service);
    } else if (selection.id === 'delete') {
      this.confirmDelete(service, selection.event);
    }
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  protected closeActions(): void {
    this.openActionsId.set(null);
  }

  protected cancelDelete(): void {
    this.deletingId.set(null);
  }

  protected async deleteConfirmed(): Promise<void> {
    const id = this.deletingId();
    if (!id) {
      return;
    }
    await this.servicesFacade.deleteService(id);
    this.deletingId.set(null);
  }
}
