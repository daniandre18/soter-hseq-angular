import { InjectionToken } from '@angular/core';
import type { EvidenceCategory } from '../models/evidence.model';

export interface UploadEvidenceInput {
  orderId: string;
  file: File;
  category?: EvidenceCategory;
  description?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Puerto para subir evidencia. No es un `Repository` de Storage porque no
 * hay acceso directo a Storage desde el cliente: `storage.rules`
 * necesitaría `firestore.get()` para validar rol/asignación/estado de la
 * orden, y esa lectura cruzada Storage→Firestore no es confiable en este
 * proyecto (verificado a mano, falla incluso con un `firestore.exists()`
 * mínimo) — así que la subida completa (archivo + validación + registro
 * de evidencia) ocurre en una Cloud Function con Admin SDK.
 */
export interface EvidenceUploadGateway {
  /** Retorna el id del documento de evidencia creado (p. ej. para
   *  vincularlo desde una nota vía `OrderRepository.addNote`). */
  upload(input: UploadEvidenceInput): Promise<string>;
}

export const EVIDENCE_UPLOAD_GATEWAY = new InjectionToken<EvidenceUploadGateway>(
  'EVIDENCE_UPLOAD_GATEWAY',
);
