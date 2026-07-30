import type { OrderPriority } from './order.model';

export interface OrderPriorityConfig {
  label: string;
  /** Nombre de color usado para las clases `.status-badge--<color>`. */
  color: string;
}

// Alineado con soter-hseq/src/lib/utils.ts (PRIORITY_CONFIG): gris/azul/naranja/rojo.
export const ORDER_PRIORITY_CONFIG: Record<OrderPriority, OrderPriorityConfig> = {
  LOW: { label: 'Baja', color: 'gray' },
  MEDIUM: { label: 'Media', color: 'blue' },
  HIGH: { label: 'Alta', color: 'orange' },
  CRITICAL: { label: 'Crítica', color: 'red' },
};

export const ORDER_PRIORITY_KEYS: OrderPriority[] = Object.keys(
  ORDER_PRIORITY_CONFIG,
) as OrderPriority[];
