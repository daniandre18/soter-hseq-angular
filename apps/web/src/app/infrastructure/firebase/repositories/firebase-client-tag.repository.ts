import { Injectable, inject } from '@angular/core';
import { DocumentData, addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Observable } from 'rxjs';
import type { ClientTagRepository } from '../../../features/clients/domain/client-tag.repository';
import type { ClientTag, NewClientTag } from '../../../features/clients/models/client-tag.model';
import { normalizeUniqueName } from '../../../shared/utils/normalize-unique-value';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import { toDateOrDefault } from '../mappers/firestore.mapper';

function toClientTag(id: string, data: DocumentData): ClientTag {
  return {
    id,
    label: data['label'],
    color: data['color'],
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
  };
}

/** Adapter de `ClientTagRepository` sobre la colección `clientTags`. */
@Injectable({ providedIn: 'root' })
export class FirebaseClientTagRepository implements ClientTagRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  watchAll(): Observable<ClientTag[]> {
    return new Observable<ClientTag[]>((subscriber) => {
      return onSnapshot(
        collection(this.firestore, 'clientTags'),
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) => toClientTag(docSnapshot.id, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    });
  }

  async addTag(data: NewClientTag, createdBy: string): Promise<string> {
    const normalizedLabel = normalizeUniqueName(data.label);
    const snapshot = await getDocs(collection(this.firestore, 'clientTags'));
    const duplicate = snapshot.docs.some(
      (tag) => normalizeUniqueName(tag.data()['label'] ?? '') === normalizedLabel,
    );
    if (duplicate) {
      throw new Error('Ya existe una etiqueta con ese nombre.');
    }
    const ref = await addDoc(collection(this.firestore, 'clientTags'), {
      ...data,
      labelNormalized: normalizedLabel,
      createdAt: serverTimestamp(),
      createdBy,
    });
    return ref.id;
  }

  async deleteTag(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'clientTags', id));
  }
}
