import { InjectionToken } from '@angular/core';
import type { UserRole } from '../../../core/models/user-role.model';
import type { UserStatus } from '../../../core/models/app-user.model';

export type InternalUserRole = Extract<UserRole, 'ADMIN' | 'COMMERCIAL' | 'COORDINATOR'>;

export interface CreateUserInput {
  displayName: string;
  email: string;
  password: string;
  phone?: string;
  specialty?: string;
  role: UserRole;
}

export interface InviteInternalUserInput {
  displayName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  role: InternalUserRole;
}

export interface UpdateInternalUserInput {
  uid: string;
  displayName: string;
  phone?: string;
  jobTitle?: string;
  role: InternalUserRole;
}

export interface InviteClientUserInput {
  clientId: string;
  displayName: string;
  email: string;
  phone?: string;
}

export interface ReplaceClientUserInput extends InviteClientUserInput {
  currentUid: string;
}

export interface SetClientUserStatusInput {
  clientId: string;
  uid: string;
  status: UserStatus;
}

/**
 * Puerto para operaciones de gestión de cuentas que no se pueden hacer
 * desde el cliente (no se puede crear/borrar un usuario de Firebase Auth
 * para otra persona sin el Admin SDK). Hoy lo implementa
 * `FirebaseUserManagementGateway` llamando a las Cloud Functions
 * `createUser`/`deleteUser`; el nombre "Gateway" (en vez de "Repository")
 * refleja que no es CRUD sobre un documento, sino una operación remota.
 */
export interface UserManagementGateway {
  /** El backend valida el rol de quien llama — nunca confiar en el rol que
   *  manda el cliente (CLAUDE.md §13.1). Devuelve el `uid` creado; el store
   *  se actualiza solo cuando el listener de `UsersRepository` reciba el
   *  nuevo documento, no de forma optimista aquí. */
  createUser(data: CreateUserInput): Promise<string>;

  /** Crea la cuenta con clave aleatoria y envía el correo para definirla. */
  inviteInternalUser(data: InviteInternalUserInput): Promise<string>;

  updateInternalUser(data: UpdateInternalUserInput): Promise<void>;

  /** Crea el acceso VIEWER de una empresa sin exponer credenciales. */
  inviteClientUser(data: InviteClientUserInput): Promise<string>;

  /** Retira inmediatamente el acceso anterior y crea una nueva invitación. */
  replaceClientUser(data: ReplaceClientUserInput): Promise<string>;

  /** Activa o bloquea exclusivamente una cuenta VIEWER vinculada al cliente. */
  setClientUserStatus(data: SetClientUserStatusInput): Promise<void>;

  /** Sincroniza Firestore con el bloqueo real de Firebase Authentication. */
  setUserStatus(uid: string, status: UserStatus): Promise<void>;

  sendAccessEmail(email: string): Promise<void>;

  /** Borra la cuenta de Auth Y el documento de Firestore — no alcanza con
   *  borrar solo el documento (dejaría una cuenta de Auth "huérfana" que
   *  aún podría iniciar sesión). */
  deleteUser(uid: string): Promise<void>;
}

export const USER_MANAGEMENT_GATEWAY = new InjectionToken<UserManagementGateway>(
  'USER_MANAGEMENT_GATEWAY',
);
