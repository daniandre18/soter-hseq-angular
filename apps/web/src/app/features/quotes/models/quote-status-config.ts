import type { QuoteStatus } from './quote.model';

export interface QuoteStatusConfig {
  label: string;
  color: string;
}

export const QUOTE_STATUS_CONFIG: Record<QuoteStatus, QuoteStatusConfig> = {
  DRAFT: { label: 'Borrador', color: 'gray' },
  SENT: { label: 'Enviada', color: 'blue' },
  APPROVED: { label: 'Aprobada', color: 'green' },
  REJECTED: { label: 'Rechazada', color: 'red' },
  EXPIRED: { label: 'Vencida', color: 'orange' },
  CONVERTED: { label: 'Convertida', color: 'purple' },
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
