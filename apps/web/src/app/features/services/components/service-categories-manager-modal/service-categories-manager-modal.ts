import { Component, inject, input, output, signal } from '@angular/core';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { ServiceCategoriesFacade } from '../../facades/service-categories.facade';
import {
  SERVICE_CATEGORY_COLOR_PALETTE,
  SERVICE_CATEGORY_ICON_OPTIONS,
} from '../../models/service-category.model';

@Component({
  selector: 'app-service-categories-manager-modal',
  imports: [Modal, Button, Icon],
  templateUrl: './service-categories-manager-modal.html',
  styleUrl: './service-categories-manager-modal.scss',
})
export class ServiceCategoriesManagerModal {
  private readonly categoriesFacade = inject(ServiceCategoriesFacade);

  readonly open = input(false);
  readonly closeRequested = output<void>();

  protected readonly categories = this.categoriesFacade.categories;
  protected readonly palette = SERVICE_CATEGORY_COLOR_PALETTE;
  protected readonly iconOptions = SERVICE_CATEGORY_ICON_OPTIONS;

  protected readonly creating = signal(false);
  protected readonly newLabel = signal('');
  protected readonly selectedColor = signal(SERVICE_CATEGORY_COLOR_PALETTE[0]);
  protected readonly selectedIcon = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  protected close(): void {
    this.creating.set(false);
    this.closeRequested.emit();
  }

  protected openCreateForm(): void {
    this.newLabel.set('');
    this.selectedColor.set(SERVICE_CATEGORY_COLOR_PALETTE[0]);
    this.selectedIcon.set(null);
    this.saveError.set(null);
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
  }

  protected selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  protected selectIcon(icon: string): void {
    this.selectedIcon.set(this.selectedIcon() === icon ? null : icon);
  }

  protected async saveNewCategory(): Promise<void> {
    const label = this.newLabel().trim();
    if (!label) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.categoriesFacade.addCategory({
        label,
        color: this.selectedColor(),
        icon: this.selectedIcon() ?? undefined,
      });
      this.creating.set(false);
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
}
