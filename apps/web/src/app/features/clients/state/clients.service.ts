import { Injectable, inject } from '@angular/core';
import { DocumentData, Timestamp, Unsubscribe, collection, onSnapshot } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase.tokens';
import { ClientsStore } from './clients.store';
import type { Client } from '../models/client.model';

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
}
