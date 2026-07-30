import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DocumentData,
  Timestamp,
  Unsubscribe,
  arrayUnion,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import {
  FIREBASE_FIRESTORE,
  FIREBASE_FUNCTIONS,
  FIREBASE_STORAGE,
} from '../../../core/firebase/firebase.tokens';
import { OrdersStore } from './orders.store';
import type { OrderStatus, ServiceOrder } from '../models/order.model';
import type { NoteType, TechnicalNote } from '../models/note.model';
import type { Evidence, EvidenceCategory, EvidenceType } from '../models/evidence.model';
import type { ClosingAct, ClosingActContent } from '../models/closing-act.model';

interface GenerateClosingActResponse {
  closingActId: string;
}

interface CloseOrderResponse {
  pdfPath: string;
}

type OrderUpdate = Partial<
  Pick<
    ServiceOrder,
    | 'scheduledStart'
    | 'scheduledEnd'
    | 'assignedTechnicianIds'
    | 'status'
    | 'actualStart'
    | 'actualEnd'
    | 'findings'
    | 'recommendations'
    | 'evidenceCount'
  >
>;

function toTechnicalNote(id: string, orderId: string, data: DocumentData): TechnicalNote {
  return {
    id,
    orderId,
    content: data['content'],
    noteType: data['noteType'],
    createdAt: toDate(data['createdAt']) ?? new Date(0),
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
    uploadedAt: toDate(data['uploadedAt']) ?? new Date(0),
    uploadedBy: data['uploadedBy'],
    status: data['status'],
  };
}

function toClosingAct(id: string, data: DocumentData): ClosingAct {
  return {
    id,
    orderId: data['orderId'],
    version: data['version'],
    status: data['status'],
    source: data['source'],
    title: data['title'],
    executiveSummary: data['executiveSummary'],
    performedActivities: data['performedActivities'] ?? [],
    findings: data['findings'] ?? [],
    recommendations: data['recommendations'] ?? [],
    conclusions: data['conclusions'] ?? undefined,
    limitations: data['limitations'] ?? undefined,
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
    createdAt: toDate(data['createdAt']) ?? new Date(0),
    createdBy: data['createdBy'],
    updatedAt: toDate(data['updatedAt']) ?? new Date(0),
    updatedBy: data['updatedBy'],
  };
}

