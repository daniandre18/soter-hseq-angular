import { Component, computed, inject, input, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { ToastService } from '../../../../shared/services/toast.service';
import { ClientPortalAccessFacade } from '../../facades/client-portal-access-facade';
import type { Client } from '../../models/client.model';

interface PortalUserFormModel {
  displayName: string;
  email: string;
  phone: string;
}

const EMPTY_MODEL: PortalUserFormModel = {
  displayName: '',
  email: '',
  phone: '',
};

@Component({
  selector: 'app-client-portal-access',
  imports: [Button, FormField, Icon, TranslocoPipe],
  providers: [...provideTranslocoScope('clients')],
  templateUrl: './client-portal-access.html',
  styleUrl: './client-portal-access.scss',
})
export class ClientPortalAccess {
  private readonly facade = inject(ClientPortalAccessFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly client = input.required<Client>();

  protected readonly mode = signal<'invite' | 'replace' | null>(null);
  protected readonly saving = signal(false);
  protected readonly sendingEmail = signal(false);
  protected readonly changingStatus = signal(false);
  protected readonly confirmingDeactivation = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly model = signal<PortalUserFormModel>({ ...EMPTY_MODEL });
  protected readonly form = form(this.model, (path) => {
    required(path.displayName, { message: 'clients.portal.validation.nameRequired' });
    required(path.email, { message: 'clients.portal.validation.emailRequired' });
    email(path.email, { message: 'clients.portal.validation.emailInvalid' });
  });

  protected readonly currentUser = computed(() => {
    const client = this.client();
    const linkedUsers = this.facade.users().filter((user) => user.clientId === client.id);
    return (
      linkedUsers.find((user) => user.id === client.portalUserId) ??
      linkedUsers.find((user) => user.status === 'ACTIVE') ??
      linkedUsers.at(0) ??
      null
    );
  });

  protected openInvite(): void {
    this.openForm('invite');
  }

  protected openReplacement(): void {
    this.confirmingDeactivation.set(false);
    this.openForm('replace');
  }

  protected requestDeactivation(): void {
    this.errorMessage.set(null);
    this.confirmingDeactivation.set(true);
  }

  protected cancelDeactivation(): void {
    if (!this.changingStatus()) {
      this.confirmingDeactivation.set(false);
    }
  }

  protected async setStatus(status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
    const user = this.currentUser();
    if (!user || this.changingStatus()) return;

    this.changingStatus.set(true);
    this.errorMessage.set(null);
    try {
      await this.facade.setStatus(this.client().id, user.id, status);
      this.confirmingDeactivation.set(false);
      this.toast.success(
        this.transloco.translate(
          status === 'ACTIVE'
            ? 'clients.portal.messages.activated'
            : 'clients.portal.messages.deactivated',
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : this.transloco.translate('clients.portal.messages.statusError');
      this.errorMessage.set(message);
      this.toast.error(message);
    } finally {
      this.changingStatus.set(false);
    }
  }

  protected cancel(): void {
    if (this.saving()) return;
    this.mode.set(null);
    this.confirmingDeactivation.set(false);
    this.errorMessage.set(null);
    this.form().reset({ ...EMPTY_MODEL });
  }

  protected submitAccess(): void {
    submit(this.form, async () => {
      const client = this.client();
      const value = this.model();
      const accessData = {
        clientId: client.id,
        displayName: value.displayName.trim(),
        email: value.email.trim().toLowerCase(),
        phone: value.phone.trim() || undefined,
      };

      this.saving.set(true);
      this.errorMessage.set(null);
      try {
        const currentUser = this.currentUser();
        const result =
          this.mode() === 'replace' && currentUser
            ? await this.facade.replaceUser({ ...accessData, currentUid: currentUser.id })
            : await this.facade.inviteUser(accessData);
        const messageKey = result.invitationSent
          ? 'clients.portal.messages.invited'
          : 'clients.portal.messages.createdWithoutEmail';
        if (result.invitationSent) {
          this.toast.success(this.transloco.translate(messageKey));
        } else {
          this.toast.info(this.transloco.translate(messageKey));
        }
        this.mode.set(null);
        this.form().reset({ ...EMPTY_MODEL });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : this.transloco.translate('clients.portal.messages.saveError');
        this.errorMessage.set(message);
        this.toast.error(message);
      } finally {
        this.saving.set(false);
      }
    });
  }

  protected async resendInvitation(): Promise<void> {
    const user = this.currentUser();
    if (!user || this.sendingEmail()) return;

    this.sendingEmail.set(true);
    this.errorMessage.set(null);
    try {
      await this.facade.sendAccessEmail(user.email);
      this.toast.success(this.transloco.translate('clients.portal.messages.resent'));
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : this.transloco.translate('clients.portal.messages.emailError');
      this.errorMessage.set(message);
      this.toast.error(message);
    } finally {
      this.sendingEmail.set(false);
    }
  }

  private openForm(mode: 'invite' | 'replace'): void {
    this.errorMessage.set(null);
    this.form().reset({ ...EMPTY_MODEL });
    this.mode.set(mode);
  }
}
