import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
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
import type { NotificationRepository } from '../../../features/notifications/domain/notification.repository';
import type { AppNotification } from '../../../features/notifications/models/notification.model';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import { toDateOrDefault } from '../mappers/firestore.mapper';

const NOTIFICATIONS_LIMIT = 50;

function toNotification(id: string, data: DocumentData): AppNotification {
  return {
    id,
    type: data['type'],
    title: data['title'],
    description: data['description'],
    entityType: data['entityType'],
    entityId: data['entityId'],
    readBy: data['readBy'] ?? [],
    dismissedBy: data['dismissedBy'] ?? [],
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
  };
}

/** Adapter de `NotificationRepository` sobre la colección `notifications`. */
@Injectable({ providedIn: 'root' })
export class FirebaseNotificationRepository implements NotificationRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  watchAll(): Observable<AppNotification[]> {
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

  async dismiss(notificationId: string, userId: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'notifications', notificationId), {
      dismissedBy: arrayUnion(userId),
    });
  }

  async dismissAll(notificationIds: string[], userId: string): Promise<void> {
    if (notificationIds.length === 0) {
      return;
    }
    const batch = writeBatch(this.firestore);
    for (const id of notificationIds) {
      batch.update(doc(this.firestore, 'notifications', id), {
        dismissedBy: arrayUnion(userId),
      });
    }
    await batch.commit();
  }
}
