import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  User,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase/firebase.tokens';

/**
 * Wrapper delgado sobre Firebase Authentication. No conoce roles ni el
 * documento de `users`: eso es responsabilidad de AuthFacade + UsersRepository.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth: Auth = inject(FIREBASE_AUTH);

  private readonly authUserSignal = signal<User | null>(null);
  private readonly authReadySignal = signal(false);

  readonly authUser = this.authUserSignal.asReadonly();
  readonly authReady = this.authReadySignal.asReadonly();

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.authUserSignal.set(user);
      this.authReadySignal.set(true);
    });
  }

  async login(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    // Firestore sincroniza el token nuevo de forma asíncrona por su cuenta;
    // sin este await, el primer listener que se abre justo después de
    // iniciar sesión (p. ej. OrdersFacade.init() en el guard de la ruta)
    // puede salir con el token viejo — y un `onSnapshot` que ya falló con
    // permission-denied no se reintenta solo. Forzar el refresh aquí
    // garantiza que el SDK ya tiene el token nuevo antes de navegar.
    await credential.user.getIdToken(true);
    return credential.user;
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }
}
