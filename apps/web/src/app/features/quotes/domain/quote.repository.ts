import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { NewQuote, NewQuoteItem, Quote, QuoteItem, QuoteStatus } from '../models/quote.model';

/**
 * Puerto de acceso a cotizaciones y sus ítems. `QuotesService` (la capa de
 * sincronización con el store de Akita) depende únicamente de este
 * contrato; `FirebaseQuoteRepository` es hoy su único adapter.
 */
export interface QuoteRepository {
  watchAll(clientId?: string): Observable<Quote[]>;
  watchItems(quoteId: string): Observable<QuoteItem[]>;
  addQuote(data: NewQuote, items: NewQuoteItem[], createdBy: string): Promise<string>;
  /** Solo permitido mientras la cotización sigue en `DRAFT` (ver Rules). */
  updateDraft(quoteId: string, data: NewQuote, items: NewQuoteItem[], updatedBy: string): Promise<void>;
  deleteDraft(quoteId: string): Promise<void>;
  updateStatus(quoteId: string, status: QuoteStatus, updatedBy: string): Promise<void>;
  /**
   * Convierte una cotización APPROVED en una orden por cada ítem/servicio
   * (CLAUDE.md §11.3). Idempotente: la implementación verifica dentro de la
   * misma transacción que la cotización siga aprobada y sin `orderIds`
   * antes de escribir. Devuelve los ids de las órdenes creadas.
   */
  convertToOrder(quoteId: string, userId: string): Promise<string[]>;
}

export const QUOTE_REPOSITORY = new InjectionToken<QuoteRepository>('QUOTE_REPOSITORY');
