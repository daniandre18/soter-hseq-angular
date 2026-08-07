import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Client,
  ClientContact,
  ClientSite,
  NewClient,
  NewClientContact,
  NewClientSite,
} from '../models/client.model';

/**
 * Puerto de acceso a clientes, sus contactos y sedes. `ClientsService`
 * (la capa de sincronización con el store de Akita) depende únicamente de
 * este contrato; `FirebaseClientRepository` es hoy su único adapter.
 */
export interface ClientRepository {
  watchAll(): Observable<Client[]>;
  addClient(data: NewClient, createdBy: string): Promise<string>;
  addClientWithSites(data: NewClient, sites: NewClientSite[], createdBy: string): Promise<string>;
  updateClient(id: string, changes: Partial<NewClient>, updatedBy: string): Promise<void>;
  /** Solo ADMIN (ver `firestore.rules`). Las cotizaciones/órdenes ya
   *  creadas guardan `clientBusinessName` por su cuenta, así que no quedan
   *  rotas visualmente — solo se pierde la ficha viva del cliente. */
  deleteClient(id: string): Promise<void>;
  setTag(id: string, tag: string, enabled: boolean, updatedBy: string): Promise<void>;

  watchContacts(clientId: string): Observable<ClientContact[]>;
  addContact(clientId: string, contact: NewClientContact): Promise<void>;

  watchSites(clientId: string): Observable<ClientSite[]>;
  addSite(clientId: string, site: NewClientSite, createdBy: string): Promise<string>;
  updateSite(
    clientId: string,
    siteId: string,
    changes: Partial<NewClientSite>,
    updatedBy: string,
  ): Promise<void>;
  deleteSite(clientId: string, siteId: string): Promise<void>;
}

export const CLIENT_REPOSITORY = new InjectionToken<ClientRepository>('CLIENT_REPOSITORY');
