import { Injectable, inject } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { QUOTE_REPOSITORY } from '../domain/quote.repository';
import { QuotesStore } from './quotes.store';
import type { NewQuote, NewQuoteItem, QuoteItem, QuoteStatus } from '../models/quote.model';

/**
 * Mantiene el QuotesStore de Akita sincronizado con `QuoteRepository`
 * (solo campos de resumen; los ítems viven en la subcolección `items` y se
 * consultan aparte, bajo demanda, en `watchItems`).
 */
@Injectable({ providedIn: 'root' })
export class QuotesService {
  private readonly store = inject(QuotesStore);
  private readonly repository = inject(QUOTE_REPOSITORY);

  private quotesSubscription: Subscription | null = null;
  private quotesRetriedAfterError = false;

  watchQuotes(clientId?: string): void {
    if (this.quotesSubscription) {
      return;
    }

    this.store.setLoading(true);
    this.quotesSubscription = this.repository.watchAll(clientId).subscribe({
      next: (quotes) => {
        this.quotesRetriedAfterError = false;
        this.store.setError(null);
        this.store.set(quotes);
        this.store.setLoading(false);
      },
      error: (error: Error & { code?: string }) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
        // Ver el mismo comentario en OrdersService.watchOrders: sin limpiar
        // el guard, un permission-denied transitorio justo tras el login
        // deja el listener atascado hasta recargar la página.
        this.quotesSubscription = null;
        if (error.code === 'permission-denied' && !this.quotesRetriedAfterError) {
          this.quotesRetriedAfterError = true;
          setTimeout(() => this.watchQuotes(clientId), 1000);
        }
      },
    });
  }

  watchItems(quoteId: string): Observable<QuoteItem[]> {
    return this.repository.watchItems(quoteId);
  }

  async addQuote(data: NewQuote, items: NewQuoteItem[], createdBy: string): Promise<string> {
    return this.repository.addQuote(data, items, createdBy);
  }

  async updateDraft(
    quoteId: string,
    data: NewQuote,
    items: NewQuoteItem[],
    updatedBy: string,
  ): Promise<void> {
    await this.repository.updateDraft(quoteId, data, items, updatedBy);
  }

  async deleteDraft(quoteId: string): Promise<void> {
    await this.repository.deleteDraft(quoteId);
  }

  async updateStatus(quoteId: string, status: QuoteStatus, updatedBy: string): Promise<void> {
    await this.repository.updateStatus(quoteId, status, updatedBy);
  }

  /**
   * Convierte una cotización APPROVED en una orden por cada ítem/servicio
   * (CLAUDE.md §11.3) — no en una sola orden colapsada: cada servicio se
   * ejecuta y rastrea de forma independiente (su propio estado, técnico,
   * evidencia y acta). Idempotente: la implementación verifica dentro de la
   * misma transacción que la cotización siga aprobada y sin `orderIds`
   * antes de escribir.
   */
  async convertToOrder(quoteId: string, userId: string): Promise<string[]> {
    return this.repository.convertToOrder(quoteId, userId);
  }
}
