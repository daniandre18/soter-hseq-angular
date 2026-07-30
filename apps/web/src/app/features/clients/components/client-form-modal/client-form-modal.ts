import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { ClientsFacade } from '../../facades/clients.facade';
import type { Client } from '../../models/client.model';

interface ClientFormModel {
  businessName: string;
  taxId: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const EMPTY_MODEL: ClientFormModel = {
  businessName: '',
  taxId: '',
  email: '',
  phone: '',
  city: '',
  address: '',
  status: 'ACTIVE',
};

@Component({
  selector: 'app-client-form-modal',
  imports: [Modal, Button, FormField],
  templateUrl: './client-form-modal.html',
  styleUrl: './client-form-modal.scss',
})
export class ClientFormModal {
  private readonly clientsFacade = inject(ClientsFacade);

  readonly open = input(false);
  readonly editingClient = input<Client | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly model = signal<ClientFormModel>({ ...EMPTY_MODEL });

  protected readonly clientForm = form(this.model, (schemaPath) => {
    required(schemaPath.businessName, { message: 'La razón social es obligatoria.' });
    required(schemaPath.taxId, { message: 'El NIT es obligatorio.' });
  });

  protected readonly title = computed(() =>
    this.editingClient() ? 'Editar Cliente' : 'Nuevo Cliente',
  );

  constructor() {
    effect(() => {
      const client = this.editingClient();
      if (!this.open()) {
        return;
      }
      this.model.set(
        client
          ? {
              businessName: client.businessName,
              taxId: client.taxId,
              email: client.email ?? '',
              phone: client.phone ?? '',
              city: client.city ?? '',
              address: client.address ?? '',
              status: client.status,
            }
          : { ...EMPTY_MODEL },
      );
    });
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected onSubmit(): void {
    submit(this.clientForm, async () => {
      this.saving.set(true);
      try {
        const data = this.model();
        const editing = this.editingClient();
        if (editing) {
          await this.clientsFacade.updateClient(editing.id, data);
        } else {
          await this.clientsFacade.addClient(data);
        }
        this.close();
      } finally {
        this.saving.set(false);
      }
    });
  }
}
