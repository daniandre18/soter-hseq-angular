import { Component, computed, inject, signal } from '@angular/core';
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

const PAGE_SIZE = 10;

@Component({
  selector: 'app-services-list',
  imports: [RouterLink, Card, Button, StatusBadge, Modal, Icon, ServiceFormModal, LocalizedCurrencyPipe],
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
    this.servicesFacade.init();
    this.categoriesFacade.init();
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
    this.editingService.set(service);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingService.set(null);
  }

  protected confirmDelete(service: Service, event: Event): void {
    event.stopPropagation();
    this.deletingId.set(service.id);
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
