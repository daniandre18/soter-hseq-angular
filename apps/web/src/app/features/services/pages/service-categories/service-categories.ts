import { Component, computed, inject, signal } from '@angular/core';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { Icon } from '../../../../shared/components/icon/icon';
import { ServiceCategoriesFacade } from '../../facades/service-categories.facade';
import { ServicesFacade } from '../../facades/services.facade';
import {
  SERVICE_CATEGORY_COLOR_PALETTE,
  SERVICE_CATEGORY_ICON_OPTIONS,
  type ServiceCategory,
} from '../../models/service-category.model';

@Component({
  selector: 'app-service-categories',
  imports: [Button, Card, Icon],
  templateUrl: './service-categories.html',
  styleUrls: [
    './service-categories.scss',
    '../../components/service-categories-manager-modal/service-categories-manager-modal.scss',
  ],
})
export class ServiceCategories {
  private readonly categoriesFacade = inject(ServiceCategoriesFacade);
  private readonly servicesFacade = inject(ServicesFacade);

  protected readonly categories = this.categoriesFacade.categories;
  protected readonly loading = this.categoriesFacade.loading;
  protected readonly palette = SERVICE_CATEGORY_COLOR_PALETTE;
  protected readonly iconOptions = SERVICE_CATEGORY_ICON_OPTIONS;

  protected readonly creating = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly newLabel = signal('');
  protected readonly selectedColor = signal(SERVICE_CATEGORY_COLOR_PALETTE[0]);
  protected readonly selectedIcon = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly serviceCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const service of this.servicesFacade.services()) {
      counts.set(service.category, (counts.get(service.category) ?? 0) + 1);
    }
    return counts;
  });

  constructor() {
    this.categoriesFacade.init();
    this.servicesFacade.init();
  }

  protected openCreateForm(): void {
    this.editingId.set(null);
    this.newLabel.set('');
    this.selectedColor.set(SERVICE_CATEGORY_COLOR_PALETTE[0]);
    this.selectedIcon.set(null);
    this.saveError.set(null);
    this.creating.set(true);
  }

  protected openEditForm(category: ServiceCategory): void {
    this.editingId.set(category.id);
    this.newLabel.set(category.label);
    this.selectedColor.set(category.color);
    this.selectedIcon.set(category.icon ?? null);
    this.saveError.set(null);
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
    this.editingId.set(null);
  }

  protected selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  protected selectIcon(icon: string): void {
    this.selectedIcon.set(this.selectedIcon() === icon ? null : icon);
  }

  protected async saveCategory(): Promise<void> {
    const label = this.newLabel().trim();
    if (!label) return;

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const data = {
        label,
        color: this.selectedColor(),
        icon: this.selectedIcon() ?? undefined,
      };
      const editingId = this.editingId();
      if (editingId) {
        await this.categoriesFacade.updateCategory(editingId, data);
      } else {
        await this.categoriesFacade.addCategory(data);
      }
      this.creating.set(false);
      this.editingId.set(null);
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : 'No fue posible guardar la categoría.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteCategory(id: string): Promise<void> {
    this.deletingId.set(id);
    try {
      await this.categoriesFacade.deleteCategory(id);
    } finally {
      this.deletingId.set(null);
    }
  }

  protected serviceCount(categoryId: string): number {
    return this.serviceCounts().get(categoryId) ?? 0;
  }

  protected catalogPercentage(categoryId: string): number {
    const total = this.servicesFacade.services().length;
    return total === 0 ? 0 : Math.round((this.serviceCount(categoryId) / total) * 100);
  }
}
