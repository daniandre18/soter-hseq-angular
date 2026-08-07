import type { OrderStatus } from './order.model';

export interface OrderStatusConfig {
  translationKey: `orders.status.${string}`;
  /** Nombre de color usado para las clases `.status-badge--<color>`. */
  color: string;
  /** Mismo color en hex, para contextos que no pueden usar CSS (fill de SVG). */
  hex: string;
  /** Progreso aproximado (0-100) para la barra de progreso de "Órdenes recientes". */
  progress: number;
}

// Colores alineados con soter-hseq/src/lib/utils.ts (ORDER_STATUS_CONFIG),
// extendidos a los 10 estados de CLAUDE.md §9.5.
export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  DRAFT: { translationKey: 'orders.status.draft', color: 'gray', hex: '#6b7280', progress: 0 },
  SCHEDULED: { translationKey: 'orders.status.scheduled', color: 'teal', hex: '#0d9488', progress: 10 },
  ASSIGNED: { translationKey: 'orders.status.assigned', color: 'blue', hex: '#2563eb', progress: 20 },
  IN_PROGRESS: { translationKey: 'orders.status.inProgress', color: 'amber', hex: '#b45309', progress: 50 },
  EVIDENCE_PENDING: { translationKey: 'orders.status.evidencePending', color: 'orange', hex: '#ea580c', progress: 65 },
  UNDER_REVIEW: { translationKey: 'orders.status.underReview', color: 'purple', hex: '#9333ea', progress: 80 },
  CORRECTION_REQUIRED: { translationKey: 'orders.status.correctionRequired', color: 'red', hex: '#dc2626', progress: 70 },
  APPROVED: { translationKey: 'orders.status.approved', color: 'green', hex: '#16a34a', progress: 95 },
  CLOSED: { translationKey: 'orders.status.closed', color: 'indigo', hex: '#4f46e5', progress: 100 },
  CANCELLED: { translationKey: 'orders.status.cancelled', color: 'gray-light', hex: '#9ca3af', progress: 0 },
};
