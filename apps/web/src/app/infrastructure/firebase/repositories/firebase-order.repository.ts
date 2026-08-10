import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import type { OrderRepository, OrderUpdate } from '../../../features/orders/domain/order.repository';
import { ORDER_STATUS_CONFIG } from '../../../features/orders/models/order-status-config';
import type {
  NewOrderServiceRow,
  OrderDetailsUpdate,
  OrderStatus,
  ServiceOrder,
} from '../../../features/orders/models/order.model';
import type { NoteType, TechnicalNote } from '../../../features/orders/models/note.model';
import type { Evidence } from '../../../features/orders/models/evidence.model';
import type { ClosingAct, ClosingActContent } from '../../../features/orders/models/closing-act.model';
import type { OrderEvent, OrderEventAction } from '../../../features/orders/models/order-event.model';
import { FIREBASE_FIRESTORE } from '../firebase.tokens';
import { toDate, toDateOrDefault } from '../mappers/firestore.mapper';

function toTechnicalNote(id: string, orderId: string, data: DocumentData): TechnicalNote {
  return {
    id,
    orderId,
    content: data['content'],
    noteType: data['noteType'],
    attachmentIds: data['attachmentIds'] ?? [],
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
  };
}

function toOrderEvent(id: string, orderId: string, data: DocumentData): OrderEvent {
  return {
    id,
    entityType: 'ORDER',
    entityId: orderId,
    action: data['action'] as OrderEventAction,
    description: data['description'],
    metadata: data['metadata'] ?? undefined,
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
  };
}

function toEvidence(id: string, orderId: string, data: DocumentData): Evidence {
  return {
    id,
    orderId,
    type: data['type'],
    category: data['category'] ?? undefined,
    fileName: data['fileName'],
    storagePath: data['storagePath'],
    downloadUrl: data['downloadUrl'],
    contentType: data['contentType'],
    size: data['size'],
    description: data['description'] ?? undefined,
    uploadedAt: toDateOrDefault(data['uploadedAt']),
    uploadedBy: data['uploadedBy'],
    status: data['status'],
  };
}

function toClosingAct(id: string, data: DocumentData): ClosingAct {
  const clientDecisions = Array.isArray(data['clientDecisions'])
    ? data['clientDecisions'].map((decision: DocumentData) => ({
        decision: decision['decision'],
        representativeName: decision['representativeName'],
        representativeRole: decision['representativeRole'],
        comment: decision['comment'] ?? undefined,
        decidedAt: toDateOrDefault(decision['decidedAt']),
        decidedBy: decision['decidedBy'],
        version: decision['version'],
      }))
    : undefined;
  return {
    id,
    orderId: data['orderId'],
    version: data['version'],
    status: data['status'],
    source: data['source'],
    title: data['title'],
    objective: data['objective'] ?? undefined,
    executiveSummary: data['executiveSummary'],
    performedActivities: data['performedActivities'] ?? [],
    findings: data['findings'] ?? [],
    recommendations: data['recommendations'] ?? [],
    conclusions: data['conclusions'] ?? undefined,
    limitations: data['limitations'] ?? undefined,
    acceptanceNotes: data['acceptanceNotes'] ?? undefined,
    serviceProviderRepresentative: data['serviceProviderRepresentative'] ?? undefined,
    serviceProviderRepresentativeRole: data['serviceProviderRepresentativeRole'] ?? undefined,
    clientRepresentative: data['clientRepresentative'] ?? undefined,
    clientRepresentativeRole: data['clientRepresentativeRole'] ?? undefined,
    uploadedFileName: data['uploadedFileName'] ?? undefined,
    uploadedFileSize: data['uploadedFileSize'] ?? undefined,
    modelName: data['modelName'] ?? undefined,
    promptVersion: data['promptVersion'] ?? undefined,
    pdfPath: data['pdfPath'] ?? undefined,
    pdfUrl: data['pdfUrl'] ?? undefined,
    generatedAt: toDate(data['generatedAt']),
    generatedBy: data['generatedBy'] ?? undefined,
    reviewedAt: toDate(data['reviewedAt']),
    reviewedBy: data['reviewedBy'] ?? undefined,
    approvedAt: toDate(data['approvedAt']),
    approvedBy: data['approvedBy'] ?? undefined,
    clientDecision: data['clientDecision'] ?? undefined,
    clientDecisionComment: data['clientDecisionComment'] ?? undefined,
    clientDecisionAt: toDate(data['clientDecisionAt']),
    clientDecisionBy: data['clientDecisionBy'] ?? undefined,
    clientDecisionByName: data['clientDecisionByName'] ?? undefined,
    clientDecisionByRole: data['clientDecisionByRole'] ?? undefined,
    clientDecisions,
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
    updatedAt: toDateOrDefault(data['updatedAt']),
    updatedBy: data['updatedBy'],
  };
}

