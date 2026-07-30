import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  Timestamp,
  Unsubscribe,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import { OrdersStore } from './orders.store';
import type { OrderStatus, ServiceOrder } from '../models/order.model';

interface GenerateClosingActResponse {
  closingActId: string;
}

type OrderUpdate = Partial<
  Pick<
    ServiceOrder,
    'scheduledStart' | 'scheduledEnd' | 'assignedTechnicianIds' | 'status' | 'actualStart' | 'actualEnd'
  >
>;

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
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  private unsubscribeFromOrders: Unsubscribe | null = null;

  /**
   * Para un técnico, Firestore Rules exige `resource.data.assignedTechnicianIds`
   * (CLAUDE.md §13.2), y una consulta de colección sin `where` que coincida
   * con esa condición se rechaza por completo (no se filtra por documento):
   * por eso el listener debe acotarse con `array-contains` para ese rol, a
   * diferencia de ADMIN/COORDINATOR/COMMERCIAL, cuya regla no depende de
   * `resource.data` y sí admite un listener sin filtro.
   */
  watchOrders(technicianUid?: string): void {
    if (this.unsubscribeFromOrders) {
      return;
    }

    this.store.setLoading(true);
    const ordersRef = collection(this.firestore, 'orders');
    const ordersQuery = technicianUid
      ? query(ordersRef, where('assignedTechnicianIds', 'array-contains', technicianUid))
      : ordersRef;

    this.unsubscribeFromOrders = onSnapshot(
      ordersQuery,
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
   * Programa la visita. Si la orden todavía está en borrador, programar la
   * fecha es lo que la hace pasar a `SCHEDULED` (CLAUDE.md §10.2).
   */
  async schedule(
    orderId: string,
    scheduledStart: Date,
    scheduledEnd: Date,
    updatedBy: string,
  ): Promise<void> {
    const current = this.store.getValue().entities?.[orderId];
    const status: OrderStatus | undefined = current?.status === 'DRAFT' ? 'SCHEDULED' : undefined;
    await this.updateOrder(orderId, { scheduledStart, scheduledEnd, ...(status && { status }) }, updatedBy);
  }

  /**
   * Asigna (o reasigna) los técnicos de campo. La primera asignación sobre
   * una orden programada es lo que la hace pasar a `ASSIGNED`; reasignar una
   * orden ya asignada no cambia su estado (CLAUDE.md §10.2).
   */
  async assignTechnicians(
    orderId: string,
    technicianIds: string[],
    updatedBy: string,
  ): Promise<void> {
    const current = this.store.getValue().entities?.[orderId];
    const status: OrderStatus | undefined =
      current?.status === 'SCHEDULED' && technicianIds.length > 0 ? 'ASSIGNED' : undefined;
    await this.updateOrder(
      orderId,
      { assignedTechnicianIds: technicianIds, ...(status && { status }) },
      updatedBy,
    );
  }

  /**
   * Transición genérica de estado (CLAUDE.md §10.2). Al iniciar ejecución se
   * registra la marca de tiempo real de inicio.
   */
  async updateStatus(orderId: string, status: OrderStatus, updatedBy: string): Promise<void> {
    const changes: OrderUpdate = { status };
    if (status === 'IN_PROGRESS') {
      changes.actualStart = new Date();
    }
    await this.updateOrder(orderId, changes, updatedBy);
  }

  private async updateOrder(orderId: string, changes: OrderUpdate, updatedBy: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'orders', orderId), {
      ...changes,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  /**
   * Solicita al backend generar el borrador del acta con IA y deja la orden
   * en revisión humana. La IA nunca cierra la orden por sí sola (CLAUDE.md
   * §23.6/§29): el cierre definitivo requiere una aprobación posterior.
   * El Store se actualiza solo mediante el listener de `watchOrders`, no
   * aquí, para mantener una única fuente de verdad.
   */
  async generateClosingActDraft(orderId: string, notes: string): Promise<void> {
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
}
