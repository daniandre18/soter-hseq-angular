import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { QuotesQuery } from '../state/quotes.query';
import { QuotesService } from '../state/quotes.service';
import { AuthFacade } from '../../auth/facades/auth.facade';
import type { NewQuote, NewQuoteItem, QuoteItem, QuoteStatus } from '../models/quote.model';

@Injectable({ providedIn: 'root' })
export class QuotesFacade {
  private readonly query = inject(QuotesQuery);
  private readonly service = inject(QuotesService);
  private readonly authFacade = inject(AuthFacade);

  readonly quotes = toSignal(this.query.quotes$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });
  readonly error = toSignal(this.query.error$, { initialValue: null });

  init(): void {
    this.service.watchQuotes();
  }

  watchItems(quoteId: string): Observable<QuoteItem[]> {
    return this.service.watchItems(quoteId);
  }

  async addQuote(data: NewQuote, items: NewQuoteItem[]): Promise<string> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    return this.service.addQuote(data, items, userId);
  }

  async updateStatus(quoteId: string, status: QuoteStatus): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.updateStatus(quoteId, status, userId);
  }

  async convertToOrder(quoteId: string): Promise<string[]> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    return this.service.convertToOrder(quoteId, userId);
  }
}
