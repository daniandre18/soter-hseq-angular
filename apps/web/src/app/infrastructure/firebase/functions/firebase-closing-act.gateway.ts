import { Injectable, inject } from '@angular/core';
import { doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { ClosingActGateway } from '../../../features/orders/domain/closing-act.gateway';
import { FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS } from '../firebase.tokens';

interface GenerateClosingActResponse {
  closingActId: string;
}

interface CloseOrderResponse {
  pdfPath: string;
  pdfUrl: string;
}

/**
 * Adapter de `ClosingActGateway` sobre las Cloud Functions callables
 * `generateClosingAct`/`closeOrder` (Admin SDK — ver `functions/src/index.ts`).
 */
@Injectable({ providedIn: 'root' })
export class FirebaseClosingActGateway implements ClosingActGateway {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async generateDraft(orderId: string, notes: string): Promise<void> {
    const generateClosingAct = httpsCallable<
      { orderId: string; notes: string },
      GenerateClosingActResponse
    >(this.functions, 'generateClosingAct');

    const { data } = await generateClosingAct({ orderId, notes });

    const orderRef = doc(this.firestore, 'orders', orderId);
    await updateDoc(orderRef, {
      technicalNotes: notes,
      closingActId: data.closingActId,
      status: 'UNDER_REVIEW',
    });
  }

  async closeOrder(orderId: string, actId: string): Promise<string> {
    const closeOrder = httpsCallable<{ orderId: string; actId: string }, CloseOrderResponse>(
      this.functions,
      'closeOrder',
    );
    const { data } = await closeOrder({ orderId, actId });
    return data.pdfUrl;
  }
}
