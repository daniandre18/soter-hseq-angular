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
  updateDoc,
} from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase.tokens';
import { ServiceCategoriesStore } from './service-categories.store';
import type { NewServiceCategory, ServiceCategory } from '../models/service-category.model';
import { normalizeUniqueName } from '../../../shared/utils/normalize-unique-value';

function toDate(value: Timestamp | undefined): Date {
  return value ? value.toDate() : new Date(0);
}

function toServiceCategory(id: string, data: DocumentData): ServiceCategory {
  return {
    id,
    label: data['label'],
    icon: data['icon'] ?? undefined,
    color: data['color'],
    createdAt: toDate(data['createdAt']),
    createdBy: data['createdBy'],
  };
}

/** Mantiene el ServiceCategoriesStore de Akita sincronizado con la
 *  colección `serviceCategories` — el catálogo administrable que reemplaza
 *  el enum fijo que tenía antes este proyecto. */
@Injectable({ providedIn: 'root' })
export class ServiceCategoriesService {
  private readonly store = inject(ServiceCategoriesStore);
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  private unsubscribeFromCategories: Unsubscribe | null = null;

  watchCategories(): void {
    if (this.unsubscribeFromCategories) {
      return;
    }

    this.store.setLoading(true);
    this.unsubscribeFromCategories = onSnapshot(
      collection(this.firestore, 'serviceCategories'),
      (snapshot) => {
        this.store.set(
          snapshot.docs.map((docSnapshot) => toServiceCategory(docSnapshot.id, docSnapshot.data())),
        );
        this.store.setLoading(false);
      },
      (error) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
      },
    );
  }

  async addCategory(data: NewServiceCategory, createdBy: string): Promise<string> {
    const normalizedLabel = normalizeUniqueName(data.label);
    const snapshot = await getDocs(collection(this.firestore, 'serviceCategories'));
    const duplicate = snapshot.docs.some(
      (category) => normalizeUniqueName(category.data()['label'] ?? '') === normalizedLabel,
    );
    if (duplicate) {
      throw new Error('Ya existe una categoría con ese nombre.');
    }
    const ref = await addDoc(collection(this.firestore, 'serviceCategories'), {
      ...data,
      labelNormalized: normalizedLabel,
      createdAt: serverTimestamp(),
      createdBy,
    });
    return ref.id;
  }

  async updateCategory(id: string, data: NewServiceCategory): Promise<void> {
    const normalizedLabel = normalizeUniqueName(data.label);
    const snapshot = await getDocs(collection(this.firestore, 'serviceCategories'));
    const duplicate = snapshot.docs.some(
      (category) =>
        category.id !== id &&
        normalizeUniqueName(category.data()['label'] ?? '') === normalizedLabel,
    );
    if (duplicate) {
      throw new Error('Ya existe una categoría con ese nombre.');
    }

    await updateDoc(doc(this.firestore, 'serviceCategories', id), {
      label: data.label,
      labelNormalized: normalizedLabel,
      color: data.color,
      icon: data.icon ?? null,
    });
  }

  /** Hard delete: sin "historial" propio (mismo criterio que `clientTags`).
   *  Los servicios que ya tenían esta categoría se quedan con ese `id` en
   *  `category` — la UI debe tolerar un `id` sin match. */
  async deleteCategory(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'serviceCategories', id));
  }
}
