export type ServiceCategory =
  | 'HIGIENE'
  | 'SEGURIDAD'
  | 'AMBIENTAL'
  | 'CALIDAD'
  | 'CAPACITACION'
  | 'INSPECCION';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  HIGIENE: 'Higiene',
  SEGURIDAD: 'Seguridad',
  AMBIENTAL: 'Ambiental',
  CALIDAD: 'Calidad',
  CAPACITACION: 'Capacitación',
  INSPECCION: 'Inspección',
};

export const SERVICE_CATEGORY_KEYS: ServiceCategory[] = Object.keys(
  SERVICE_CATEGORY_LABELS,
) as ServiceCategory[];

/** Catálogo de servicios ofrecidos: los ítems que se seleccionan al armar
 *  una cotización (y, por herencia, lo que termina describiendo la orden
 *  convertida). No definido en CLAUDE.md §9 — modelo nuevo para esta
 *  funcionalidad, con la forma más simple que cubre el caso de uso. */
export interface Service {
  id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  price: number;
  unit: string;
  active: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export type NewService = Pick<Service, 'name' | 'description' | 'category' | 'price' | 'unit' | 'active'>;