function evidenceTypeFor(contentType: string): EvidenceType {
  if (contentType === 'application/pdf') {
    return 'PDF';
  }
  return contentType.startsWith('image/') ? 'PHOTO' : 'OTHER';
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
  private readonly functions = inject(FIREBASE_FUNCTIONS);
  private readonly storage = inject(FIREBASE_STORAGE);

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
   * registra la marca de tiempo real de inicio; al enviar a revisión, la de
   * fin real (cierra la ventana de "ejecución en campo" de CLAUDE.md §11.4).
   */
  async updateStatus(orderId: string, status: OrderStatus, updatedBy: string): Promise<void> {
    const changes: OrderUpdate = { status };
    if (status === 'IN_PROGRESS') {
      changes.actualStart = new Date();
    } else if (status === 'UNDER_REVIEW') {
      changes.actualEnd = new Date();
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
   * El coordinador devuelve la orden a campo (CLAUDE.md §3.3 "solicitar
   * correcciones", §10.2 UNDER_REVIEW→CORRECTION_REQUIRED). El motivo queda
   * como una nota más en la bitácora, para que el técnico lo vea en el
   * mismo lugar que el resto de las notas.
   */
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
            snapshot.docs.map((docSnapshot) => toTechnicalNote(docSnapshot.id, orderId, docSnapshot.data())),
          );
        },
        (error) => subscriber.error(error),
      );
    });
  }

  /**
   * Registra una nota técnica en la bitácora de la orden (inmutable, solo
   * `create`). Los hallazgos y recomendaciones también se acumulan en los
   * arreglos del documento de la orden (CLAUDE.md §9.5), que es lo que el
   * prompt de IA de la Fase 6 leerá para redactar el borrador del acta.
   */
  async addNote(orderId: string, noteType: NoteType, content: string, createdBy: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    const noteRef = doc(collection(this.firestore, 'orders', orderId, 'notes'));
    batch.set(noteRef, { content, noteType, createdAt: serverTimestamp(), createdBy });

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

  /**
   * Sube el archivo a Storage bajo la convención de `storagePath` de
   * CLAUDE.md §9.6 (nunca se confía en el nombre original para la ruta),
   * reporta el progreso, y solo al terminar crea el documento de evidencia
   * e incrementa `evidenceCount` en la orden.
   */
  async uploadEvidence(
    orderId: string,
    file: File,
    category: EvidenceCategory | undefined,
    description: string | undefined,
    uploadedBy: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    const evidenceRef = doc(collection(this.firestore, 'orders', orderId, 'evidence'));
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const storagePath = `orders/${orderId}/evidence/${evidenceRef.id}/${safeFileName}`;
    const storageRef = ref(this.storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    const finalSnapshot = await new Promise<UploadTaskSnapshot>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        reject,
        () => resolve(uploadTask.snapshot),
      );
    });
    const downloadUrl = await getDownloadURL(finalSnapshot.ref);

    const batch = writeBatch(this.firestore);
    batch.set(evidenceRef, {
      orderId,
      type: evidenceTypeFor(file.type),
      category: category ?? null,
      fileName: file.name,
      storagePath,
      downloadUrl,
      contentType: file.type,
      size: file.size,
      description: description || null,
      uploadedAt: serverTimestamp(),
      uploadedBy,
      status: 'ACTIVE',
    });
    batch.update(doc(this.firestore, 'orders', orderId), {
      evidenceCount: increment(1),
      updatedAt: serverTimestamp(),
      updatedBy: uploadedBy,
    });
    await batch.commit();
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

  /**
   * Sin `orderBy` a propósito: combinarlo con el `where('orderId', ...)`
   * exigiría un índice compuesto, y con como mucho un puñado de actas por
   * orden (una versión inicial de IA y alguna revisión) alcanza con
   * ordenar en el cliente.
   */
  watchClosingAct(orderId: string): Observable<ClosingAct | null> {
    return new Observable<ClosingAct | null>((subscriber) => {
      const actQuery = query(collection(this.firestore, 'closingActs'), where('orderId', '==', orderId));
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

  /**
   * Guarda la revisión humana del borrador (CLAUDE.md §11.6: "edita
   * cualquier error, guarda la versión revisada"). No cambia el estado de la
   * orden — solo `Aprobar Acta` lo hace, como paso explícito y separado.
   */
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

  /**
   * Aprueba el acta y hace avanzar la orden a `APPROVED` en la misma
   * transacción atómica (CLAUDE.md §10.2: "no aprobar sin acta" — al llegar
   * aquí el acta ya existe por construcción, porque solo se puede aprobar
   * un acta que ya se generó).
   */
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

  /**
   * Genera el PDF final y cierra la orden. Ejecutado en el backend (Cloud
   * Function con Admin SDK) porque escribe en rutas de Storage/Firestore que
   * las reglas del cliente bloquean a propósito (`closing-acts/**`,
   * `auditEvents`) — el cierre queda auditado sin depender de que el
   * cliente sea honesto sobre qué acta se está cerrando.
   */
  async closeOrderWithPdf(orderId: string, actId: string): Promise<string> {
    const closeOrder = httpsCallable<{ orderId: string; actId: string }, CloseOrderResponse>(
      this.functions,
      'closeOrder',
    );
    const { data } = await closeOrder({ orderId, actId });
    return this.resolvePdfUrl(data.pdfPath);
  }

  /** Resuelve la URL de descarga vía el SDK del cliente (respeta Storage
   *  Rules y funciona igual contra el emulador que contra producción, a
   *  diferencia de construir la URL a mano). */
  resolvePdfUrl(pdfPath: string): Promise<string> {
    return getDownloadURL(ref(this.storage, pdfPath));
  }
}
