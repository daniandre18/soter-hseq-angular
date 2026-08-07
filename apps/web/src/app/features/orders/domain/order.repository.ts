import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { NewOrderServiceRow, OrderDetailsUpdate, ServiceOrder } from '../models/order.model';
import type { NoteType, TechnicalNote } from '../models/note.model';
import type { Evidence } from '../models/evidence.model';
import type { ClosingAct, ClosingActContent } from '../models/closing-act.model';
import type { OrderEvent } from '../models/order-event.model';

export type OrderUpdate = Partial<
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

/**
 * Puerto de acceso a órdenes, notas, evidencia (solo lectura — la subida
 * pasa por `EvidenceUploadGateway`), bitácora y actas de cierre (CRUD de
 * Firestore; generar el borrador con IA y cerrar con PDF pasan por
 * `ClosingActGateway`). `OrdersService` (la capa de sincronización con el
 * store de Akita) depende únicamente de este contrato.
 */
export interface OrderRepository {
  /**
   * Firestore evalúa si una consulta completa puede cumplir las Rules, no
   * filtra documentos después de leerlos. Por eso los técnicos consultan por
   * `assignedTechnicianIds` y los clientes por su `clientId`; solo los roles
   * internos con lectura general abren el listener sin filtro.
   */
  watchAll(technicianUid?: string, clientId?: string): Observable<ServiceOrder[]>;

  updateOrder(orderId: string, changes: OrderUpdate, updatedBy: string): Promise<void>;

  /** El coordinador devuelve la orden a campo (CLAUDE.md §3.3 "solicitar
   *  correcciones", §10.2 UNDER_REVIEW→CORRECTION_REQUIRED). El motivo queda
   *  como una nota más en la bitácora, para que el técnico lo vea en el
   *  mismo lugar que el resto de las notas. */
  requestCorrection(orderId: string, reason: string, updatedBy: string): Promise<void>;

  /** El técnico solicita el cierre desde la ejecución en campo (CLAUDE.md
   *  §3.4/§11.4 "enviar la orden a revisión"): pasa a `UNDER_REVIEW`, igual
   *  que `updateOrder(id, {status:'UNDER_REVIEW'})`, pero además deja las
   *  observaciones finales como una nota más en la bitácora — mismo patrón
   *  que `requestCorrection`. La aprobación real sigue pasando por el Acta
   *  (`approveClosingAct`), esto solo abre la revisión del coordinador. */
  requestClosure(orderId: string, observations: string | undefined, updatedBy: string): Promise<void>;

  /** Crea una orden por cada fila (servicio) del formulario manual, sin
   *  pasar por una cotización. Devuelve los ids creados. */
  createOrders(
    clientId: string,
    clientBusinessName: string,
    rows: NewOrderServiceRow[],
    createdBy: string,
  ): Promise<string[]>;

  updateOrderDetails(orderId: string, changes: OrderDetailsUpdate, updatedBy: string): Promise<void>;

  updateProgress(
    orderId: string,
    progress: number,
    note: string | undefined,
    updatedBy: string,
  ): Promise<void>;

  /** Solo permitido en `DRAFT` (misma condición que exige `firestore.rules`
   *  del lado del servidor, no solo aquí). */
  deleteOrder(order: ServiceOrder, updatedBy: string): Promise<void>;

  watchNotes(orderId: string): Observable<TechnicalNote[]>;

  /** `attachmentIds` debe apuntar a evidencia ya subida (vía
   *  `EvidenceUploadGateway`) — la nota es inmutable, así que el vínculo se
   *  fija en la creación. */
  addNote(
    orderId: string,
    noteType: NoteType,
    content: string,
    createdBy: string,
    attachmentIds?: string[],
  ): Promise<void>;

  watchEvidence(orderId: string): Observable<Evidence[]>;

  watchOrderEvents(orderId: string): Observable<OrderEvent[]>;

  /** Sin orden garantizado a propósito: con como mucho un puñado de actas
   *  por orden (una versión inicial de IA y alguna revisión), el adapter
   *  puede resolver la más reciente sin necesitar un índice compuesto. */
  watchClosingAct(orderId: string): Observable<ClosingAct | null>;

  /** Guarda la revisión humana del borrador (CLAUDE.md §11.6). No cambia el
   *  estado de la orden — solo `approveClosingAct` lo hace. */
  updateClosingActContent(actId: string, content: ClosingActContent, updatedBy: string): Promise<void>;

  /** Aprueba el acta y hace avanzar la orden a `APPROVED` de forma atómica
   *  (CLAUDE.md §10.2: "no aprobar sin acta"). */
  approveClosingAct(actId: string, orderId: string, updatedBy: string): Promise<void>;
}

export const ORDER_REPOSITORY = new InjectionToken<OrderRepository>('ORDER_REPOSITORY');
