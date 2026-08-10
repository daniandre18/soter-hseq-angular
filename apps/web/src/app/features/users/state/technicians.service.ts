import { Injectable, inject } from '@angular/core';
import { USERS_REPOSITORY } from '../../../core/repositories/users.repository';
import { USER_MANAGEMENT_GATEWAY } from '../domain/user-management.gateway';
import { TechniciansStore } from './technicians.store';
import type { UserStatus } from '../../../core/models/app-user.model';
import type { NewTechnicianData, TechnicianDetailsUpdate } from '../models/technician.model';

/** Mantiene el TechniciansStore de Akita sincronizado con los usuarios
 *  `role == 'TECHNICIAN'` de la colección `users` (vía `UsersRepository`,
 *  que ya centraliza el acceso a esa colección — CLAUDE.md §6.2). */
@Injectable({ providedIn: 'root' })
export class TechniciansService {
  private readonly store = inject(TechniciansStore);
  private readonly usersRepository = inject(USERS_REPOSITORY);
  private readonly userManagementGateway = inject(USER_MANAGEMENT_GATEWAY);

  private watching = false;

  watchTechnicians(): void {
    if (this.watching) {
      return;
    }
    this.watching = true;
    this.store.setLoading(true);
    this.usersRepository.watchByRole('TECHNICIAN').subscribe({
      next: (technicians) => {
        this.store.set(technicians);
        this.store.setLoading(false);
      },
      error: (error: Error) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
      },
    });
  }

  /** No se puede crear un usuario de Firebase Auth para otra persona desde
   *  el cliente — pasa por `UserManagementGateway` (Admin SDK), que también
   *  valida el rol de quien llama (nunca confiar en el rol que manda el
   *  cliente, CLAUDE.md §13.1). El Store se actualiza solo cuando el
   *  listener de `watchTechnicians` reciba el nuevo doc, no aquí. */
  async createTechnician(data: NewTechnicianData): Promise<string> {
    return this.userManagementGateway.createUser({ ...data, role: 'TECHNICIAN' });
  }

  async updateTechnician(
    uid: string,
    changes: TechnicianDetailsUpdate,
    updatedBy: string,
  ): Promise<void> {
    await this.usersRepository.updateProfile(uid, changes, updatedBy);
  }

  async setStatus(uid: string, status: UserStatus): Promise<void> {
    await this.userManagementGateway.setUserStatus(uid, status);
  }

  /** Borra la cuenta de Auth Y el documento de Firestore — no alcanza con
   *  `deleteDoc` (dejaría una cuenta de Auth "huérfana" que aún podría
   *  iniciar sesión), así que pasa por `UserManagementGateway`, mismo
   *  motivo que `createTechnician`. */
  async deleteTechnician(uid: string): Promise<void> {
    await this.userManagementGateway.deleteUser(uid);
  }
}
