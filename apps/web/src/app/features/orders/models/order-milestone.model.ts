import type { OrderEvent } from './order-event.model';
import type { OrderStatus, ServiceOrder } from './order.model';

export type MilestoneState = 'done' | 'current' | 'pending';

export interface OrderMilestone {
  key: string;
  translationKey: `orders.milestones.${string}`;
  state: MilestoneState;
  at?: Date;
}

/** Posición (0-4) del estado de la orden en el ciclo de vida genérico de
 *  ejecución. `IN_PROGRESS`/`EVIDENCE_PENDING`/`CORRECTION_REQUIRED`
 *  comparten índice: las tres son "en progreso" a efectos del timeline
 *  (una corrección solicitada es la orden de vuelta a campo, no una etapa
 *  nueva). `DRAFT`/`SCHEDULED`/`CANCELLED` no tienen entrada — todavía no
 *  llegan a ningún hito, o el ciclo se interrumpió. */
const STAGE_INDEX_BY_STATUS: Partial<Record<OrderStatus, number>> = {
  ASSIGNED: 0,
  IN_PROGRESS: 2,
  EVIDENCE_PENDING: 2,
  CORRECTION_REQUIRED: 2,
  UNDER_REVIEW: 3,
  APPROVED: 4,
  CLOSED: 4,
};

function earliestEventAt(events: OrderEvent[], predicate: (event: OrderEvent) => boolean): Date | undefined {
  const matches = events.filter(predicate).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return matches[0]?.createdAt;
}

function latestEventAt(events: OrderEvent[], predicate: (event: OrderEvent) => boolean): Date | undefined {
  const matches = events.filter(predicate).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return matches[0]?.createdAt;
}

/**
 * Deriva un timeline de 5 hitos genéricos del ciclo de vida de la orden a
 * partir de datos reales (`status`, `actualStart`/`actualEnd`, y el
 * historial de `OrderEvent` ya auditado por el backend) — no una lista de
 * pasos inventada por tipo de servicio, que esta plataforma no modela
 * (CLAUDE.md §9.5: servicios genéricos, no checklists fijos).
 */
export function deriveOrderMilestones(order: ServiceOrder, events: OrderEvent[]): OrderMilestone[] {
  const stageIndex =
    STAGE_INDEX_BY_STATUS[order.status] ??
    (order.status === 'CANCELLED'
      ? (order.actualStart ? 2 : order.assignedTechnicianIds.length > 0 ? 0 : -1)
      : -1);
  const reachedFinal = order.status === 'CLOSED';
  const isCancelled = order.status === 'CANCELLED';

  const stateFor = (stage: number): MilestoneState => {
    if (isCancelled) {
      return stage <= stageIndex ? 'done' : 'pending';
    }
    if (stage < stageIndex || (stage === 4 && reachedFinal)) {
      return 'done';
    }
    return stage === stageIndex ? 'current' : 'pending';
  };

  return [
    {
      key: 'assigned',
      translationKey: 'orders.milestones.assigned',
      state: stateFor(0),
      at: earliestEventAt(events, (event) => event.action === 'ORDER_ASSIGNED') ?? order.createdAt,
    },
    {
      key: 'executionStarted',
      translationKey: 'orders.milestones.executionStarted',
      state: stateFor(1),
      at: order.actualStart,
    },
    {
      key: 'inProgress',
      translationKey: 'orders.milestones.inProgress',
      state: stateFor(2),
    },
    {
      key: 'underReview',
      translationKey: 'orders.milestones.underReview',
      state: stateFor(3),
      at: order.actualEnd,
    },
    {
      key: 'closed',
      translationKey: 'orders.milestones.closed',
      state: stateFor(4),
      at: latestEventAt(
        events,
        (event) => event.action === 'ORDER_STATUS_CHANGED' && event.metadata?.['to'] === 'CLOSED',
      ),
    },
  ];
}
