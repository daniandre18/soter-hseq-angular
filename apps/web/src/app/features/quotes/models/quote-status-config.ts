import type { QuoteStatus } from './quote.model';

export interface QuoteStatusConfig {
  translationKey: `quotes.status.${string}`;
  /** Nombre de color usado por `StatusBadge` (clases `.status-badge--<color>`). */
  color: string;
  /** Mismo color en hex, para contextos que no pueden usar CSS (charts). */
  hex: string;
}

export const QUOTE_STATUS_CONFIG: Record<QuoteStatus, QuoteStatusConfig> = {
  DRAFT: { translationKey: 'quotes.status.draft', color: 'gray', hex: '#6b7280' },
  SENT: { translationKey: 'quotes.status.sent', color: 'blue', hex: '#2563eb' },
  APPROVED: { translationKey: 'quotes.status.approved', color: 'green', hex: '#16a34a' },
  REJECTED: { translationKey: 'quotes.status.rejected', color: 'red', hex: '#dc2626' },
  EXPIRED: { translationKey: 'quotes.status.expired', color: 'orange', hex: '#ea580c' },
  CONVERTED: { translationKey: 'quotes.status.converted', color: 'purple', hex: '#9333ea' },
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
