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
import { ServicesStore } from './services.store';
import type { NewService, Service } from '../models/service.model';
import { normalizeUniqueName } from '../../../shared/utils/normalize-unique-value';

function toDate(value: Timestamp | undefined): Date {
  return value ? value.toDate() : new Date(0);
}

function toService(id: string, data: DocumentData): Service {
  return {
    id,
    name: data['name'],
    description: data['description'],
    category: data['category'],
    price: data['price'] ?? 0,
    unit: data['unit'],
    active: data['active'] ?? true,
    createdAt: toDate(data['createdAt']),
    createdBy: data['createdBy'],
    updatedAt: toDate(data['updatedAt']),
    updatedBy: data['updatedBy'],
  };
}

/** Mantiene el ServicesStore de Akita sincronizado con la colección
 *  `services`: el catálogo que se selecciona al armar una cotización. */
@Injectable({ providedIn: 'root' })
export class ServicesService {
  private readonly store = inject(ServicesStore);
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  private unsubscribeFromServices: Unsubscribe | null = null;
  private servicesRetriedAfterError = false;

  watchServices(): void {
    if (this.unsubscribeFromServices) {
      return;
    }

    this.store.setLoading(true);
    this.unsubscribeFromServices = onSnapshot(
      collection(this.firestore, 'services'),
      (snapshot) => {
        this.servicesRetriedAfterError = false;
        this.store.setError(null);
        this.store.set(
          snapshot.docs.map((docSnapshot) => toService(docSnapshot.id, docSnapshot.data())),
        );
        this.store.setLoading(false);
      },
      (error) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
        // Ver el mismo comentario en OrdersService.watchOrders: sin limpiar
        // el guard, un permission-denied transitorio justo tras el login
        // deja el listener atascado hasta recargar la página.
        this.unsubscribeFromServices = null;
        if (error.code === 'permission-denied' && !this.servicesRetriedAfterError) {
          this.servicesRetriedAfterError = true;
          setTimeout(() => this.watchServices(), 1000);
        }
      },
    );
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
