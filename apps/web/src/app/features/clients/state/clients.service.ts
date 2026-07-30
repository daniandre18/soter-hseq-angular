import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  Timestamp,
  Unsubscribe,
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase.tokens';
import { ClientsStore } from './clients.store';
import type { Client, ClientContact, NewClient, NewClientContact } from '../models/client.model';

function toDate(value: Timestamp | undefined): Date {
  return value ? value.toDate() : new Date(0);
}

function toClient(id: string, data: DocumentData): Client {
  return {
    id,
    businessName: data['businessName'],
    legalName: data['legalName'],
    taxId: data['taxId'],
    email: data['email'],
    phone: data['phone'],
    address: data['address'],
    city: data['city'],
    notes: data['notes'],
    status: data['status'],
    createdAt: toDate(data['createdAt']),
    createdBy: data['createdBy'],
    updatedAt: toDate(data['updatedAt']),
    updatedBy: data['updatedBy'],
  };
}

function toClientContact(id: string, data: DocumentData): ClientContact {
  return {
    id,
    name: data['name'],
    position: data['position'],
    email: data['email'],
    phone: data['phone'],
    isPrimary: data['isPrimary'] ?? false,
    status: data['status'],
  };
}

/** Mantiene el ClientsStore de Akita sincronizado con la colección `clients`. */
@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly store = inject(ClientsStore);
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  private unsubscribeFromClients: Unsubscribe | null = null;

  watchClients(): void {
    if (this.unsubscribeFromClients) {
      return;
    }

    this.store.setLoading(true);
    this.unsubscribeFromClients = onSnapshot(
      collection(this.firestore, 'clients'),
      (snapshot) => {
        this.store.set(snapshot.docs.map((doc) => toClient(doc.id, doc.data())));
        this.store.setLoading(false);
      },
      (error) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
      },
    );
  }

  async addClient(data: NewClient, createdBy: string): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'clients'), {
      ...data,
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp(),
      updatedBy: createdBy,
    });
    return ref.id;
  }

  async updateClient(id: string, changes: Partial<NewClient>, updatedBy: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'clients', id), {
      ...changes,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  watchContacts(clientId: string): Observable<ClientContact[]> {
    return new Observable<ClientContact[]>((subscriber) => {
      return onSnapshot(
        collection(this.firestore, 'clients', clientId, 'contacts'),
        (snapshot) => {
          subscriber.next(snapshot.docs.map((docSnapshot) => toClientContact(docSnapshot.id, docSnapshot.data())));
        },
        (error) => subscriber.error(error),
      );
    });
  }

  async addContact(clientId: string, contact: NewClientContact): Promise<void> {
    await addDoc(collection(this.firestore, 'clients', clientId, 'contacts'), contact);
  }
}
