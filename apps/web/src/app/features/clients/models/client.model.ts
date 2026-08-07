export type ClientStatus = 'ACTIVE' | 'INACTIVE';

/** Modelo de dominio de la colección `clients` (CLAUDE.md §9.3). */
export interface Client {
  id: string;
  businessName: string;
  legalName?: string;
  taxId: string;
  email?: string;
  phone?: string;
  address?: string;
  department?: string;
  city?: string;
  notes?: string;
  status: ClientStatus;
  /** `id`s del catálogo administrable `clientTags` (ver `client-tag.model.ts`),
   *  no un enum cerrado — un `id` puede quedar "huérfano" si la etiqueta se
   *  borró después, así que cualquier render debe tolerar un `id` sin match. */
  tags: string[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/** Subcolección `clients/{clientId}/contacts` (CLAUDE.md §9.3). */
export interface ClientContact {
  id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  status: ClientStatus;
}

/** Responsable principal asociado a una sede del cliente. */
export interface ClientSiteResponsible {
  name: string;
  position?: string;
  email?: string;
  phone: string;
}

/** Subcolección `clients/{clientId}/sites`. */
export interface ClientSite {
  id: string;
  name: string;
  address: string;
  department?: string;
  city: string;
  responsible: ClientSiteResponsible;
  status: ClientStatus;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export type NewClient = Pick<
  Client,
  | 'businessName'
  | 'legalName'
  | 'taxId'
  | 'email'
  | 'phone'
  | 'address'
  | 'department'
  | 'city'
  | 'notes'
  | 'status'
>;

export type NewClientContact = Omit<ClientContact, 'id'>;

export type NewClientSite = Pick<
  ClientSite,
  'name' | 'address' | 'department' | 'city' | 'responsible' | 'status'
>;
