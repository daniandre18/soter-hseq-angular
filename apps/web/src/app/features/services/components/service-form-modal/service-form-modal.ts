import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormField, form, min, required, submit } from '@angular/forms/signals';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { ServicesFacade } from '../../facades/services.facade';
import { ServiceCategoriesFacade } from '../../facades/service-categories.facade';
import type { Service } from '../../models/service.model';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';

// `status` como string-union (no `active: boolean`) a propósito: un
// `<select>` nativo siempre emite string, y Signal Forms no coerciona el
// valor al tipo del modelo — un campo `boolean` terminaría guardando el
// string "false" (verdadero en JS), rompiendo el filtro `activeServices`.
// Mismo patrón ya usado en `ClientFormModel.status`.
interface ServiceFormModel {
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const EMPTY_MODEL: ServiceFormModel = {
  name: '',
  description: '',
  category: '',
  price: 0,
  unit: 'visita',
  status: 'ACTIVE',
};

@Component({
  selector: 'app-service-form-modal',
  imports: [Modal, Button, FormField, TranslocoPipe],
  providers: [...provideTranslocoScope('services')],
  templateUrl: './service-form-modal.html',
  styleUrl: './service-form-modal.scss',
})
export class ServiceFormModal {
  private readonly servicesFacade = inject(ServicesFacade);
  private readonly categoriesFacade = inject(ServiceCategoriesFacade);
  private readonly transloco = inject(TranslocoService);

  readonly open = input(false);
  readonly editingService = input<Service | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly model = signal<ServiceFormModel>({ ...EMPTY_MODEL });

  protected readonly categories = this.categoriesFacade.categories;

  protected readonly serviceForm = form(this.model, (schemaPath) => {
    required(schemaPath.name, { message: 'services.form.validation.nameRequired' });
    required(schemaPath.category, { message: 'services.form.validation.categoryRequired' });
    required(schemaPath.unit, { message: 'services.form.validation.unitRequired' });
    min(schemaPath.price, 0, { message: 'services.form.validation.priceMin' });
  });

  protected readonly title = computed(() =>
    this.editingService() ? 'services.form.editTitle' : 'services.form.createTitle',
  );

  constructor() {
    this.categoriesFacade.init();
    effect(() => {
      const service = this.editingService();
      if (!this.open()) {
        return;
      }
      this.saveError.set(null);
      this.model.set(
        service
          ? {
              name: service.name,
              description: service.description ?? '',
              category: service.category,
              price: service.price,
              unit: service.unit,
              status: service.active ? 'ACTIVE' : 'INACTIVE',
            }
          : { ...EMPTY_MODEL },
      );
    });
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected onSubmit(): void {
    submit(this.serviceForm, async () => {
      this.saveError.set(null);
      this.saving.set(true);
      try {
        const value = this.model();
        const data = {
          name: value.name,
          description: value.description || undefined,
          category: value.category,
          price: value.price,
          unit: value.unit,
          active: value.status === 'ACTIVE',
        };
        const editing = this.editingService();
        if (editing) {
          await this.servicesFacade.updateService(editing.id, data);
        } else {
          await this.servicesFacade.addService(data);
        }
        this.close();
      } catch (error) {
        this.saveError.set(
          error instanceof Error ? error.message : this.transloco.translate('services.form.saveError'),
        );
      } finally {
        this.saving.set(false);
      }
    });
  }
}
