import { Injectable, inject } from '@angular/core';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import { UsersRepository } from '../../../core/repositories/users.repository';
import { TechniciansStore } from './technicians.store';
import type { UserStatus } from '../../../core/models/app-user.model';
import type { NewTechnicianData, TechnicianDetailsUpdate } from '../models/technician.model';

interface CreateUserResponse {
  uid: string;
}

/** Mantiene el TechniciansStore de Akita sincronizado con los usuarios
 *  `role == 'TECHNICIAN'` de la colección `users` (vía `UsersRepository`,
 *  que ya centraliza el acceso a esa colección — CLAUDE.md §6.2). */
@Injectable({ providedIn: 'root' })
export class TechniciansService {
  private readonly store = inject(TechniciansStore);
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly functions = inject(FIREBASE_FUNCTIONS);
  private readonly usersRepository = inject(UsersRepository);

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
   *  el cliente — pasa por la Cloud Function `createUser` (Admin SDK), que
   *  también valida el rol de quien llama (nunca confiar en el rol que
   *  manda el cliente, CLAUDE.md §13.1). El Store se actualiza solo cuando
   *  el listener de `watchTechnicians` reciba el nuevo doc, no aquí. */
  async createTechnician(data: NewTechnicianData): Promise<string> {
    const createUser = httpsCallable<
      NewTechnicianData & { role: 'TECHNICIAN' },
      CreateUserResponse
    >(this.functions, 'createUser');
    const { data: response } = await createUser({ ...data, role: 'TECHNICIAN' });
    return response.uid;
  }

  /** `displayName`/`phone` no están protegidos por `firestore.rules` (solo
   *  `role`/`status` lo están) — un `updateDoc` normal alcanza. */
  async updateTechnician(uid: string, changes: TechnicianDetailsUpdate, updatedBy: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), {
      ...changes,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  async setStatus(uid: string, status: UserStatus, updatedBy: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }
}
