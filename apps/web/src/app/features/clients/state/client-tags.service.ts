import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  Timestamp,
  Unsubscribe,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase.tokens';
import { ClientTagsStore } from './client-tags.store';
import type { ClientTag, NewClientTag } from '../models/client-tag.model';
import { normalizeUniqueName } from '../../../shared/utils/normalize-unique-value';

function toDate(value: Timestamp | undefined): Date {
  return value ? value.toDate() : new Date(0);
}

function toClientTag(id: string, data: DocumentData): ClientTag {
  return {
    id,
    label: data['label'],
    color: data['color'],
    createdAt: toDate(data['createdAt']),
    createdBy: data['createdBy'],
  };
}

/** Mantiene el ClientTagsStore de Akita sincronizado con la colección
 *  `clientTags` — el catálogo administrable que reemplaza la paleta fija
 *  de etiquetas que tenía antes este proyecto. */
@Injectable({ providedIn: 'root' })
export class ClientTagsService {
  private readonly store = inject(ClientTagsStore);
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  private unsubscribeFromTags: Unsubscribe | null = null;

  watchTags(): void {
    if (this.unsubscribeFromTags) {
      return;
    }

    this.store.setLoading(true);
    this.unsubscribeFromTags = onSnapshot(
      collection(this.firestore, 'clientTags'),
      (snapshot) => {
        this.store.set(
          snapshot.docs.map((docSnapshot) => toClientTag(docSnapshot.id, docSnapshot.data())),
        );
        this.store.setLoading(false);
      },
      (error) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
      },
    );
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

  /** Hard delete: a diferencia de clientes/órdenes, una etiqueta no tiene
   *  "historial" propio que proteger. Los clientes que ya la tenían
   *  aplicada se quedan con ese `id` en su arreglo `tags` — la UI debe
   *  tolerar un `id` sin match (mismo criterio que borrar un servicio no
   *  rompe las cotizaciones ya creadas con él). */
  async deleteTag(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'clientTags', id));
  }
}
