import type { UserRole } from './user-role.model';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Modelo de dominio de la colección `users` (CLAUDE.md §9.2).
 * Los timestamps de Firestore se normalizan a `Date` en el repositorio
 * para que el resto de la app no dependa de tipos de Firebase.
 */
export interface AppUser {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  /** Solo aplica a técnicos (CLAUDE.md no lo define, pero el resto de roles
   *  simplemente no lo usa) — p. ej. "Seguridad Industrial". */
  specialty?: string;
  /** Cargo visible para perfiles administrativos, separado del rol de acceso. */
  jobTitle?: string;
  /** Empresa a la que pertenece un usuario de consulta (`VIEWER`).
   *  Permite que consultas y Rules acoten los datos del portal cliente. */
  clientId?: string;
  role: UserRole;
  status: UserStatus;
  photoUrl?: string;
  invitedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
