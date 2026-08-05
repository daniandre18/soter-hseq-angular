import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DocumentData,
  Timestamp,
  Unsubscribe,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
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
import { ORDER_STATUS_CONFIG } from '../models/order-status-config';
import type {
  NewOrderServiceRow,
  OrderDetailsUpdate,
  OrderStatus,
  ServiceOrder,
} from '../models/order.model';
import type { NoteType, TechnicalNote } from '../models/note.model';
import type { Evidence, EvidenceCategory, EvidenceType } from '../models/evidence.model';
import type { ClosingAct, ClosingActContent } from '../models/closing-act.model';
import type { OrderEvent, OrderEventAction } from '../models/order-event.model';
import { environment } from '../../../../environments/environment';

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
    | 'assignedTechnicianNames'
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
    attachmentIds: data['attachmentIds'] ?? [],
    createdAt: toDate(data['createdAt']) ?? new Date(0),
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
  private ordersRetriedAfterError = false;

  /**
   * Firestore evalúa si una consulta completa puede cumplir las Rules, no
   * filtra documentos después de leerlos. Por eso los técnicos consultan por
   * `assignedTechnicianIds` y los clientes por su `clientId`; solo los roles
   * internos con lectura general abren el listener sin filtro.
   */
  watchOrders(technicianUid?: string, clientId?: string): void {
    if (this.unsubscribeFromOrders) {
      return;
    }

    this.store.setLoading(true);
    const ordersRef = collection(this.firestore, 'orders');
    const ordersQuery = technicianUid
      ? query(ordersRef, where('assignedTechnicianIds', 'array-contains', technicianUid))
      : clientId
        ? query(ordersRef, where('clientId', '==', clientId))
        : ordersRef;

    this.unsubscribeFromOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        this.ordersRetriedAfterError = false;
        this.store.setError(null);
        const orders = snapshot.docs.map((docSnapshot) =>
          toServiceOrder(docSnapshot.id, docSnapshot.data()),
        );
        this.store.set(orders);
        this.store.setLoading(false);
      },
      (error) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
        // El guard de arriba impediría reabrir el listener más adelante si
        // no se limpia acá. Un `permission-denied` justo después de iniciar
        // sesión suele ser una carrera del SDK (el canal de Firestore aún no
        // tiene el token nuevo) y no un rechazo real — se reintenta una sola
        // vez para no quedar atascado hasta que el usuario recargue.
        this.unsubscribeFromOrders = null;
        if (error.code === 'permission-denied' && !this.ordersRetriedAfterError) {
          this.ordersRetriedAfterError = true;
          setTimeout(() => this.watchOrders(technicianUid, clientId), 1000);
        }
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
    scheduledEnd: Date | undefined,
    updatedBy: string,
  ): Promise<void> {
    const current = this.store.getValue().entities?.[orderId];
    const status: OrderStatus | undefined = current?.status === 'DRAFT' ? 'SCHEDULED' : undefined;
    await this.updateOrder(
      orderId,
      {
        scheduledStart,
        ...(scheduledEnd && { scheduledEnd }),
        ...(status && { status }),
      },
      updatedBy,
    );
  }

  /**
   * Asigna (o reasigna) los técnicos de campo. La primera asignación sobre
   * una orden programada es lo que la hace pasar a `ASSIGNED`; reasignar una
   * orden ya asignada no cambia su estado (CLAUDE.md §10.2).
   */
  async assignTechnicians(
    orderId: string,
    technicianIds: string[],
    technicianNames: string[],
    updatedBy: string,
  ): Promise<void> {
    const current = this.store.getValue().entities?.[orderId];
    const status: OrderStatus | undefined =
      current?.status === 'SCHEDULED' && technicianIds.length > 0 ? 'ASSIGNED' : undefined;
    await this.updateOrder(
      orderId,
      {
        assignedTechnicianIds: technicianIds,
        assignedTechnicianNames: technicianNames,
        ...(status && { status }),
      },
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

  private async updateOrder(
    orderId: string,
    changes: OrderUpdate,
    updatedBy: string,
  ): Promise<void> {
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

  /**
   * Crea una orden por cada fila (servicio) del formulario manual, sin pasar
   * por una cotización (a diferencia de `QuotesService.convertToOrder`, que
   * hace lo mismo pero por ítem de cotización). Cada fila es una
   * `ServiceOrder` totalmente independiente — su propio estado, técnico,
   * evidencia y acta — no un sub-ítem anidado (CLAUDE.md §9.5 no define
   * varios servicios por orden). El consecutivo usa el mismo esquema
   * `OT-XXXX` y la misma limitación de carrera aceptada para el MVP (conteo
   * de colección fuera de un batch).
   */
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

  /** Edita los campos "de cabecera" de la orden (CLAUDE.md no cubre esto
   *  explícitamente; técnicos/programación siguen teniendo sus propios flujos
   *  dedicados en `schedule`/`assignTechnicians`, no se tocan aquí). */
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

  /** Avance manual (0-100), editable en cualquier estado no cerrado; una
   *  nota opcional queda en la bitácora para dar contexto del cambio. */
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

  /**
   * Solo permitido en `DRAFT` (misma condición que exige `firestore.rules`
   * del lado del servidor, no solo aquí). Si la orden viene de una
   * cotización convertida, la quita de `orderIds` — una cotización puede
   * haber generado varias órdenes hermanas (una por ítem, ver
   * `QuotesService.convertToOrder`), así que solo se revierte la cotización
   * a `APPROVED` cuando no queda ninguna orden viva; de lo contrario las
   * hermanas quedarían huérfanas de una cotización que ya no se vería como
   * `CONVERTED`.
   */
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

  /**
   * Registra una nota técnica en la bitácora de la orden (inmutable, solo
   * `create`). Los hallazgos y recomendaciones también se acumulan en los
   * arreglos del documento de la orden (CLAUDE.md §9.5), que es lo que el
   * prompt de IA de la Fase 6 leerá para redactar el borrador del acta.
   * `attachmentIds` debe apuntar a evidencia ya subida (p. ej. vía
   * `uploadEvidence`) — la nota es inmutable, así que el vínculo se fija aquí.
   */
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
            snapshot.docs.map((docSnapshot) =>
              toEvidence(docSnapshot.id, orderId, docSnapshot.data()),
            ),
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
            snapshot.docs.map((docSnapshot) =>
              toOrderEvent(docSnapshot.id, orderId, docSnapshot.data()),
            ),
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
   * e incrementa `evidenceCount` en la orden. Retorna el id del documento de
   * evidencia creado (p. ej. para vincularlo desde una nota vía `addNote`).
   */
  async uploadEvidence(
    orderId: string,
    file: File,
    category: EvidenceCategory | undefined,
    description: string | undefined,
    uploadedBy: string,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    if (!environment.evidenceUploadsEnabled) {
      throw new Error('La carga de evidencias está deshabilitada en el demo gratuito.');
    }
    const evidenceRef = doc(collection(this.firestore, 'orders', orderId, 'evidence'));
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const storagePath = `orders/${orderId}/evidence/${evidenceRef.id}/${safeFileName}`;
    const storageRef = ref(this.storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    const finalSnapshot = await new Promise<UploadTaskSnapshot>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) =>
          onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
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
    return evidenceRef.id;
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
