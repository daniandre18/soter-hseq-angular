export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
export type QuoteCurrency = 'COP' | 'USD';

/** Modelo de dominio de la colección `quotes` (CLAUDE.md §9.4). */
export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  clientBusinessName: string;
  contactId?: string;
  status: QuoteStatus;
  issueDate: Date;
  validUntil?: Date;
  currency: QuoteCurrency;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  terms?: string;
  orderId?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/** Subcolección `quotes/{quoteId}/items` (CLAUDE.md §9.4). */
export interface QuoteItem {
  id: string;
  serviceCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  total: number;
  position: number;
}

export type NewQuoteItem = Omit<QuoteItem, 'id'>;

export interface NewQuote {
  clientId: string;
  clientBusinessName: string;
  validUntil?: Date;
  currency: QuoteCurrency;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
}