function toServiceOrder(id: string, data: DocumentData): ServiceOrder {
  const status: OrderStatus = data['status'];
  return {
    id,
    orderNumber: data['orderNumber'],
    quoteId: data['quoteId'],
    quoteNumber: data['quoteNumber'],
    clientId: data['clientId'],
    clientBusinessName: data['clientBusinessName'],
    assignedTechnicianIds: data['assignedTechnicianIds'] ?? [],
    assignedTechnicianNames: data['assignedTechnicianNames'] ?? [],
    coordinatorId: data['coordinatorId'],
    // `title`/`priority`/`progress` no existían antes de agregar la creación
    // manual de órdenes: los documentos previos (venidos de una cotización)
    // no los tienen, así que se cubren con un valor por defecto razonable
    // en vez de quedar `undefined` en la UI.
    title: data['title'] ?? data['serviceSummary'] ?? '',
    priority: data['priority'] ?? 'MEDIUM',
    dueDate: toDate(data['dueDate']),
    description: data['description'] ?? undefined,
    progress: data['progress'] ?? ORDER_STATUS_CONFIG[status]?.progress ?? 0,
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
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
    updatedAt: toDateOrDefault(data['updatedAt']),
    updatedBy: data['updatedBy'],
  };
}

/** Adapter de `OrderRepository` sobre Firestore (`orders` + subcolecciones
 *  `notes`/`evidence`/`events`, y `closingActs`). */
