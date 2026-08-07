import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable, retry, throwError, timer } from 'rxjs';
import type { UsersRepository } from '../../../core/repositories/users.repository';
import type { AppUser, UserStatus } from '../../../core/models/app-user.model';
import type { UserRole } from '../../../core/models/user-role.model';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import { toDateOrDefault } from '../mappers/firestore.mapper';

function toAppUser(id: string, data: DocumentData): AppUser {
  return {
    id,
    uid: data['uid'],
    displayName: data['displayName'],
    email: data['email'],
    phone: data['phone'],
    specialty: data['specialty'],
    clientId: data['clientId'],
    role: data['role'],
    status: data['status'],
    photoUrl: data['photoUrl'],
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
    updatedAt: toDateOrDefault(data['updatedAt']),
    updatedBy: data['updatedBy'],
  };
}

const AUTH_SYNC_RETRY_COUNT = 5;

/**
 * Firebase Auth y el canal interno de Firestore no terminan de adoptar la
 * sesión exactamente en el mismo instante. Si un listener se abre durante
 * esa ventana, Firestore puede responder `permission-denied` aunque el login
 * ya haya finalizado. Un Observable que llega con error a `toSignal` queda
 * inutilizable y Angular vuelve a lanzar ese error cada vez que lee el
 * Signal, así que el reintento debe ocurrir aquí, antes de exponerlo.
 */
function retryAfterAuthSync<T>() {
  return retry<T>({
    count: AUTH_SYNC_RETRY_COUNT,
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

/** Adapter de `UsersRepository` sobre la colección `users` de Firestore. */
@Injectable({ providedIn: 'root' })
export class FirebaseUsersRepository implements UsersRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  async getById(uid: string): Promise<AppUser | null> {
    const snapshot = await getDoc(doc(this.firestore, 'users', uid));
    return snapshot.exists() ? toAppUser(snapshot.id, snapshot.data()) : null;
  }

  watchById(uid: string): Observable<AppUser | null> {
    return new Observable<AppUser | null>((subscriber) => {
      const ref = doc(this.firestore, 'users', uid);
      return onSnapshot(
        ref,
        (snapshot) => {
          subscriber.next(snapshot.exists() ? toAppUser(snapshot.id, snapshot.data()) : null);
        },
        (error) => subscriber.error(error),
      );
    }).pipe(retryAfterAuthSync());
  }

  watchAll(): Observable<AppUser[]> {
    return new Observable<AppUser[]>((subscriber) => {
      return onSnapshot(
        collection(this.firestore, 'users'),
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) => toAppUser(docSnapshot.id, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    }).pipe(retryAfterAuthSync());
  }

  watchByRole(role: UserRole): Observable<AppUser[]> {
    return new Observable<AppUser[]>((subscriber) => {
      const usersQuery = query(collection(this.firestore, 'users'), where('role', '==', role));
      return onSnapshot(
        usersQuery,
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) => toAppUser(docSnapshot.id, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    }).pipe(retryAfterAuthSync());
  }

  async updateProfile(
    uid: string,
    changes: Partial<Pick<AppUser, 'displayName' | 'phone' | 'specialty'>>,
    updatedBy: string,
  ): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), {
      ...changes,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  async setStatus(uid: string, status: UserStatus, updatedBy: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }
}
