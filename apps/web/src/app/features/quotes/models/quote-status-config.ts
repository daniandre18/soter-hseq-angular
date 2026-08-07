import type { QuoteStatus } from './quote.model';

export interface QuoteStatusConfig {
  translationKey: `quotes.status.${string}`;
  color: string;
}

export const QUOTE_STATUS_CONFIG: Record<QuoteStatus, QuoteStatusConfig> = {
  DRAFT: { translationKey: 'quotes.status.draft', color: 'gray' },
  SENT: { translationKey: 'quotes.status.sent', color: 'blue' },
  APPROVED: { translationKey: 'quotes.status.approved', color: 'green' },
  REJECTED: { translationKey: 'quotes.status.rejected', color: 'red' },
  EXPIRED: { translationKey: 'quotes.status.expired', color: 'orange' },
  CONVERTED: { translationKey: 'quotes.status.converted', color: 'purple' },
};

// Solo transiciones manuales (CLAUDE.md §10.1); EXPIRED se asume automática
// según `validUntil`, no una acción de usuario.
const QUOTE_TRANSITIONS: Partial<Record<QuoteStatus, QuoteStatus[]>> = {
  DRAFT: ['SENT'],
  SENT: ['APPROVED', 'REJECTED'],
  APPROVED: ['CONVERTED'],
};

/** Próximos estados válidos para una cotización, según su estado actual. */
export function nextQuoteStatuses(status: QuoteStatus): QuoteStatus[] {
  return QUOTE_TRANSITIONS[status] ?? [];
}
