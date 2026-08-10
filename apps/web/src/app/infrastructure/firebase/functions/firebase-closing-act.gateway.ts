import { Injectable } from '@angular/core';
import type { ClosingActGateway } from '../../../features/orders/domain/closing-act.gateway';
import type {
  ClientActDecisionInput,
  ClosingActContent,
} from '../../../features/orders/models/closing-act.model';
import { environment } from '../../../../environments/environment';
import { firebaseCallable } from './firebase-callable';

interface GenerateClosingActResponse {
  closingActId: string;
}

interface CloseOrderResponse {
  pdfPath: string;
  pdfUrl: string;
}

interface ClosingActMutationResponse {
  closingActId: string;
}

interface ClientActDecisionResponse {
  decision: 'ACCEPTED' | 'CHANGES_REQUESTED';
  pdfUrl?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el acta.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Adapter de `ClosingActGateway` sobre las Cloud Functions callables
 * `generateClosingAct`/`closeOrder` (Admin SDK — ver `functions/src/index.ts`).
 */
@Injectable({ providedIn: 'root' })
export class FirebaseClosingActGateway implements ClosingActGateway {
  async generateDraft(orderId: string, notes: string): Promise<void> {
    const generateClosingAct = await firebaseCallable<
      { orderId: string; notes: string },
      GenerateClosingActResponse
    >('generateClosingAct');

    await generateClosingAct({ orderId, notes });
  }

  async createManualDraft(orderId: string, content: ClosingActContent): Promise<void> {
    const createClosingAct = await firebaseCallable<
      { orderId: string; content: ClosingActContent },
      ClosingActMutationResponse
    >('createClosingAct');
    await createClosingAct({ orderId, content });
  }

  async uploadDraft(
    orderId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    if (!environment.evidenceUploadsEnabled) {
      throw new Error('La carga de archivos está deshabilitada en este entorno.');
    }
    onProgress?.(10);
    const fileBase64 = await fileToBase64(file);
    onProgress?.(60);
    const uploadClosingAct = await firebaseCallable<
      {
        orderId: string;
        fileName: string;
        contentType: string;
        fileBase64: string;
      },
      ClosingActMutationResponse
    >('uploadClosingAct');
    await uploadClosingAct({
      orderId,
      fileName: file.name,
      contentType: file.type || 'application/pdf',
      fileBase64,
    });
    onProgress?.(100);
  }

  async reviewAsClient(
    orderId: string,
    actId: string,
    input: ClientActDecisionInput,
  ): Promise<string | undefined> {
    const reviewClosingActAsClient = await firebaseCallable<
      { orderId: string; actId: string } & ClientActDecisionInput,
      ClientActDecisionResponse
    >('reviewClosingActAsClient');
    const { data } = await reviewClosingActAsClient({ orderId, actId, ...input });
    return data.pdfUrl;
  }

  async closeOrder(orderId: string, actId: string): Promise<string> {
    const closeOrder = await firebaseCallable<
      { orderId: string; actId: string },
      CloseOrderResponse
    >('closeOrder');
    const { data } = await closeOrder({ orderId, actId });
    return data.pdfUrl;
  }
}
