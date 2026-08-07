import { Injectable, inject } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { CLOSING_ACT_GATEWAY } from '../domain/closing-act.gateway';
import { EVIDENCE_UPLOAD_GATEWAY } from '../domain/evidence-upload.gateway';
import { ORDER_REPOSITORY, type OrderUpdate } from '../domain/order.repository';
import { OrdersStore } from './orders.store';
import type {
  NewOrderServiceRow,
  OrderDetailsUpdate,
  OrderStatus,
  ServiceOrder,
} from '../models/order.model';
import type { NoteType, TechnicalNote } from '../models/note.model';
import type { Evidence, EvidenceCategory } from '../models/evidence.model';
import type { ClosingAct, ClosingActContent } from '../models/closing-act.model';
import type { OrderEvent } from '../models/order-event.model';

/**
 * Mantiene el OrdersStore de Akita sincronizado con `OrderRepository` y
 * coordina el cierre asistido por IA a través de `ClosingActGateway` (nunca
 * se invoca Gemini directamente desde Angular).
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly store = inject(OrdersStore);
  private readonly repository = inject(ORDER_REPOSITORY);
  private readonly evidenceUploadGateway = inject(EVIDENCE_UPLOAD_GATEWAY);
  private readonly closingActGateway = inject(CLOSING_ACT_GATEWAY);

  private ordersSubscription: Subscription | null = null;
  private ordersRetriedAfterError = false;

  watchOrders(technicianUid?: string, clientId?: string): void {
    if (this.ordersSubscription) {
      return;
    }

    this.store.setLoading(true);
    this.ordersSubscription = this.repository.watchAll(technicianUid, clientId).subscribe({
      next: (orders) => {
        this.ordersRetriedAfterError = false;
        this.store.setError(null);
        this.store.set(orders);
        this.store.setLoading(false);
      },
      error: (error: Error & { code?: string }) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
        // El guard de arriba impediría reabrir el listener más adelante si
        // no se limpia acá. Un `permission-denied` justo después de iniciar
        // sesión suele ser una carrera del SDK (el canal de Firestore aún no
        // tiene el token nuevo) y no un rechazo real — se reintenta una sola
        // vez para no quedar atascado hasta que el usuario recargue.
        this.ordersSubscription = null;
        if (error.code === 'permission-denied' && !this.ordersRetriedAfterError) {
          this.ordersRetriedAfterError = true;
          setTimeout(() => this.watchOrders(technicianUid, clientId), 1000);
        }
      },
    });
  }

  stopWatchingOrders(): void {
    this.ordersSubscription?.unsubscribe();
    this.ordersSubscription = null;
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
    await this.repository.updateOrder(
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
    await this.repository.updateOrder(
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
    await this.repository.updateOrder(orderId, changes, updatedBy);
  }

  async requestCorrection(orderId: string, reason: string, updatedBy: string): Promise<void> {
    await this.repository.requestCorrection(orderId, reason, updatedBy);
  }

  async requestClosure(
    orderId: string,
    observations: string | undefined,
    updatedBy: string,
  ): Promise<void> {
    await this.repository.requestClosure(orderId, observations, updatedBy);
  }

  /**
   * Crea una orden por cada fila (servicio) del formulario manual, sin pasar
   * por una cotización (a diferencia de `QuotesService.convertToOrder`, que
   * hace lo mismo pero por ítem de cotización). Cada fila es una
   * `ServiceOrder` totalmente independiente — su propio estado, técnico,
   * evidencia y acta — no un sub-ítem anidado (CLAUDE.md §9.5 no define
   * varios servicios por orden).
   */
  async createOrders(
    clientId: string,
    clientBusinessName: string,
    rows: NewOrderServiceRow[],
    createdBy: string,
  ): Promise<string[]> {
    return this.repository.createOrders(clientId, clientBusinessName, rows, createdBy);
  }

  /** Edita los campos "de cabecera" de la orden (CLAUDE.md no cubre esto
   *  explícitamente; técnicos/programación siguen teniendo sus propios flujos
   *  dedicados en `schedule`/`assignTechnicians`, no se tocan aquí). */
  async updateOrderDetails(
    orderId: string,
    changes: OrderDetailsUpdate,
    updatedBy: string,
  ): Promise<void> {
    await this.repository.updateOrderDetails(orderId, changes, updatedBy);
  }

  /** Avance manual (0-100), editable en cualquier estado no cerrado; una
   *  nota opcional queda en la bitácora para dar contexto del cambio. */
  async updateProgress(
    orderId: string,
    progress: number,
    note: string | undefined,
    updatedBy: string,
  ): Promise<void> {
    await this.repository.updateProgress(orderId, progress, note, updatedBy);
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
    await this.repository.deleteOrder(order, updatedBy);
  }

  watchNotes(orderId: string): Observable<TechnicalNote[]> {
    return this.repository.watchNotes(orderId);
  }

  /**
   * Registra una nota técnica en la bitácora de la orden (inmutable, solo
   * `create`). Los hallazgos y recomendaciones también se acumulan en los
   * arreglos del documento de la orden (CLAUDE.md §9.5), que es lo que el
   * prompt de IA lee para redactar el borrador del acta. `attachmentIds`
   * debe apuntar a evidencia ya subida (vía `uploadEvidence`) — la nota es
   * inmutable, así que el vínculo se fija aquí.
   */
  async addNote(
    orderId: string,
    noteType: NoteType,
    content: string,
    createdBy: string,
    attachmentIds?: string[],
  ): Promise<void> {
    await this.repository.addNote(orderId, noteType, content, createdBy, attachmentIds);
  }

  watchEvidence(orderId: string): Observable<Evidence[]> {
    return this.repository.watchEvidence(orderId);
  }

  watchOrderEvents(orderId: string): Observable<OrderEvent[]> {
    return this.repository.watchOrderEvents(orderId);
  }

  /**
   * Sube el archivo bajo la convención de `storagePath` de CLAUDE.md §9.6
   * (nunca se confía en el nombre original para la ruta), reporta el
   * progreso, y solo al terminar crea el documento de evidencia e
   * incrementa `evidenceCount` en la orden. Retorna el id del documento de
   * evidencia creado (p. ej. para vincularlo desde una nota vía `addNote`).
   */
  async uploadEvidence(
    orderId: string,
    file: File,
    category: EvidenceCategory | undefined,
    description: string | undefined,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    return this.evidenceUploadGateway.upload({ orderId, file, category, description, onProgress });
  }

  /**
   * Solicita al backend generar el borrador del acta con IA y deja la orden
   * en revisión humana. La IA nunca cierra la orden por sí sola (CLAUDE.md
   * §23.6/§29): el cierre definitivo requiere una aprobación posterior.
   * El Store se actualiza solo mediante el listener de `watchOrders`, no
   * aquí, para mantener una única fuente de verdad.
   */
  async generateClosingActDraft(orderId: string, notes: string): Promise<void> {
    await this.closingActGateway.generateDraft(orderId, notes);
  }

  watchClosingAct(orderId: string): Observable<ClosingAct | null> {
    return this.repository.watchClosingAct(orderId);
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
    await this.repository.updateClosingActContent(actId, content, updatedBy);
  }

  /**
   * Aprueba el acta y hace avanzar la orden a `APPROVED` en la misma
   * operación atómica (CLAUDE.md §10.2: "no aprobar sin acta" — al llegar
   * aquí el acta ya existe por construcción, porque solo se puede aprobar
   * un acta que ya se generó).
   */
  async approveClosingAct(actId: string, orderId: string, updatedBy: string): Promise<void> {
    await this.repository.approveClosingAct(actId, orderId, updatedBy);
  }

  /**
   * Genera el PDF final y cierra la orden. Ejecutado en el backend (Cloud
   * Function con Admin SDK) porque escribe en rutas de Storage/Firestore que
   * las reglas del cliente bloquean a propósito (`closing-acts/**`,
   * `auditEvents`) — el cierre queda auditado sin depender de que el
   * cliente sea honesto sobre qué acta se está cerrando.
   */
  async closeOrderWithPdf(orderId: string, actId: string): Promise<string> {
    return this.closingActGateway.closeOrder(orderId, actId);
  }
}
