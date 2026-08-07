import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import type { ClientRepository } from '../../../features/clients/domain/client.repository';
import type {
  Client,
  ClientContact,
  ClientSite,
  NewClient,
  NewClientContact,
  NewClientSite,
} from '../../../features/clients/models/client.model';
import { normalizeTaxId, normalizeUniqueName } from '../../../shared/utils/normalize-unique-value';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import { toDateOrDefault } from '../mappers/firestore.mapper';

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
    tags: data['tags'] ?? [],
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
    updatedAt: toDateOrDefault(data['updatedAt']),
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

function toClientSite(id: string, data: DocumentData): ClientSite {
  const responsible = (data['responsible'] ?? {}) as DocumentData;
  return {
    id,
    name: data['name'],
    address: data['address'],
    city: data['city'],
    responsible: {
      name: responsible['name'] ?? '',
      position: responsible['position'],
      email: responsible['email'],
      phone: responsible['phone'] ?? '',
    },
    status: data['status'] ?? 'ACTIVE',
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'] ?? '',
    updatedAt: toDateOrDefault(data['updatedAt']),
    updatedBy: data['updatedBy'] ?? '',
  };
}

/** Adapter de `ClientRepository` sobre Firestore (`clients` + subcolecciones). */
@Injectable({ providedIn: 'root' })
export class FirebaseClientRepository implements ClientRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  watchAll(): Observable<Client[]> {
    return new Observable<Client[]>((subscriber) => {
      return onSnapshot(
        collection(this.firestore, 'clients'),
        (snapshot) => {
          subscriber.next(snapshot.docs.map((docSnapshot) => toClient(docSnapshot.id, docSnapshot.data())));
        },
        (error) => subscriber.error(error),
      );
    });
  }

  async addClient(data: NewClient, createdBy: string): Promise<string> {
    return this.addClientWithSites(data, [], createdBy);
  }

  async addClientWithSites(
    data: NewClient,
    sites: NewClientSite[],
    createdBy: string,
  ): Promise<string> {
    await this.assertUniqueClient(data.businessName, data.taxId);
    this.assertUniqueDraftSiteNames(sites);

    const clientRef = doc(collection(this.firestore, 'clients'));
    const batch = writeBatch(this.firestore);
    batch.set(clientRef, {
      ...data,
      businessNameNormalized: normalizeUniqueName(data.businessName),
      taxIdNormalized: normalizeTaxId(data.taxId),
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp(),
      updatedBy: createdBy,
    });

    for (const site of sites) {
      const siteRef = doc(collection(clientRef, 'sites'));
      batch.set(siteRef, {
        ...site,
        nameNormalized: normalizeUniqueName(site.name),
        createdAt: serverTimestamp(),
        createdBy,
        updatedAt: serverTimestamp(),
        updatedBy: createdBy,
      });
    }

    await batch.commit();
    return clientRef.id;
  }

  async updateClient(id: string, changes: Partial<NewClient>, updatedBy: string): Promise<void> {
    if (changes.businessName !== undefined || changes.taxId !== undefined) {
      const currentSnapshot = await getDoc(doc(this.firestore, 'clients', id));
      const current = currentSnapshot.data();
      await this.assertUniqueClient(
        changes.businessName ?? current?.['businessName'] ?? '',
        changes.taxId ?? current?.['taxId'] ?? '',
        id,
      );
    }
    await updateDoc(doc(this.firestore, 'clients', id), {
      ...changes,
      ...(changes.businessName !== undefined && {
        businessNameNormalized: normalizeUniqueName(changes.businessName),
      }),
      ...(changes.taxId !== undefined && { taxIdNormalized: normalizeTaxId(changes.taxId) }),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  async deleteClient(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'clients', id));
  }

  /**
   * `arrayUnion`/`arrayRemove` en vez de escribir el arreglo completo: dos
   * toggles seguidos (p. ej. el usuario clickea dos etiquetas rápido) no
   * deben pisarse entre sí si el primer `updateDoc` todavía no volvió por
   * el listener — cada operación es atómica del lado de Firestore, no
   * depende del estado `tags` que tenga el cliente en el momento del click.
   */
  async setTag(id: string, tag: string, enabled: boolean, updatedBy: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'clients', id), {
      tags: enabled ? arrayUnion(tag) : arrayRemove(tag),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  watchContacts(clientId: string): Observable<ClientContact[]> {
    return new Observable<ClientContact[]>((subscriber) => {
      return onSnapshot(
        collection(this.firestore, 'clients', clientId, 'contacts'),
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) => toClientContact(docSnapshot.id, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    });
  }

  async addContact(clientId: string, contact: NewClientContact): Promise<void> {
    await addDoc(collection(this.firestore, 'clients', clientId, 'contacts'), contact);
  }

  watchSites(clientId: string): Observable<ClientSite[]> {
    return new Observable<ClientSite[]>((subscriber) => {
      return onSnapshot(
        collection(this.firestore, 'clients', clientId, 'sites'),
        (snapshot) => {
          const sites = snapshot.docs
            .map((docSnapshot) => toClientSite(docSnapshot.id, docSnapshot.data()))
            .sort((left, right) => {
              if (left.status !== right.status) {
                return left.status === 'ACTIVE' ? -1 : 1;
              }
              return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' });
            });
          subscriber.next(sites);
        },
        (error) => subscriber.error(error),
      );
    });
  }

  async addSite(clientId: string, site: NewClientSite, createdBy: string): Promise<string> {
    await this.assertUniqueSiteName(clientId, site.name);
    const ref = await addDoc(collection(this.firestore, 'clients', clientId, 'sites'), {
      ...site,
      nameNormalized: normalizeUniqueName(site.name),
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp(),
      updatedBy: createdBy,
    });
    return ref.id;
  }

  async updateSite(
    clientId: string,
    siteId: string,
    changes: Partial<NewClientSite>,
    updatedBy: string,
  ): Promise<void> {
    if (changes.name !== undefined) {
      await this.assertUniqueSiteName(clientId, changes.name, siteId);
    }
    await updateDoc(doc(this.firestore, 'clients', clientId, 'sites', siteId), {
      ...changes,
      ...(changes.name !== undefined && { nameNormalized: normalizeUniqueName(changes.name) }),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  async deleteSite(clientId: string, siteId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'clients', clientId, 'sites', siteId));
  }

  private async assertUniqueClient(
    businessName: string,
    taxId: string,
    currentId?: string,
  ): Promise<void> {
    const normalizedName = normalizeUniqueName(businessName);
    const normalizedTaxId = normalizeTaxId(taxId);
    const snapshot = await getDocs(collection(this.firestore, 'clients'));
    for (const client of snapshot.docs) {
      if (client.id === currentId) continue;
      const data = client.data();
      if (normalizeTaxId(data['taxId'] ?? '') === normalizedTaxId) {
        throw new Error('Ya existe un cliente con ese NIT.');
      }
      if (normalizeUniqueName(data['businessName'] ?? '') === normalizedName) {
        throw new Error('Ya existe un cliente con esa razón social.');
      }
    }
  }

  private async assertUniqueSiteName(
    clientId: string,
    name: string,
    currentSiteId?: string,
  ): Promise<void> {
    const normalizedName = normalizeUniqueName(name);
    const snapshot = await getDocs(collection(this.firestore, 'clients', clientId, 'sites'));
    for (const site of snapshot.docs) {
      if (site.id === currentSiteId) continue;
      if (normalizeUniqueName(site.data()['name'] ?? '') === normalizedName) {
        throw new Error('Ya existe una sede con ese nombre para este cliente.');
      }
    }
  }

  private assertUniqueDraftSiteNames(sites: NewClientSite[]): void {
    const names = new Set<string>();
    for (const site of sites) {
      const normalizedName = normalizeUniqueName(site.name);
      if (names.has(normalizedName)) {
        throw new Error('No puedes registrar dos sedes con el mismo nombre.');
      }
      names.add(normalizedName);
    }
  }
}
