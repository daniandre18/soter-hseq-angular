import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { LocationSelect } from '../location-select/location-select';
import { PhoneInput } from '../../../../shared/components/phone-input/phone-input';
import { ClientsFacade } from '../../facades/clients.facade';
import type { Client, NewClientSite } from '../../models/client.model';
import { normalizeUniqueName } from '../../../../shared/utils/normalize-unique-value';
import { ToastService } from '../../../../shared/services/toast.service';

interface ClientFormModel {
  businessName: string;
  taxId: string;
  email: string;
  phone: string;
  department: string;
  city: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const EMPTY_MODEL: ClientFormModel = {
  businessName: '',
  taxId: '',
  email: '',
  phone: '',
  department: '',
  city: '',
  address: '',
  status: 'ACTIVE',
};

interface SiteDraftFormModel {
  name: string;
  address: string;
  department: string;
  city: string;
  responsibleName: string;
  responsiblePosition: string;
  responsibleEmail: string;
  responsiblePhone: string;
}

const EMPTY_SITE_DRAFT: SiteDraftFormModel = {
  name: '',
  address: '',
  department: '',
  city: '',
  responsibleName: '',
  responsiblePosition: '',
  responsibleEmail: '',
  responsiblePhone: '',
};

@Component({
  selector: 'app-client-form-modal',
  imports: [Modal, Button, Icon, FormField, LocationSelect, PhoneInput, TranslocoPipe],
  providers: [...provideTranslocoScope('clients')],
  templateUrl: './client-form-modal.html',
  styleUrl: './client-form-modal.scss',
})
export class ClientFormModal {
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly open = input(false);
  readonly editingClient = input<Client | null>(null);
  readonly closeRequested = output<void>();
  readonly manageSitesRequested = output<Client>();
  /** Distinto de `closeRequested`: solo se emite tras un guardado exitoso,
   *  para que quien liste clientes en modo paginado (sin listener realtime)
   *  sepa cuándo debe refrescar — cancelar el modal no dispara esto. */
  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly model = signal<ClientFormModel>({ ...EMPTY_MODEL });
  protected readonly draftSites = signal<NewClientSite[]>([]);
  protected readonly siteDraftEditorOpen = signal(false);
  protected readonly editingDraftIndex = signal<number | null>(null);
  protected readonly siteDraftError = signal<string | null>(null);
  protected readonly siteDraftModel = signal<SiteDraftFormModel>({ ...EMPTY_SITE_DRAFT });

  protected readonly clientForm = form(this.model, (schemaPath) => {
    required(schemaPath.businessName, { message: 'clients.form.validation.businessNameRequired' });
    required(schemaPath.taxId, { message: 'clients.form.validation.taxIdRequired' });
  });

  protected readonly siteDraftForm = form(this.siteDraftModel, (schemaPath) => {
    required(schemaPath.name, { message: 'clients.form.validation.siteNameRequired' });
    required(schemaPath.address, { message: 'clients.form.validation.addressRequired' });
    required(schemaPath.city, { message: 'clients.form.validation.cityRequired' });
    required(schemaPath.responsibleName, { message: 'clients.form.validation.responsibleRequired' });
    required(schemaPath.responsiblePhone, { message: 'clients.form.validation.phoneRequired' });
    email(schemaPath.responsibleEmail, { message: 'clients.form.validation.emailInvalid' });
  });

  protected readonly title = computed(() =>
    this.editingClient() ? 'clients.form.editTitle' : 'clients.form.createTitle',
  );
  protected readonly siteDraftTitle = computed(() =>
    this.editingDraftIndex() === null ? 'clients.form.addSiteTitle' : 'clients.form.editSiteTitle',
  );

