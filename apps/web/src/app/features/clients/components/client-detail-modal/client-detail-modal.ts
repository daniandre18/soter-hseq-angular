import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { of, switchMap } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { ClientsFacade } from '../../facades/clients.facade';
import { OrdersFacade } from '../../../orders/facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import type { Client, ClientSite, NewClientSite } from '../../models/client.model';

interface SiteFormModel {
  name: string;
  address: string;
  city: string;
  status: 'ACTIVE' | 'INACTIVE';
  responsibleName: string;
  responsiblePosition: string;
  responsibleEmail: string;
  responsiblePhone: string;
}

const EMPTY_SITE_MODEL: SiteFormModel = {
  name: '',
  address: '',
  city: '',
  status: 'ACTIVE',
  responsibleName: '',
  responsiblePosition: '',
  responsibleEmail: '',
  responsiblePhone: '',
};

@Component({
  selector: 'app-client-detail-modal',
  imports: [Modal, Button, Icon, StatusBadge, FormField],
  templateUrl: './client-detail-modal.html',
  styleUrl: './client-detail-modal.scss',
})
export class ClientDetailModal {
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly ordersFacade = inject(OrdersFacade);
  private readonly authFacade = inject(AuthFacade);

  readonly client = input<Client | null>(null);
  readonly closeRequested = output<void>();

  protected readonly contacts = toSignal(
    toObservable(this.client).pipe(
      switchMap((client) => (client ? this.clientsFacade.watchContacts(client.id) : of([]))),
    ),
    { initialValue: [] },
  );

  protected readonly sites = toSignal(
    toObservable(this.client).pipe(
      switchMap((client) => (client ? this.clientsFacade.watchSites(client.id) : of([]))),
    ),
    { initialValue: [] },
  );

  protected readonly canManageSites = computed(() => {
    const role = this.authFacade.currentRole();
    return role === 'ADMIN' || role === 'COMMERCIAL';
  });

  protected readonly siteEditorMode = signal<'create' | 'edit' | null>(null);
  protected readonly editingSite = signal<ClientSite | null>(null);
  protected readonly deletingSite = signal<ClientSite | null>(null);
  protected readonly savingSite = signal(false);
  protected readonly deletingSiteInProgress = signal(false);
  protected readonly siteActionError = signal<string | null>(null);
  protected readonly siteModel = signal<SiteFormModel>({ ...EMPTY_SITE_MODEL });

  protected readonly siteForm = form(this.siteModel, (schemaPath) => {
    required(schemaPath.name, { message: 'El nombre de la sede es obligatorio.' });
    required(schemaPath.address, { message: 'La dirección es obligatoria.' });
    required(schemaPath.city, { message: 'La ciudad es obligatoria.' });
    required(schemaPath.responsibleName, { message: 'El nombre del responsable es obligatorio.' });
    required(schemaPath.responsiblePhone, { message: 'El teléfono de contacto es obligatorio.' });
    email(schemaPath.responsibleEmail, { message: 'Ingresa un correo válido.' });
  });

  protected readonly siteEditorTitle = computed(() =>
    this.siteEditorMode() === 'edit' ? 'Editar sede' : 'Agregar sede',
  );

  protected readonly clientOrders = computed(() => {
    const client = this.client();
    if (!client) {
      return [];
    }
    return this.ordersFacade.orders().filter((order) => order.clientId === client.id);
  });

  protected openCreateSite(): void {
    this.editingSite.set(null);
    this.deletingSite.set(null);
    this.siteActionError.set(null);
    this.siteForm().reset({ ...EMPTY_SITE_MODEL });
    this.siteEditorMode.set('create');
  }

  protected openEditSite(site: ClientSite): void {
    this.editingSite.set(site);
    this.deletingSite.set(null);
    this.siteActionError.set(null);
    this.siteForm().reset({
      name: site.name,
      address: site.address,
      city: site.city,
      status: site.status,
      responsibleName: site.responsible.name,
      responsiblePosition: site.responsible.position ?? '',
      responsibleEmail: site.responsible.email ?? '',
      responsiblePhone: site.responsible.phone,
    });
    this.siteEditorMode.set('edit');
  }

  protected cancelSiteEditor(): void {
    this.siteEditorMode.set(null);
    this.editingSite.set(null);
    this.siteActionError.set(null);
    this.siteForm().reset({ ...EMPTY_SITE_MODEL });
  }

  protected saveSite(): void {
    submit(this.siteForm, async () => {
      const client = this.client();
      if (!client) {
        return;
      }

      this.savingSite.set(true);
      this.siteActionError.set(null);
      try {
        const model = this.siteModel();
        const responsible: NewClientSite['responsible'] = {
          name: model.responsibleName.trim(),
          phone: model.responsiblePhone.trim(),
        };
        const position = model.responsiblePosition.trim();
        const contactEmail = model.responsibleEmail.trim();
        if (position) {
          responsible.position = position;
        }
        if (contactEmail) {
          responsible.email = contactEmail;
        }

        const site: NewClientSite = {
          name: model.name.trim(),
          address: model.address.trim(),
          city: model.city.trim(),
          status: model.status,
          responsible,
        };

        const editingSite = this.editingSite();
        if (editingSite) {
          await this.clientsFacade.updateSite(client.id, editingSite.id, site);
        } else {
          await this.clientsFacade.addSite(client.id, site);
        }
        this.cancelSiteEditor();
      } catch (error) {
        this.siteActionError.set(
          error instanceof Error ? error.message : 'No fue posible guardar la sede.',
        );
      } finally {
        this.savingSite.set(false);
      }
    });
  }

  protected requestDeleteSite(site: ClientSite): void {
    this.cancelSiteEditor();
    this.deletingSite.set(site);
    this.siteActionError.set(null);
  }

  protected cancelDeleteSite(): void {
    this.deletingSite.set(null);
    this.siteActionError.set(null);
  }

  protected async confirmDeleteSite(): Promise<void> {
    const client = this.client();
    const site = this.deletingSite();
    if (!client || !site) {
      return;
    }

    this.deletingSiteInProgress.set(true);
    this.siteActionError.set(null);
    try {
      await this.clientsFacade.deleteSite(client.id, site.id);
      this.deletingSite.set(null);
    } catch (error) {
      this.siteActionError.set(
        error instanceof Error ? error.message : 'No fue posible eliminar la sede.',
      );
    } finally {
      this.deletingSiteInProgress.set(false);
    }
  }

  protected close(): void {
    this.siteEditorMode.set(null);
    this.editingSite.set(null);
    this.deletingSite.set(null);
    this.siteActionError.set(null);
    this.closeRequested.emit();
  }
}
