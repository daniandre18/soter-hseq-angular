export type NoteType = 'GENERAL' | 'FINDING' | 'ACTIVITY' | 'RECOMMENDATION';

/** Modelo de dominio de la subcolección `orders/{orderId}/notes` (CLAUDE.md §9.7). */
export interface TechnicalNote {
  id: string;
  orderId: string;
  content: string;
  noteType: NoteType;
  createdAt: Date;
  createdBy: string;
}

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  GENERAL: 'General',
  FINDING: 'Hallazgo',
  ACTIVITY: 'Actividad',
  RECOMMENDATION: 'Recomendación',
};