@Injectable({ providedIn: 'root' })
export class FirebaseOrderRepository implements OrderRepository {
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  watchAll(technicianUid?: string, clientId?: string): Observable<ServiceOrder[]> {
    return new Observable<ServiceOrder[]>((subscriber) => {
      const ordersRef = collection(this.firestore, 'orders');
      const ordersQuery = technicianUid
        ? query(ordersRef, where('assignedTechnicianIds', 'array-contains', technicianUid))
        : clientId
          ? query(ordersRef, where('clientId', '==', clientId))
          : ordersRef;

      return onSnapshot(
        ordersQuery,
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) => toServiceOrder(docSnapshot.id, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    });
  }

  async updateOrder(orderId: string, changes: OrderUpdate, updatedBy: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'orders', orderId), {
      ...changes,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  async requestCorrection(orderId: string, reason: string, updatedBy: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    const noteRef = doc(collection(this.firestore, 'orders', orderId, 'notes'));
    batch.set(noteRef, {
      content: `Corrección solicitada: ${reason}`,
      noteType: 'GENERAL',
      createdAt: serverTimestamp(),
      createdBy: updatedBy,
    });
    batch.update(doc(this.firestore, 'orders', orderId), {
      status: 'CORRECTION_REQUIRED',
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    await batch.commit();
  }

  async requestClosure(
    orderId: string,
    observations: string | undefined,
    updatedBy: string,
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    if (observations) {
      const noteRef = doc(collection(this.firestore, 'orders', orderId, 'notes'));
      batch.set(noteRef, {
        content: `Cierre solicitado: ${observations}`,
        noteType: 'GENERAL',
        createdAt: serverTimestamp(),
        createdBy: updatedBy,
      });
    }
    batch.update(doc(this.firestore, 'orders', orderId), {
      status: 'UNDER_REVIEW',
      actualEnd: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    await batch.commit();
  }

  async createOrders(
    clientId: string,
    clientBusinessName: string,
    rows: NewOrderServiceRow[],
    createdBy: string,
  ): Promise<string[]> {
    if (rows.length === 0) {
      return [];
    }

    const ordersCollection = collection(this.firestore, 'orders');
    const ordersSnapshot = await getDocs(ordersCollection);
    let nextNumber = ordersSnapshot.size + 1;

    const batch = writeBatch(this.firestore);
    const orderIds: string[] = [];
    for (const row of rows) {
      const orderRef = doc(ordersCollection);
      const orderNumber = `OT-${nextNumber.toString().padStart(4, '0')}`;
      nextNumber += 1;
      const status: OrderStatus = row.scheduledStart ? 'SCHEDULED' : 'DRAFT';

      batch.set(orderRef, {
        orderNumber,
        clientId,
        clientBusinessName,
        assignedTechnicianIds: [],
        title: row.serviceSummary,
        serviceSummary: row.serviceSummary,
        priority: row.priority,
        dueDate: row.dueDate,
        ...(row.scheduledStart && { scheduledStart: row.scheduledStart }),
        ...(row.scheduledEnd && { scheduledEnd: row.scheduledEnd }),
        description: row.description,
        progress: 0,
        status,
        evidenceCount: 0,
        createdAt: serverTimestamp(),
        createdBy,
        updatedAt: serverTimestamp(),
        updatedBy: createdBy,
      });
      orderIds.push(orderRef.id);
    }

    await batch.commit();
    return orderIds;
  }

  async updateOrderDetails(
    orderId: string,
    changes: OrderDetailsUpdate,
    updatedBy: string,
  ): Promise<void> {
    await updateDoc(doc(this.firestore, 'orders', orderId), {
      ...changes,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  async updateProgress(
    orderId: string,
    progress: number,
    note: string | undefined,
    updatedBy: string,
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    batch.update(doc(this.firestore, 'orders', orderId), {
      progress,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    if (note) {
      const noteRef = doc(collection(this.firestore, 'orders', orderId, 'notes'));
      batch.set(noteRef, {
        content: `Avance actualizado a ${progress}%: ${note}`,
        noteType: 'GENERAL',
        createdAt: serverTimestamp(),
        createdBy: updatedBy,
      });
    }
    await batch.commit();
  }

  async deleteOrder(order: ServiceOrder, updatedBy: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    batch.delete(doc(this.firestore, 'orders', order.id));
    if (order.quoteId) {
      const quoteRef = doc(this.firestore, 'quotes', order.quoteId);
      const quoteSnapshot = await getDoc(quoteRef);
      const remainingOrderIds = (
        (quoteSnapshot.data()?.['orderIds'] as string[] | undefined) ?? []
      ).filter((id) => id !== order.id);
      batch.update(quoteRef, {
        orderIds: remainingOrderIds,
        ...(remainingOrderIds.length === 0 && { status: 'APPROVED' }),
        updatedAt: serverTimestamp(),
        updatedBy,
      });
    }
    await batch.commit();
  }

  watchNotes(orderId: string): Observable<TechnicalNote[]> {
    return new Observable<TechnicalNote[]>((subscriber) => {
      const notesQuery = query(
        collection(this.firestore, 'orders', orderId, 'notes'),
        orderBy('createdAt', 'desc'),
      );
      return onSnapshot(
        notesQuery,
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) =>
              toTechnicalNote(docSnapshot.id, orderId, docSnapshot.data()),
            ),
          );
        },
        (error) => subscriber.error(error),
      );
    });
  }

  async addNote(
    orderId: string,
    noteType: NoteType,
    content: string,
    createdBy: string,
    attachmentIds?: string[],
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    const noteRef = doc(collection(this.firestore, 'orders', orderId, 'notes'));
    batch.set(noteRef, {
      content,
      noteType,
      attachmentIds: attachmentIds ?? [],
      createdAt: serverTimestamp(),
      createdBy,
    });

    if (noteType === 'FINDING' || noteType === 'RECOMMENDATION') {
      const field = noteType === 'FINDING' ? 'findings' : 'recommendations';
      batch.update(doc(this.firestore, 'orders', orderId), {
        [field]: arrayUnion(content),
        updatedAt: serverTimestamp(),
        updatedBy: createdBy,
      });
    }

    await batch.commit();
  }

  watchEvidence(orderId: string): Observable<Evidence[]> {
    return new Observable<Evidence[]>((subscriber) => {
      const evidenceQuery = query(
        collection(this.firestore, 'orders', orderId, 'evidence'),
        orderBy('uploadedAt', 'desc'),
      );
      return onSnapshot(
        evidenceQuery,
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) => toEvidence(docSnapshot.id, orderId, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    });
  }

  watchOrderEvents(orderId: string): Observable<OrderEvent[]> {
    return new Observable<OrderEvent[]>((subscriber) => {
      const eventsQuery = query(
        collection(this.firestore, 'orders', orderId, 'events'),
        orderBy('createdAt', 'desc'),
      );
      return onSnapshot(
        eventsQuery,
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((docSnapshot) => toOrderEvent(docSnapshot.id, orderId, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    });
  }

  /** Sin `orderBy` a propósito: combinarlo con el `where('orderId', ...)`
   *  exigiría un índice compuesto, y con como mucho un puñado de actas por
   *  orden (una versión inicial de IA y alguna revisión) alcanza con
   *  ordenar en el cliente. */
  watchClosingAct(orderId: string): Observable<ClosingAct | null> {
    return new Observable<ClosingAct | null>((subscriber) => {
      const actQuery = query(
        collection(this.firestore, 'closingActs'),
        where('orderId', '==', orderId),
      );
      return onSnapshot(
        actQuery,
        (snapshot) => {
          const acts = snapshot.docs
            .map((docSnapshot) => toClosingAct(docSnapshot.id, docSnapshot.data()))
            .sort((a, b) => b.version - a.version);
          subscriber.next(acts[0] ?? null);
        },
        (error) => subscriber.error(error),
      );
    });
  }

  async updateClosingActContent(
    actId: string,
    content: ClosingActContent,
    updatedBy: string,
  ): Promise<void> {
    await updateDoc(doc(this.firestore, 'closingActs', actId), {
      ...content,
      status: 'UNDER_REVIEW',
      reviewedAt: serverTimestamp(),
      reviewedBy: updatedBy,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  async approveClosingAct(actId: string, orderId: string, updatedBy: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    batch.update(doc(this.firestore, 'closingActs', actId), {
      status: 'APPROVED',
      approvedAt: serverTimestamp(),
      approvedBy: updatedBy,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    batch.update(doc(this.firestore, 'orders', orderId), {
      status: 'APPROVED',
      updatedAt: serverTimestamp(),
      updatedBy,
    });
    await batch.commit();
  }
}
