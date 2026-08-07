export type NoteType = 'GENERAL' | 'FINDING' | 'ACTIVITY' | 'RECOMMENDATION' | 'INCIDENT';

/** Modelo de dominio de la subcolección `orders/{orderId}/notes` (CLAUDE.md §9.7). */
export interface TechnicalNote {
  id: string;
  orderId: string;
  content: string;
  noteType: NoteType;
  /** Ids de `orders/{orderId}/evidence` adjuntados al crear la nota (inmutable tras creación). */
  attachmentIds?: string[];
  createdAt: Date;
  createdBy: string;
}

export const NOTE_TYPE_TRANSLATION_KEYS: Record<NoteType, `orders.noteType.${string}`> = {
  GENERAL: 'orders.noteType.general',
  FINDING: 'orders.noteType.finding',
  ACTIVITY: 'orders.noteType.activity',
  RECOMMENDATION: 'orders.noteType.recommendation',
  INCIDENT: 'orders.noteType.incident',
};
