import { Injectable } from '@angular/core';
import type {
  EvidenceUploadGateway,
  UploadEvidenceInput,
} from '../../../features/orders/domain/evidence-upload.gateway';
import type { EvidenceCategory } from '../../../features/orders/models/evidence.model';
import { environment } from '../../../../environments/environment';
import { firebaseCallable } from './firebase-callable';

/** Lee un `File` como base64 puro (sin el prefijo `data:...;base64,`) para
 *  enviarlo en el payload de la Callable Function `uploadEvidence`. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

interface UploadEvidenceRequest {
  orderId: string;
  fileName: string;
  contentType: string;
  fileBase64: string;
  category?: EvidenceCategory;
  description?: string;
}

interface UploadEvidenceResponse {
  evidenceId: string;
  downloadUrl: string;
}

/**
 * Adapter de `EvidenceUploadGateway` sobre la Cloud Function callable
 * `uploadEvidence` (Admin SDK — ver `functions/src/index.ts` y el
 * comentario junto a `EvidenceUploadGateway` sobre por qué no se sube
 * directo a Storage desde el cliente).
 */
@Injectable({ providedIn: 'root' })
export class FirebaseEvidenceUploadGateway implements EvidenceUploadGateway {
  async upload(input: UploadEvidenceInput): Promise<string> {
    if (!environment.evidenceUploadsEnabled) {
      throw new Error('La carga de evidencias está deshabilitada en el demo gratuito.');
    }
    input.onProgress?.(10);
    const fileBase64 = await fileToBase64(input.file);
    input.onProgress?.(60);

    const uploadEvidenceFn = await firebaseCallable<
      UploadEvidenceRequest,
      UploadEvidenceResponse
    >('uploadEvidence');

    const { data } = await uploadEvidenceFn({
      orderId: input.orderId,
      fileName: input.file.name,
      contentType: input.file.type,
      fileBase64,
      category: input.category,
      description: input.description,
    });
    input.onProgress?.(100);
    return data.evidenceId;
  }
}
