export type ClientStatus = 'ACTIVE' | 'INACTIVE';

export type ClientTagKey = 'FAVORITO' | 'RECURRENTE' | 'CONTRATO_MARCO' | 'NUEVO' | 'ALTO_RIESGO';

export interface ClientTagConfig {
  label: string;
  color: string;
}

// Paleta fija (no administrable desde la UI todavía), pensada para una
// empresa de servicios HSEQ B2B (no e-commerce): clasifica la relación
// comercial y el perfil de riesgo del cliente, no su historial de compras.
export const CLIENT_TAG_CONFIG: Record<ClientTagKey, ClientTagConfig> = {
  FAVORITO: { label: 'Favorito', color: '#f59e0b' },
  RECURRENTE: { label: 'Recurrente', color: '#2563eb' },
  CONTRATO_MARCO: { label: 'Contrato Marco', color: '#7c3aed' },
  NUEVO: { label: 'Cliente Nuevo', color: '#16a34a' },
  ALTO_RIESGO: { label: 'Alto Riesgo', color: '#dc2626' },
};

export const CLIENT_TAG_KEYS: ClientTagKey[] = Object.keys(CLIENT_TAG_CONFIG) as ClientTagKey[];

/** Modelo de dominio de la colección `clients` (CLAUDE.md §9.3). */
export interface Client {
  id: string;
  businessName: string;
  legalName?: string;
  taxId: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
  status: ClientStatus;
  tags: ClientTagKey[];
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

export type NewClient = Pick<
  Client,
  'businessName' | 'legalName' | 'taxId' | 'email' | 'phone' | 'address' | 'city' | 'notes' | 'status'
>;

export type NewClientContact = Omit<ClientContact, 'id'>;
