import { Injectable, inject } from '@angular/core';
import { DocumentData, addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Observable } from 'rxjs';
import type { ServiceRepository } from '../../../features/services/domain/service.repository';
import type { NewService, Service } from '../../../features/services/models/service.model';
import { normalizeUniqueName } from '../../../shared/utils/normalize-unique-value';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import { toDateOrDefault } from '../mappers/firestore.mapper';

function toService(id: string, data: DocumentData): Service {
  return {
    id,
    name: data['name'],
    description: data['description'],
    category: data['category'],
    price: data['price'] ?? 0,
    unit: data['unit'],
    active: data['active'] ?? true,
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
    updatedAt: toDateOrDefault(data['updatedAt']),
    updatedBy: data['updatedBy'],
  };
}

/** Adapter de `ServiceRepository` sobre la colección `services`. */
@Injectable({ providedIn: 'root' })
export class FirebaseServiceRepository implements ServiceRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  watchAll(): Observable<Service[]> {
    return new Observable<Service[]>((subscriber) => {
      return onSnapshot(
        collection(this.firestore, 'services'),
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) => toService(docSnapshot.id, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    });
  }

  async addService(data: NewService, createdBy: string): Promise<string> {
    await this.assertUniqueName(data.name);
    const ref = await addDoc(collection(this.firestore, 'services'), {
      ...data,
      nameNormalized: normalizeUniqueName(data.name),
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp(),
      updatedBy: createdBy,
    });
    return ref.id;
  }

  async updateService(id: string, changes: Partial<NewService>, updatedBy: string): Promise<void> {
    if (changes.name !== undefined) {
      await this.assertUniqueName(changes.name, id);
    }
    await updateDoc(doc(this.firestore, 'services', id), {
      ...changes,
      ...(changes.name !== undefined && { nameNormalized: normalizeUniqueName(changes.name) }),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  async deleteService(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'services', id));
  }

  private async assertUniqueName(name: string, currentId?: string): Promise<void> {
    const normalizedName = normalizeUniqueName(name);
    const snapshot = await getDocs(collection(this.firestore, 'services'));
    const duplicate = snapshot.docs.some(
      (service) =>
        service.id !== currentId &&
        normalizeUniqueName(service.data()['name'] ?? '') === normalizedName,
    );
    if (duplicate) {
      throw new Error('Ya existe un servicio con ese nombre.');
    }
  }
}
