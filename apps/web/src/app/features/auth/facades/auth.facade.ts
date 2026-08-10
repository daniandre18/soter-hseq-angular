import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, filter, map, of, switchMap, take } from 'rxjs';
import { AUTH_REPOSITORY } from '../../../core/repositories/auth.repository';
import { USERS_REPOSITORY } from '../../../core/repositories/users.repository';
import type { AppUser } from '../../../core/models/app-user.model';
import { mapAuthErrorMessage } from './auth-error.util';

/**
 * Único punto de contacto entre la UI y la autenticación/perfil del usuario.
 * Combina la sesión de `AuthRepository` con su documento de `users` (rol,
 * estado) y expone todo como Signals, sin exponer Firebase a los componentes.
 */
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly authRepository = inject(AUTH_REPOSITORY);
  private readonly usersRepository = inject(USERS_REPOSITORY);

  private readonly errorSignal = signal<string | null>(null);
  private readonly loadingSignal = signal(false);

  readonly authReady = this.authRepository.authReady;

  readonly currentUser = toSignal(
    toObservable(this.authRepository.authSession).pipe(
      switchMap((session) => (session ? this.usersRepository.watchById(session.uid) : of(null))),
      map((user) => (user?.status === 'ACTIVE' ? user : null)),
    ),
    { initialValue: null },
  );

  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly currentRole = computed(() => this.currentUser()?.role ?? null);
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Resuelve el usuario actual una sola vez, esperando primero a que
   * el proveedor de auth determine el estado de sesión real (`authReady`) y
   * luego al primer resultado del documento de Firestore. A diferencia de
   * `currentUser` (Signal siempre "vivo"), esto evita que los guards decidan
   * con el valor inicial `null` antes de que la sesión persistida se cargue.
   */
  resolveCurrentUser$(): Observable<AppUser | null> {
    return toObservable(this.authReady).pipe(
      filter((ready) => ready),
      take(1),
      switchMap(() => {
        const session = this.authRepository.authSession();
        return session ? this.usersRepository.watchById(session.uid) : of(null);
      }),
      map((user) => (user?.status === 'ACTIVE' ? user : null)),
      take(1),
    );
  }

  async login(email: string, password: string): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const session = await this.authRepository.login(email, password);
      // El login ya confirma el token en el proveedor de auth, pero el
      // canal interno de Firestore puede procesarlo unos milisegundos
      // después. Antes de montar Shell/Dashboard (que abre varios listeners
      // simultáneos), comprobamos una lectura real protegida por Rules.
      await this.waitForFirestoreProfile(session.uid);
      return true;
    } catch (error) {
      this.errorSignal.set(mapAuthErrorMessage(error));
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private async waitForFirestoreProfile(uid: string): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const profile = await this.usersRepository.getById(uid);
        if (!profile) {
          throw new Error('El usuario no tiene un perfil asociado en Firestore.');
        }
        if (profile.status !== 'ACTIVE') {
          throw new Error('El acceso de este usuario está desactivado.');
        }
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 5) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  async logout(): Promise<void> {
    await this.authRepository.logout();
  }

  async resetPassword(email: string): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      await this.authRepository.resetPassword(email);
      return true;
    } catch (error) {
      this.errorSignal.set(mapAuthErrorMessage(error));
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
