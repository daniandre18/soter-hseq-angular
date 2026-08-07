import { InjectionToken, Signal } from '@angular/core';

/**
 * Sesión mínima de autenticación. El resto de la app (rol, nombre, estado)
 * vive en `AppUser` vía `UsersRepository` — este tipo solo identifica quién
 * inició sesión, sin conocer ningún tipo específico del proveedor de auth.
 */
export interface AuthSession {
  readonly uid: string;
}

/**
 * Puerto de autenticación. Firebase es hoy el único adapter
 * (`FirebaseAuthRepository`), pero nada fuera de `infrastructure/firebase`
 * debe conocer sus tipos (`User`, `UserCredential`, `FirebaseError`, etc.).
 */
export interface AuthRepository {
  readonly authSession: Signal<AuthSession | null>;
  readonly authReady: Signal<boolean>;
  login(email: string, password: string): Promise<AuthSession>;
  logout(): Promise<void>;
  resetPassword(email: string): Promise<void>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepository>('AUTH_REPOSITORY');
