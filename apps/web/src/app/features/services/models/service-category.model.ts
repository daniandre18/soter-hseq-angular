/** Modelo de dominio de la colección `serviceCategories` — catálogo
 *  administrable que reemplaza el enum fijo que tenía antes este proyecto
 *  (HIGIENE/SEGURIDAD/AMBIENTAL/CALIDAD/CAPACITACION/INSPECCION). Un
 *  `Service.category` guarda el `id` de una de estas, no un valor cerrado. */
export interface ServiceCategory {
  id: string;
  label: string;
  icon?: string;
  color: string;
  createdAt: Date;
  createdBy: string;
}

export type NewServiceCategory = Pick<ServiceCategory, 'label' | 'icon' | 'color'>;

// Misma paleta que `client-tag.model.ts` (consistencia visual entre los
// dos catálogos administrables de la app).
export const SERVICE_CATEGORY_COLOR_PALETTE: string[] = [
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#ef4444',
  '#ec4899',
  '#f97316',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
  '#a855f7',
  '#0ea5e9',
  '#64748b',
];

// Emojis curados para el contexto HSEQ (no el set genérico de e-commerce
// de la referencia) — opcional, puramente decorativo.
export const SERVICE_CATEGORY_ICON_OPTIONS: string[] = [
  '🦺',
  '🧯',
  '⚠️',
  '🌿',
  '♻️',
  '🩺',
  '🔍',
  '✅',
  '🎓',
  '📋',
  '🛡️',
  '🔥',
  '💧',
  '⚡',
];
