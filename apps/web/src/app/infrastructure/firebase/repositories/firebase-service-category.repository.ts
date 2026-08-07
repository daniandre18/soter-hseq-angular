import { Injectable, inject } from '@angular/core';
import { DocumentData, addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Observable } from 'rxjs';
import type { ServiceCategoryRepository } from '../../../features/services/domain/service-category.repository';
import type {
  NewServiceCategory,
  ServiceCategory,
} from '../../../features/services/models/service-category.model';
import { normalizeUniqueName } from '../../../shared/utils/normalize-unique-value';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import { toDateOrDefault } from '../mappers/firestore.mapper';

function toServiceCategory(id: string, data: DocumentData): ServiceCategory {
  return {
    id,
    label: data['label'],
    icon: data['icon'] ?? undefined,
    color: data['color'],
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
  };
}

/** Adapter de `ServiceCategoryRepository` sobre la colección `serviceCategories`. */
@Injectable({ providedIn: 'root' })
export class FirebaseServiceCategoryRepository implements ServiceCategoryRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  watchAll(): Observable<ServiceCategory[]> {
    return new Observable<ServiceCategory[]>((subscriber) => {
      return onSnapshot(
        collection(this.firestore, 'serviceCategories'),
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) => toServiceCategory(docSnapshot.id, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    });
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
        category.id !== id && normalizeUniqueName(category.data()['label'] ?? '') === normalizedLabel,
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

  async deleteCategory(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'serviceCategories', id));
  }
}
