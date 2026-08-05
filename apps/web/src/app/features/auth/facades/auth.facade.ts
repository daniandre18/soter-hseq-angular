import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, filter, of, switchMap, take } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UsersRepository } from '../../../core/repositories/users.repository';
import type { AppUser } from '../../../core/models/app-user.model';
import { mapAuthErrorMessage } from './auth-error.util';

/**
 * Único punto de contacto entre la UI y la autenticación/perfil del usuario.
 * Combina el usuario de Firebase Auth con su documento de `users` (rol,
 * estado) y expone todo como Signals, sin exponer Firebase a los componentes.
 */
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly authService = inject(AuthService);
  private readonly usersRepository = inject(UsersRepository);

  private readonly errorSignal = signal<string | null>(null);
  private readonly loadingSignal = signal(false);

  readonly authReady = this.authService.authReady;

  readonly currentUser = toSignal(
    toObservable(this.authService.authUser).pipe(
      switchMap((user) => (user ? this.usersRepository.watchById(user.uid) : of(null))),
    ),
    { initialValue: null },
  );

  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly currentRole = computed(() => this.currentUser()?.role ?? null);
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Resuelve el usuario actual una sola vez, esperando primero a que
   * Firebase Auth determine el estado de sesión real (`authReady`) y luego
   * al primer resultado del documento de Firestore. A diferencia de
   * `currentUser` (Signal siempre "vivo"), esto evita que los guards decidan
   * con el valor inicial `null` antes de que la sesión persistida se cargue.
   */
  resolveCurrentUser$(): Observable<AppUser | null> {
    return toObservable(this.authReady).pipe(
      filter((ready) => ready),
      take(1),
      switchMap(() => {
        const user = this.authService.authUser();
        return user ? this.usersRepository.watchById(user.uid) : of(null);
      }),
      take(1),
    );
  }

  async login(email: string, password: string): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const user = await this.authService.login(email, password);
      // `getIdToken(true)` confirma el token en Firebase Auth, pero el
      // proveedor interno de Firestore puede procesarlo unos milisegundos
      // después. Antes de montar Shell/Dashboard (que abre varios listeners
      // simultáneos), comprobamos una lectura real protegida por Rules.
      await this.waitForFirestoreProfile(user.uid);
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
    await this.authService.logout();
  }

  async resetPassword(email: string): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      await this.authService.resetPassword(email);
      return true;
    } catch (error) {
      this.errorSignal.set(mapAuthErrorMessage(error));
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
