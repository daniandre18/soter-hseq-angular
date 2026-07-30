import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormField, form, min, required, submit } from '@angular/forms/signals';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { ServicesFacade } from '../../facades/services.facade';
import { SERVICE_CATEGORY_KEYS, SERVICE_CATEGORY_LABELS } from '../../models/service.model';
import type { Service, ServiceCategory } from '../../models/service.model';

// `status` como string-union (no `active: boolean`) a propósito: un
// `<select>` nativo siempre emite string, y Signal Forms no coerciona el
// valor al tipo del modelo — un campo `boolean` terminaría guardando el
// string "false" (verdadero en JS), rompiendo el filtro `activeServices`.
// Mismo patrón ya usado en `ClientFormModel.status`.
interface ServiceFormModel {
  name: string;
  description: string;
  category: ServiceCategory;
  price: number;
  unit: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const EMPTY_MODEL: ServiceFormModel = {
  name: '',
  description: '',
  category: 'SEGURIDAD',
  price: 0,
  unit: 'visita',
  status: 'ACTIVE',
};

@Component({
  selector: 'app-service-form-modal',
  imports: [Modal, Button, FormField],
  templateUrl: './service-form-modal.html',
  styleUrl: './service-form-modal.scss',
})
export class ServiceFormModal {
  private readonly servicesFacade = inject(ServicesFacade);

  readonly open = input(false);
  readonly editingService = input<Service | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly model = signal<ServiceFormModel>({ ...EMPTY_MODEL });

  protected readonly categoryLabels = SERVICE_CATEGORY_LABELS;
  protected readonly categoryKeys = SERVICE_CATEGORY_KEYS;

  protected readonly serviceForm = form(this.model, (schemaPath) => {
    required(schemaPath.name, { message: 'El nombre del servicio es obligatorio.' });
    required(schemaPath.unit, { message: 'Indica la unidad de cobro.' });
    min(schemaPath.price, 0, { message: 'El precio no puede ser negativo.' });
  });

  protected readonly title = computed(() =>
    this.editingService() ? 'Editar Servicio' : 'Nuevo Servicio',
  );

  constructor() {
    effect(() => {
      const service = this.editingService();
      if (!this.open()) {
        return;
      }
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
      } finally {
        this.saving.set(false);
      }
    });
  }
}
