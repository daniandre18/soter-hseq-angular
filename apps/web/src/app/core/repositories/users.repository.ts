import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { AppUser } from '../models/app-user.model';
import type { UserRole } from '../models/user-role.model';

/**
 * Puerto de acceso a la colección `users`. Nada fuera de
 * `infrastructure/firebase` debe importar `firebase/firestore` directamente
 * (CLAUDE.md §6.2) — este contrato es lo único que el resto de la app
 * conoce; `FirebaseUsersRepository` es hoy su único adapter.
 */
export interface UsersRepository {
  getById(uid: string): Promise<AppUser | null>;

  watchById(uid: string): Observable<AppUser | null>;

  /** Para resolver nombres de autor en feeds de actividad, sin importar el rol. */
  watchAll(): Observable<AppUser[]>;

  /** Para selectores de asignación (p. ej. técnicos disponibles en Órdenes). */
  watchByRole(role: UserRole): Observable<AppUser[]>;

  /** `displayName`/`phone`/`specialty` no están protegidos por
   *  `firestore.rules` (solo `role`/`status` lo están) — una escritura
   *  normal alcanza, sin pasar por Cloud Functions. */
  updateProfile(
    uid: string,
    changes: Partial<Pick<AppUser, 'displayName' | 'phone' | 'specialty'>>,
    updatedBy: string,
  ): Promise<void>;
}

export const USERS_REPOSITORY = new InjectionToken<UsersRepository>('USERS_REPOSITORY');