  constructor() {
    effect(() => {
      const client = this.editingClient();
      if (!this.open()) {
        return;
      }
      this.saveError.set(null);
      this.draftSites.set([]);
      this.siteDraftEditorOpen.set(false);
      this.editingDraftIndex.set(null);
      this.siteDraftError.set(null);
      this.siteDraftForm().reset({ ...EMPTY_SITE_DRAFT });
      this.clientForm().reset(
        client
          ? {
              businessName: client.businessName,
              taxId: client.taxId,
              email: client.email ?? '',
              phone: client.phone ?? '',
              department: client.department ?? '',
              city: client.city ?? '',
              address: client.address ?? '',
              status: client.status,
            }
          : { ...EMPTY_MODEL },
      );
    });
  }

  protected close(): void {
    this.cancelSiteDraft();
    this.draftSites.set([]);
    this.closeRequested.emit();
  }

  protected manageSites(): void {
    const client = this.editingClient();
    if (client) {
      this.manageSitesRequested.emit(client);
    }
  }

  protected openNewSiteDraft(): void {
    const clientData = this.model();
    this.editingDraftIndex.set(null);
    this.siteDraftError.set(null);
    this.siteDraftForm().reset({
      ...EMPTY_SITE_DRAFT,
      address: clientData.address.trim(),
      department: clientData.department.trim(),
      city: clientData.city.trim(),
    });
    this.siteDraftEditorOpen.set(true);
  }

  protected editSiteDraft(index: number): void {
    const site = this.draftSites()[index];
    if (!site) {
      return;
    }
    this.editingDraftIndex.set(index);
    this.siteDraftError.set(null);
    this.siteDraftForm().reset({
      name: site.name,
      address: site.address,
      department: site.department ?? '',
      city: site.city,
      responsibleName: site.responsible.name,
      responsiblePosition: site.responsible.position ?? '',
      responsibleEmail: site.responsible.email ?? '',
      responsiblePhone: site.responsible.phone,
    });
    this.siteDraftEditorOpen.set(true);
  }

  protected cancelSiteDraft(): void {
    this.siteDraftEditorOpen.set(false);
    this.editingDraftIndex.set(null);
    this.siteDraftError.set(null);
    this.siteDraftForm().reset({ ...EMPTY_SITE_DRAFT });
  }

  protected saveSiteDraft(): void {
    submit(this.siteDraftForm, async () => {
      const model = this.siteDraftModel();
      const editingIndex = this.editingDraftIndex();
      const normalizedName = normalizeUniqueName(model.name);
      const duplicate = this.draftSites().some(
        (site, index) =>
          index !== editingIndex && normalizeUniqueName(site.name) === normalizedName,
      );
      if (duplicate) {
        this.siteDraftError.set('clients.form.validation.duplicateSite');
        return;
      }

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
        department: model.department.trim(),
        city: model.city.trim(),
        status: 'ACTIVE',
        responsible,
      };

      this.draftSites.update((sites) =>
        editingIndex === null
          ? [...sites, site]
          : sites.map((current, index) => (index === editingIndex ? site : current)),
      );
      this.cancelSiteDraft();
    });
  }

  protected removeSiteDraft(index: number): void {
    this.draftSites.update((sites) => sites.filter((_, currentIndex) => currentIndex !== index));
    this.cancelSiteDraft();
  }

  protected onSubmit(): void {
    submit(this.clientForm, async () => {
      this.saveError.set(null);
      this.saving.set(true);
      try {
        const data = this.model();
        const editing = this.editingClient();
        if (editing) {
          await this.clientsFacade.updateClient(editing.id, data);
        } else {
          await this.clientsFacade.addClientWithSites(data, this.draftSites());
        }
        this.toast.success(
          this.transloco.translate(editing ? 'clients.messages.updated' : 'clients.messages.created'),
        );
        this.saved.emit();
        this.close();
      } catch (error) {
        this.saveError.set(
          error instanceof Error ? error.message : 'No fue posible guardar el cliente.',
        );
      } finally {
        this.saving.set(false);
      }
    });
  }
}
