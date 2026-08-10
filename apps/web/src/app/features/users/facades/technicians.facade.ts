import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TechniciansQuery } from '../state/technicians.query';
import { TechniciansService } from '../state/technicians.service';
import { AuthFacade } from '../../auth/facades/auth.facade';
import type { AppUser, UserStatus } from '../../../core/models/app-user.model';
import type { NewTechnicianData, TechnicianDetailsUpdate } from '../models/technician.model';
import type { ReleaseListener } from '../../../shared/utils/reference-counted-listener';

/** Único punto de contacto entre la UI y la gestión de técnicos. */
@Injectable({ providedIn: 'root' })
export class TechniciansFacade {
  private readonly query = inject(TechniciansQuery);
  private readonly service = inject(TechniciansService);
  private readonly authFacade = inject(AuthFacade);

  readonly technicians = toSignal(this.query.technicians$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });
  readonly error = toSignal(this.query.error$, { initialValue: null });

  init(): ReleaseListener {
    return this.service.watchTechnicians();
  }

  byId(id: string): AppUser | undefined {
    return this.technicians().find((technician) => technician.id === id);
  }

  async createTechnician(data: NewTechnicianData): Promise<string> {
    return this.service.createTechnician(data);
  }

  async updateTechnician(uid: string, changes: TechnicianDetailsUpdate): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.updateTechnician(uid, changes, userId);
  }

  async setStatus(uid: string, status: UserStatus): Promise<void> {
    await this.service.setStatus(uid, status);
  }

  async deleteTechnician(uid: string): Promise<void> {
    await this.service.deleteTechnician(uid);
  }
}
