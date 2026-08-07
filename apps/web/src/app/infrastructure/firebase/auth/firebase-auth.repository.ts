import { Injectable, inject, signal } from '@angular/core';
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import type { AuthRepository, AuthSession } from '../../../core/repositories/auth.repository';
import { FIREBASE_AUTH } from '../firebase.tokens';

/**
 * Adapter de `AuthRepository` sobre Firebase Authentication. Junto con
 * `FirebaseUsersRepository`, es el único código del proyecto que conoce
 * tipos de `firebase/auth` (`User`, `UserCredential`) — el resto de la app
 * solo ve `AuthSession`.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseAuthRepository implements AuthRepository {
  private readonly auth = inject(FIREBASE_AUTH);

  private readonly authSessionSignal = signal<AuthSession | null>(null);
  private readonly authReadySignal = signal(false);

  readonly authSession = this.authSessionSignal.asReadonly();
  readonly authReady = this.authReadySignal.asReadonly();

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.authSessionSignal.set(user ? { uid: user.uid } : null);
      this.authReadySignal.set(true);
    });
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    // Firestore sincroniza el token nuevo de forma asíncrona por su cuenta;
    // sin este await, el primer listener que se abre justo después de
    // iniciar sesión (p. ej. OrdersFacade.init() en el guard de la ruta)
    // puede salir con el token viejo — y un `onSnapshot` que ya falló con
    // permission-denied no se reintenta solo. Forzar el refresh aquí
    // garantiza que el SDK ya tiene el token nuevo antes de navegar.
    await credential.user.getIdToken(true);
    return { uid: credential.user.uid };
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }
}
