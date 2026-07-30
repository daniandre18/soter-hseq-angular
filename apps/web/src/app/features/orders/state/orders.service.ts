import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DocumentData,
  Timestamp,
  Unsubscribe,
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase.tokens';
import { environment } from '../../../../environments/environment';
import { OrdersStore } from './orders.store';
import type { ServiceOrder } from '../models/order.model';

interface GenerateClosingActResponse {
  closingActId: string;
}

function toDate(value: Timestamp | undefined): Date | undefined {
  return value ? value.toDate() : undefined;
}

function toServiceOrder(id: string, data: DocumentData): ServiceOrder {
  return {
    id,
    orderNumber: data['orderNumber'],
    quoteId: data['quoteId'],
    clientId: data['clientId'],
    clientBusinessName: data['clientBusinessName'],
    assignedTechnicianIds: data['assignedTechnicianIds'] ?? [],
    coordinatorId: data['coordinatorId'],
    scheduledStart: toDate(data['scheduledStart']),
    scheduledEnd: toDate(data['scheduledEnd']),
    actualStart: toDate(data['actualStart']),
    actualEnd: toDate(data['actualEnd']),
    serviceAddress: data['serviceAddress'],
    city: data['city'],
    status: data['status'],
    serviceSummary: data['serviceSummary'],
    technicalNotes: data['technicalNotes'],
    findings: data['findings'],
    recommendations: data['recommendations'],
    evidenceCount: data['evidenceCount'] ?? 0,
    closingActId: data['closingActId'],
    createdAt: toDate(data['createdAt']) ?? new Date(0),
    createdBy: data['createdBy'],
    updatedAt: toDate(data['updatedAt']) ?? new Date(0),
    updatedBy: data['updatedBy'],
  };
}

/**
 * Mantiene el OrdersStore de Akita sincronizado con la colección `orders`
 * de Firestore y coordina el cierre asistido por IA a través de un
 * endpoint backend (nunca se invoca Gemini directamente desde Angular).
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly store = inject(OrdersStore);
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly http = inject(HttpClient);

  private unsubscribeFromOrders: Unsubscribe | null = null;

  watchOrders(): void {
    if (this.unsubscribeFromOrders) {
      return;
    }

    this.store.setLoading(true);
    const ordersRef = collection(this.firestore, 'orders');

    this.unsubscribeFromOrders = onSnapshot(
      ordersRef,
      (snapshot) => {
        const orders = snapshot.docs.map((docSnapshot) =>
          toServiceOrder(docSnapshot.id, docSnapshot.data()),
        );
        this.store.set(orders);
        this.store.setLoading(false);
      },
      (error) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
      },
    );
  }

  stopWatchingOrders(): void {
    this.unsubscribeFromOrders?.();
    this.unsubscribeFromOrders = null;
  }

  /**
   * Solicita al backend generar el borrador del acta con IA y deja la orden
   * en revisión humana. La IA nunca cierra la orden por sí sola (CLAUDE.md
   * §23.6/§29): el cierre definitivo requiere una aprobación posterior.
   * El Store se actualiza solo mediante el listener de `watchOrders`, no
   * aquí, para mantener una única fuente de verdad.
   */
  async generateClosingActDraft(orderId: string, notes: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<GenerateClosingActResponse>(
        `${environment.functionsBaseUrl}/generateClosingAct`,
        { orderId, notes },
      ),
    );

    const orderRef = doc(this.firestore, 'orders', orderId);
    await updateDoc(orderRef, {
      technicalNotes: notes,
      closingActId: response.closingActId,
      status: 'UNDER_REVIEW',
    });
  }
}
