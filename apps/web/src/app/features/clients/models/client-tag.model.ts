/** Modelo de dominio de la colección `clientTags` — catálogo de etiquetas
 *  administrable desde la UI (a diferencia de la paleta fija que tenía
 *  antes este proyecto). `Client.tags` guarda un arreglo de `id`s de este
 *  catálogo, no un enum cerrado. */
export interface ClientTag {
  id: string;
  label: string;
  color: string;
  createdAt: Date;
  createdBy: string;
}

export type NewClientTag = Pick<ClientTag, 'label' | 'color'>;

// Paleta de colores para el selector al crear una etiqueta — mismo criterio
// visual que la captura de referencia (una grilla de swatches).
export const CLIENT_TAG_COLOR_PALETTE: string[] = [
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
