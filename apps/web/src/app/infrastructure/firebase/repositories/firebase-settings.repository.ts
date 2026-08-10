import { Injectable, inject } from '@angular/core';
import { DocumentData, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { Observable, retry, throwError, timer } from 'rxjs';
import type { SettingsRepository } from '../../../core/repositories/settings.repository';
import { DEFAULT_APP_SETTINGS, type AppSettings } from '../../../core/models/app-settings.model';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import { toDateOrDefault } from '../mappers/firestore.mapper';

const SETTINGS_DOC_PATH = ['settings', 'general'] as const;

/** Aplica `DEFAULT_APP_SETTINGS` campo a campo, no solo cuando el documento
 *  entero falta: `update()` usa `setDoc(..., {merge:true})`, así que un
 *  documento real puede tener, por ejemplo, solo los campos de apariencia
 *  (si Configuración › Apariencia se guardó antes que General) — sin este
 *  fallback por campo, `businessName` llegaría `undefined` al formulario. */
function toAppSettings(data: DocumentData): AppSettings {
  return {
    businessName: data['businessName'] ?? DEFAULT_APP_SETTINGS.businessName,
    tagline: data['tagline'],
    email: data['email'],
    phone: data['phone'],
    address: data['address'],
    logoUrl: data['logoUrl'],
    logoDesktopSize: data['logoDesktopSize'] ?? DEFAULT_APP_SETTINGS.logoDesktopSize,
    logoMobileSize: data['logoMobileSize'] ?? DEFAULT_APP_SETTINGS.logoMobileSize,
    logoAlignment: data['logoAlignment'] ?? DEFAULT_APP_SETTINGS.logoAlignment,
    updatedAt: toDateOrDefault(data['updatedAt']),
    updatedBy: data['updatedBy'],
  };
}

/** Ver el comentario equivalente en `FirebaseUsersRepository`: la sesión de
 *  Firebase Auth y el canal de Firestore no adoptan la sesión en el mismo
 *  instante, así que un listener abierto justo tras el login puede recibir
 *  `permission-denied` una vez antes de estabilizarse. */
function retryAfterAuthSync<T>() {
  return retry<T>({
    count: 5,
    delay: (error: unknown, retryCount: number) => {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? (error as { code?: unknown }).code
          : undefined;
      if (code !== 'permission-denied') {
        return throwError(() => error);
      }
      return timer(250 * retryCount);
    },
  });
}

/** Adapter de `SettingsRepository` sobre el documento único `settings/general`. */
@Injectable({ providedIn: 'root' })
export class FirebaseSettingsRepository implements SettingsRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  watch(): Observable<AppSettings | null> {
    return new Observable<AppSettings | null>((subscriber) => {
      const ref = doc(this.firestore, ...SETTINGS_DOC_PATH);
      return onSnapshot(
        ref,
        (snapshot) => {
          subscriber.next(snapshot.exists() ? toAppSettings(snapshot.data()) : null);
        },
        (error) => subscriber.error(error),
      );
    }).pipe(retryAfterAuthSync());
  }

  async update(
    changes: Partial<Omit<AppSettings, 'updatedAt' | 'updatedBy'>>,
    updatedBy: string,
  ): Promise<void> {
    await setDoc(
      doc(this.firestore, ...SETTINGS_DOC_PATH),
      { ...changes, updatedAt: serverTimestamp(), updatedBy },
      { merge: true },
    );
  }
}
