import type { Evidence } from './evidence.model';
import type { OrderEvent } from './order-event.model';
import type { TechnicalNote } from './note.model';

export type ActivityFilter = 'all' | 'comments' | 'history';

/**
 * Unión discriminada usada por `OrderActivityFeed` para mezclar notas,
 * evidencia y eventos de auditoría en un solo timeline ordenado por fecha.
 */
export type ActivityItem =
  | {
      kind: 'note';
      id: string;
      createdAt: Date;
      createdBy: string;
      note: TechnicalNote;
      attachments: Evidence[];
    }
  | {
      kind: 'evidence';
      id: string;
      createdAt: Date;
      createdBy: string;
      evidence: Evidence;
    }
  | {
      kind: 'event';
      id: string;
      createdAt: Date;
      createdBy: string;
      event: OrderEvent;
    };
