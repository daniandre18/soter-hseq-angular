import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { QuotesQuery } from '../state/quotes.query';
import { QuotesService } from '../state/quotes.service';
import { AuthFacade } from '../../auth/facades/auth.facade';
import { QUOTE_STATUS_CONFIG } from '../models/quote-status-config';
import type { NewQuote, NewQuoteItem, QuoteItem, QuoteStatus } from '../models/quote.model';
import type { BarListItem } from '../../../shared/components/bar-list/bar-list';

@Injectable({ providedIn: 'root' })
export class QuotesFacade {
  private readonly query = inject(QuotesQuery);
  private readonly service = inject(QuotesService);
  private readonly authFacade = inject(AuthFacade);

  readonly quotes = toSignal(this.query.quotes$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });
  readonly error = toSignal(this.query.error$, { initialValue: null });
  readonly canManageQuotes = computed(() => {
    const role = this.authFacade.currentRole();
    return role === 'ADMIN' || role === 'COMMERCIAL';
  });
  readonly canEditDraftQuotes = computed(() => {
    const role = this.authFacade.currentRole();
    return role === 'ADMIN' || role === 'COMMERCIAL';
  });

  /** Para el widget "Cotizaciones por estado" del dashboard. */
  readonly statusBreakdown = computed<BarListItem[]>(() => {
    const counts = new Map<QuoteStatus, number>();
    for (const quote of this.quotes()) {
      counts.set(quote.status, (counts.get(quote.status) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([status, value]) => ({
      key: status,
      label: QUOTE_STATUS_CONFIG[status].translationKey,
      value,
      color: QUOTE_STATUS_CONFIG[status].hex,
    }));
  });

  init(): void {
    // El guard puede resolver su propia lectura de perfil una fracción antes
    // de que `currentUser` publique en el Signal. Esperar explícitamente evita
    // que un VIEWER abra por accidente una consulta global que Rules rechaza.
    this.authFacade.resolveCurrentUser$().subscribe((user) => {
      this.service.watchQuotes(
        user?.role === 'VIEWER' ? (user.clientId ?? '__without-client__') : undefined,
      );
    });
  }

  watchItems(quoteId: string): Observable<QuoteItem[]> {
    return this.service.watchItems(quoteId);
  }

  async addQuote(data: NewQuote, items: NewQuoteItem[]): Promise<string> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    return this.service.addQuote(data, items, userId);
  }

  async updateDraft(quoteId: string, data: NewQuote, items: NewQuoteItem[]): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.updateDraft(quoteId, data, items, userId);
  }

  async deleteDraft(quoteId: string): Promise<void> {
    await this.service.deleteDraft(quoteId);
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
