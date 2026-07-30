import { Injectable, inject } from '@angular/core';
import { DocumentData, Timestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { FIREBASE_FIRESTORE } from '../firebase/firebase.tokens';
import type { AppUser } from '../models/app-user.model';

function toDate(value: Timestamp | undefined): Date {
  return value ? value.toDate() : new Date(0);
}

function toAppUser(id: string, data: DocumentData): AppUser {
  return {
    id,
    uid: data['uid'],
    displayName: data['displayName'],
    email: data['email'],
    phone: data['phone'],
    role: data['role'],
    status: data['status'],
    photoUrl: data['photoUrl'],
    createdAt: toDate(data['createdAt']),
    createdBy: data['createdBy'],
    updatedAt: toDate(data['updatedAt']),
    updatedBy: data['updatedBy'],
  };
}

/**
 * Encapsula el acceso a la colección `users` de Firestore. Nada fuera de
 * `core` debe importar `firebase/firestore` directamente (CLAUDE.md §6.2).
 */
@Injectable({ providedIn: 'root' })
export class UsersRepository {
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
    });
  }
}
