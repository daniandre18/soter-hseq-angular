import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import {
  FormField,
  applyWhen,
  disabled,
  email,
  form,
  required,
  submit,
} from '@angular/forms/signals';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { AppUser } from '../../../../core/models/app-user.model';
import { Button } from '../../../../shared/components/button/button';
import { Modal } from '../../../../shared/components/modal/modal';
import { ToastService } from '../../../../shared/services/toast.service';
import type { InternalUserRole } from '../../domain/user-management.gateway';
import { InternalUsersFacade } from '../../facades/internal-users.facade';
import { INTERNAL_USER_ROLES } from '../../models/internal-user.model';

interface InternalUserFormModel {
  displayName: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: InternalUserRole;
}

const EMPTY_MODEL: InternalUserFormModel = {
  displayName: '',
  email: '',
  phone: '',
  jobTitle: '',
  role: 'COORDINATOR',
};

@Component({
  selector: 'app-internal-user-form-modal',
  imports: [Modal, Button, FormField, TranslocoPipe],
  providers: [...provideTranslocoScope('users')],
  templateUrl: './internal-user-form-modal.html',
  styleUrl: './internal-user-form-modal.scss',
})
export class InternalUserFormModal {
  private readonly usersFacade = inject(InternalUsersFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly open = input(false);
  readonly editingUser = input<AppUser | null>(null);
  readonly currentUserId = input<string | null>(null);
  readonly closeRequested = output<void>();

  protected readonly roles = INTERNAL_USER_ROLES;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly model = signal<InternalUserFormModel>({ ...EMPTY_MODEL });
  protected readonly title = computed(() =>
    this.editingUser() ? 'users.internal.form.editTitle' : 'users.internal.form.createTitle',
  );

  protected readonly userForm = form(this.model, (path) => {
    required(path.displayName, { message: 'users.internal.validation.nameRequired' });
    required(path.jobTitle, { message: 'users.internal.validation.jobTitleRequired' });
    required(path.role, { message: 'users.internal.validation.roleRequired' });
    applyWhen(
      path,
      () => !this.editingUser(),
      (createPath) => {
        required(createPath.email, { message: 'users.internal.validation.emailRequired' });
        email(createPath.email, { message: 'users.internal.validation.emailInvalid' });
      },
    );
    disabled(path.email, { when: () => !!this.editingUser() });
    disabled(path.role, { when: () => this.editingUser()?.id === this.currentUserId() });
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const user = this.editingUser();
      this.errorMessage.set(null);
      this.model.set(
        user
          ? {
              displayName: user.displayName,
              email: user.email,
              phone: user.phone ?? '',
              jobTitle: user.jobTitle ?? '',
              role: user.role as InternalUserRole,
            }
          : { ...EMPTY_MODEL },
      );
    });
  }

  protected close(): void {
    if (!this.saving()) this.closeRequested.emit();
  }

  protected roleKey(role: InternalUserRole): string {
    return `roles.${role}`;
  }

  protected onSubmit(): void {
    submit(this.userForm, async () => {
      this.saving.set(true);
      this.errorMessage.set(null);
      const value = this.model();
      try {
        const editing = this.editingUser();
        if (editing) {
          await this.usersFacade.updateUser(editing.id, {
            displayName: value.displayName.trim(),
            phone: value.phone.trim() || undefined,
            jobTitle: value.jobTitle.trim() || undefined,
            role: value.role,
          });
          this.toast.success(this.transloco.translate('users.internal.messages.updated'));
        } else {
          const result = await this.usersFacade.inviteUser({
            displayName: value.displayName.trim(),
            email: value.email.trim().toLowerCase(),
            phone: value.phone.trim() || undefined,
            jobTitle: value.jobTitle.trim() || undefined,
            role: value.role,
          });
          const messageKey = result.invitationSent
            ? 'users.internal.messages.invited'
            : 'users.internal.messages.createdWithoutEmail';
          if (result.invitationSent) {
            this.toast.success(this.transloco.translate(messageKey));
          } else {
            this.toast.info(this.transloco.translate(messageKey));
          }
        }
        this.closeRequested.emit();
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : this.transloco.translate('users.internal.messages.saveError');
        this.errorMessage.set(message);
        this.toast.error(message);
      } finally {
        this.saving.set(false);
      }
    });
  }
}
