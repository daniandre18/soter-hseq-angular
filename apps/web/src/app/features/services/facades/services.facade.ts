import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ServicesQuery } from '../state/services.query';
import { ServicesService } from '../state/services.service';
import { AuthFacade } from '../../auth/facades/auth.facade';
import type { NewService, Service } from '../models/service.model';
import type { ReleaseListener } from '../../../shared/utils/reference-counted-listener';

/** Único punto de contacto entre la UI y el catálogo de servicios. */
@Injectable({ providedIn: 'root' })
export class ServicesFacade {
  private readonly query = inject(ServicesQuery);
  private readonly service = inject(ServicesService);
  private readonly authFacade = inject(AuthFacade);

  readonly services = toSignal(this.query.services$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });
  readonly error = toSignal(this.query.error$, { initialValue: null });

  readonly activeServices = computed(() => this.services().filter((service) => service.active));

  init(): ReleaseListener {
    return this.service.watchServices();
  }

  byId(id: string): Service | undefined {
    return this.services().find((service) => service.id === id);
  }

  async addService(data: NewService): Promise<string> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    return this.service.addService(data, userId);
  }

  async updateService(id: string, changes: Partial<NewService>): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.updateService(id, changes, userId);
  }

  async deleteService(id: string): Promise<void> {
    await this.service.deleteService(id);
  }
}
