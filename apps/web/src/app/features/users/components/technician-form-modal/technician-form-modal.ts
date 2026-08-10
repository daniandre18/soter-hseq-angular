import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormField, applyWhen, email, form, minLength, required, submit } from '@angular/forms/signals';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { TechniciansFacade } from '../../facades/technicians.facade';
import type { AppUser } from '../../../../core/models/app-user.model';
import { ToastService } from '../../../../shared/services/toast.service';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';

interface TechnicianFormModel {
  displayName: string;
  email: string;
  password: string;
  phone: string;
  specialty: string;
}

const EMPTY_MODEL: TechnicianFormModel = {
  displayName: '',
  email: '',
  password: '',
  phone: '',
  specialty: '',
};

@Component({
  selector: 'app-technician-form-modal',
  imports: [Modal, Button, FormField, TranslocoPipe],
  providers: [...provideTranslocoScope('users')],
  templateUrl: './technician-form-modal.html',
  styleUrl: './technician-form-modal.scss',
})
export class TechnicianFormModal {
  private readonly techniciansFacade = inject(TechniciansFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly open = input(false);
  readonly editingTechnician = input<AppUser | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly model = signal<TechnicianFormModel>({ ...EMPTY_MODEL });

  protected readonly title = computed(() =>
    this.editingTechnician() ? 'users.form.editTitle' : 'users.form.createTitle',
  );

  // El email y la contraseña solo se piden al crear — editarlos requeriría
  // tocar la cuenta de Firebase Auth, fuera del alcance de este formulario.
  // `applyWhen` (no un `if` normal aquí adentro) porque este mismo
  // componente se reutiliza para crear Y editar sin recrearse — un `if`
  // evaluado una sola vez al construir el schema quedaría fijo en lo que
  // valía `editingTechnician()` la primera vez, ver mismo patrón de bug ya
  // evitado en otros formularios de este proyecto.
  protected readonly technicianForm = form(this.model, (schemaPath) => {
    required(schemaPath.displayName, { message: 'users.form.validation.nameRequired' });
    applyWhen(
      schemaPath,
      () => !this.editingTechnician(),
      (createPath) => {
        required(createPath.email, { message: 'users.form.validation.emailRequired' });
        email(createPath.email, { message: 'users.form.validation.emailInvalid' });
        required(createPath.password, { message: 'users.form.validation.passwordRequired' });
        minLength(createPath.password, 6, { message: 'users.form.validation.passwordMin' });
      },
    );
  });

  constructor() {
    effect(() => {
      const technician = this.editingTechnician();
      if (!this.open()) {
        return;
      }
      this.errorMessage.set(null);
      this.model.set(
        technician
          ? {
              displayName: technician.displayName,
              email: technician.email,
              password: '',
              phone: technician.phone ?? '',
              specialty: technician.specialty ?? '',
            }
          : { ...EMPTY_MODEL },
      );
    });
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected onSubmit(): void {
    submit(this.technicianForm, async () => {
      const value = this.model();
      this.saving.set(true);
      this.errorMessage.set(null);
      try {
        const editing = this.editingTechnician();
        if (editing) {
          await this.techniciansFacade.updateTechnician(editing.id, {
            displayName: value.displayName,
            phone: value.phone || undefined,
            specialty: value.specialty || undefined,
          });
          this.toast.success(this.transloco.translate('users.form.updated'));
        } else {
          await this.techniciansFacade.createTechnician({
            displayName: value.displayName,
            email: value.email,
            password: value.password,
            phone: value.phone || undefined,
            specialty: value.specialty || undefined,
          });
          this.toast.success(this.transloco.translate('users.form.created'));
        }
        this.close();
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : this.transloco.translate('users.form.saveError');
        this.errorMessage.set(message);
        this.toast.error(message);
      } finally {
        this.saving.set(false);
      }
    });
  }
}
