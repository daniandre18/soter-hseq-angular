import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  Timestamp,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase.tokens';
import type { AppNotification } from '../models/notification.model';

const NOTIFICATIONS_LIMIT = 50;

function toDate(value: Timestamp | undefined): Date {
  return value ? value.toDate() : new Date(0);
}

function toNotification(id: string, data: DocumentData): AppNotification {
  return {
    id,
    type: data['type'],
    title: data['title'],
    description: data['description'],
    entityType: data['entityType'],
    entityId: data['entityId'],
    readBy: data['readBy'] ?? [],
    createdAt: toDate(data['createdAt']),
    createdBy: data['createdBy'],
  };
}

/**
 * Encapsula el acceso a la colección `notifications` (CLAUDE.md §6.2 — nada
 * fuera de esta clase debe importar `firebase/firestore` para esto). Solo
 * lectura + marcar como leída: la creación es exclusiva de Cloud Functions
 * (`firestore.rules`: `allow create: if false`).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  watchNotifications(): Observable<AppNotification[]> {
    return new Observable<AppNotification[]>((subscriber) => {
      const notificationsQuery = query(
        collection(this.firestore, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(NOTIFICATIONS_LIMIT),
      );
      return onSnapshot(
        notificationsQuery,
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) => toNotification(docSnapshot.id, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'notifications', notificationId), {
      readBy: arrayUnion(userId),
    });
  }

  async markAllAsRead(notificationIds: string[], userId: string): Promise<void> {
    if (notificationIds.length === 0) {
      return;
    }
    const batch = writeBatch(this.firestore);
    for (const id of notificationIds) {
      batch.update(doc(this.firestore, 'notifications', id), { readBy: arrayUnion(userId) });
    }
    await batch.commit();
  }
}
