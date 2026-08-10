import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { QuotesQuery } from '../state/quotes.query';
import { QuotesService } from '../state/quotes.service';
import { AuthFacade } from '../../auth/facades/auth.facade';
import { QUOTE_STATUS_CONFIG } from '../models/quote-status-config';
import type { NewQuote, NewQuoteItem, Quote, QuoteItem, QuoteStatus } from '../models/quote.model';
import type { BarListItem } from '../../../shared/components/bar-list/bar-list';
import type { ReleaseListener } from '../../../shared/utils/reference-counted-listener';

export interface QuoteFunnelCounts {
  sent: number;
  approved: number;
  converted: number;
}

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

  /** Permiso acotado del portal cliente: solo puede aprobar una cotización
   *  enviada y asociada a su propia empresa. Las Rules repiten esta validación
   *  para que no dependa únicamente de la interfaz. */
  canApproveQuote(quote: Quote | null): boolean {
    const user = this.authFacade.currentUser();
    return (
      user?.role === 'VIEWER' &&
      !!user.clientId &&
      quote?.status === 'SENT' &&
      quote.clientId === user.clientId
    );
  }

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

  readonly convertedCount = computed(
    () => this.quotes().filter((quote) => quote.status === 'CONVERTED').length,
  );

  /** Para el KPI "Conversión Comercial" del dashboard: % de cotizaciones
   *  que terminaron convertidas en orden, sobre el total registrado. */
  readonly conversionRate = computed(() => {
    const total = this.quotes().length;
    if (total === 0) {
      return 0;
    }
    return Math.round((this.convertedCount() / total) * 100);
  });

  /** Para el widget "Embudo Comercial": cada etapa cuenta las cotizaciones
   *  que llegaron *al menos* hasta ahí, no solo las que están hoy en ese
   *  estado exacto — por eso `sent` incluye cualquier estado distinto de
   *  `DRAFT` (incluidas rechazadas/expiradas) y `approved` incluye las ya
   *  convertidas, para que las barras nunca crezcan de una etapa a la
   *  siguiente. */
  readonly funnelCounts = computed<QuoteFunnelCounts>(() => {
    const quotes = this.quotes();
    return {
      sent: quotes.filter((quote) => quote.status !== 'DRAFT').length,
      approved: quotes.filter((quote) => quote.status === 'APPROVED' || quote.status === 'CONVERTED')
        .length,
      converted: quotes.filter((quote) => quote.status === 'CONVERTED').length,
    };
  });

  init(): ReleaseListener {
    // El guard puede resolver su propia lectura de perfil una fracción antes
    // de que `currentUser` publique en el Signal. Esperar explícitamente evita
    // que un VIEWER abra por accidente una consulta global que Rules rechaza.
    let releaseListener: ReleaseListener | null = null;
    let released = false;
    const authSubscription = this.authFacade.resolveCurrentUser$().subscribe((user) => {
      if (released) {
        return;
      }
      releaseListener = this.service.watchQuotes(
        user?.role === 'VIEWER' ? (user.clientId ?? '__without-client__') : undefined,
      );
    });
    return () => {
      released = true;
      authSubscription.unsubscribe();
      releaseListener?.();
    };
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
