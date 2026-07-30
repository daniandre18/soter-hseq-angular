export type EvidenceType = 'PHOTO' | 'PDF' | 'DOCUMENT' | 'OTHER';
export type EvidenceCategory = 'BEFORE' | 'DURING' | 'AFTER' | 'FINDING' | 'SUPPORTING_DOCUMENT';

/** Modelo de dominio de la subcolección `orders/{orderId}/evidence` (CLAUDE.md §9.6). */
export interface Evidence {
  id: string;
  orderId: string;
  type: EvidenceType;
  category?: EvidenceCategory;
  fileName: string;
  storagePath: string;
  downloadUrl?: string;
  contentType: string;
  size: number;
  description?: string;
  uploadedAt: Date;
  uploadedBy: string;
  status: 'ACTIVE' | 'REMOVED';
}

export const EVIDENCE_CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  BEFORE: 'Antes',
  DURING: 'Durante',
  AFTER: 'Después',
  FINDING: 'Hallazgo',
  SUPPORTING_DOCUMENT: 'Documento de soporte',
};

// Debe coincidir con storage.rules (isValidImage/isValidPdf).
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_PDF_TYPE = 'application/pdf';
