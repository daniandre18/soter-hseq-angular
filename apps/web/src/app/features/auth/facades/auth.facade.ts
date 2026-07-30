import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UsersRepository } from '../../../core/repositories/users.repository';
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

  async login(email: string, password: string): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      await this.authService.login(email, password);
      return true;
    } catch (error) {
      this.errorSignal.set(mapAuthErrorMessage(error));
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
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
