import type { OrderPriority } from './order.model';

export interface OrderPriorityConfig {
  translationKey: `orders.priority.${string}`;
  /** Nombre de color usado para las clases `.status-badge--<color>`. */
  color: string;
}

// Alineado con soter-hseq/src/lib/utils.ts (PRIORITY_CONFIG): gris/azul/naranja/rojo.
export const ORDER_PRIORITY_CONFIG: Record<OrderPriority, OrderPriorityConfig> = {
  LOW: { translationKey: 'orders.priority.low', color: 'gray' },
  MEDIUM: { translationKey: 'orders.priority.medium', color: 'blue' },
  HIGH: { translationKey: 'orders.priority.high', color: 'orange' },
  CRITICAL: { translationKey: 'orders.priority.critical', color: 'red' },
};

export const ORDER_PRIORITY_KEYS: OrderPriority[] = Object.keys(
  ORDER_PRIORITY_CONFIG,
) as OrderPriority[];
