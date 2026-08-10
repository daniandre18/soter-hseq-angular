import { Injectable, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, of, switchMap } from 'rxjs';
import { OrdersQuery } from '../state/orders.query';
import { OrdersService } from '../state/orders.service';
import { AuthFacade } from '../../auth/facades/auth.facade';
import { USERS_REPOSITORY } from '../../../core/repositories/users.repository';
import { ORDER_STATUS_CONFIG } from '../models/order-status-config';
import type {
  NewOrderServiceRow,
  OrderDetailsUpdate,
  OrderStatus,
  ServiceOrder,
} from '../models/order.model';
import type { NoteType, TechnicalNote } from '../models/note.model';
import type { Evidence, EvidenceCategory } from '../models/evidence.model';
import type {
  ClientActDecisionInput,
  ClosingAct,
  ClosingActContent,
} from '../models/closing-act.model';
import type { OrderEvent } from '../models/order-event.model';
import type { PieSlice } from '../../../shared/components/pie-chart/pie-chart';
import type { ReleaseListener } from '../../../shared/utils/reference-counted-listener';

const OPEN_STATUSES = new Set<ServiceOrder['status']>([
  'SCHEDULED',
  'ASSIGNED',
  'IN_PROGRESS',
  'EVIDENCE_PENDING',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
]);

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Lunes 00:00 de la semana calendario de `date` — `getDay()` es 0=domingo. */
function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diffToMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Domingo 23:59:59.999 de la misma semana calendario. */
function endOfWeek(date: Date): Date {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Único punto de contacto entre la UI y el feature de órdenes.
 * Encapsula Akita (Store/Query) y Firestore (Service); los componentes
 * solo leen Signals, nunca el pipe `async` ni la Query directamente.
 */
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  private readonly query = inject(OrdersQuery);
  private readonly service = inject(OrdersService);
  private readonly authFacade = inject(AuthFacade);
  private readonly usersRepository = inject(USERS_REPOSITORY);

  readonly orders = toSignal(this.query.orders$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });
  readonly error = toSignal(this.query.error$, { initialValue: null });

  /** Técnicos disponibles para asignación (CLAUDE.md §23.4). */
  readonly technicians = toSignal(
    toObservable(this.authFacade.currentUser).pipe(
      switchMap((user) =>
        user && user.role !== 'VIEWER' ? this.usersRepository.watchByRole('TECHNICIAN') : of([]),
      ),
    ),
    { initialValue: [] },
  );

  /** Para resolver el autor de cualquier nota/evidencia/evento en el feed de Actividad. */
  private readonly allUsers = toSignal(
    toObservable(this.authFacade.currentUser).pipe(
      switchMap((user) =>
        user && user.role !== 'VIEWER' ? this.usersRepository.watchAll() : of([]),
      ),
    ),
    { initialValue: [] },
  );

  readonly assignedCount = computed(
    () => this.orders().filter((order) => order.status === 'ASSIGNED').length,
  );
  readonly inProgressCount = computed(
    () => this.orders().filter((order) => order.status === 'IN_PROGRESS').length,
  );
  readonly underReviewCount = computed(
    () => this.orders().filter((order) => order.status === 'UNDER_REVIEW').length,
  );
  readonly closedCount = computed(
    () => this.orders().filter((order) => order.status === 'CLOSED').length,
  );

  /** Órdenes que aún no llegan a un estado final (CLOSED/CANCELLED). */
  readonly openCount = computed(
    () => this.orders().filter((order) => OPEN_STATUSES.has(order.status)).length,
  );

  readonly pendingCount = computed(
    () => this.orders().filter((order) => order.status === 'DRAFT').length,
  );

  /** Programadas con fecha de fin vencida y sin cerrar/cancelar — la base de
   *  la alerta operativa "Vencidas" del panel del dashboard. */
  readonly overdueOrders = computed(() => {
    const now = new Date();
    return this.orders().filter(
      (order) =>
        order.scheduledEnd !== undefined &&
        order.scheduledEnd < now &&
        order.status !== 'CLOSED' &&
        order.status !== 'CANCELLED',
    );
  });

  readonly overdueCount = computed(() => this.overdueOrders().length);

  /** Órdenes que el coordinador devolvió a campo — la otra alerta operativa. */
  readonly correctionRequiredOrders = computed(() =>
    this.orders().filter((order) => order.status === 'CORRECTION_REQUIRED'),
  );

  readonly todayVisitsCount = computed(() => {
    const today = new Date();
    return this.orders().filter(
      (order) => order.scheduledStart !== undefined && isSameLocalDay(order.scheduledStart, today),
    ).length;
  });

  readonly techniciansInFieldCount = computed(() => {
    const technicianIds = new Set<string>();
    for (const order of this.orders()) {
      if (order.status === 'IN_PROGRESS') {
        order.assignedTechnicianIds.forEach((id) => technicianIds.add(id));
      }
    }
    return technicianIds.size;
  });

  /** Para el KPI "Visitas de Hoy" del dashboard: programadas en la semana
   *  calendario actual (lunes a domingo), no una ventana móvil de 7 días. */
  readonly visitsThisWeekCount = computed(() => {
    const now = new Date();
    const start = startOfWeek(now);
    const end = endOfWeek(now);
    return this.orders().filter(
      (order) =>
        order.scheduledStart !== undefined &&
        order.scheduledStart >= start &&
        order.scheduledStart <= end,
    ).length;
  });

  readonly recentOrders = computed(() =>
    [...this.orders()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5),
  );

  readonly upcomingVisits = computed(() => {
    const now = new Date();
    return this.orders()
      .filter(
        (order) =>
          order.scheduledStart !== undefined &&
          (order.scheduledEnd ?? order.scheduledStart) >= now &&
          order.status !== 'CANCELLED' &&
          order.status !== 'CLOSED',
      )
      .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime())
      .slice(0, 5);
  });

  /** Para el PieChart "Órdenes por Estado". */
  readonly statusBreakdown = computed<PieSlice[]>(() => {
    const counts = new Map<ServiceOrder['status'], number>();
    for (const order of this.orders()) {
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([status, value]) => ({
      key: status,
      label: ORDER_STATUS_CONFIG[status].translationKey,
      value,
      color: ORDER_STATUS_CONFIG[status].hex,
    }));
  });

  init(): ReleaseListener {
    // Igual que QuotesFacade: no depender del valor inicial del Signal para
    // elegir el alcance de una consulta protegida por Rules.
    let releaseListener: ReleaseListener | null = null;
    let released = false;
    const authSubscription = this.authFacade.resolveCurrentUser$().subscribe((user) => {
      if (released) {
        return;
      }
      releaseListener = this.service.watchOrders(
        user?.role === 'TECHNICIAN' ? user.id : undefined,
        user?.role === 'VIEWER' ? (user.clientId ?? '__without-client__') : undefined,
      );
    });
    return () => {
      released = true;
      authSubscription.unsubscribe();
      releaseListener?.();
    };
  }

  byId(id: string): ServiceOrder | undefined {
    return this.orders().find((order) => order.id === id);
  }

  technicianName(id: string): string {
    return this.technicians().find((technician) => technician.id === id)?.displayName ?? 'Técnico';
  }

  /** Resuelve el autor de cualquier nota/evidencia/evento del feed de Actividad, sin importar el rol. */
  displayNameFor(id: string): string {
    return this.allUsers().find((user) => user.id === id)?.displayName ?? 'Usuario';
  }

  async schedule(orderId: string, scheduledStart: Date, scheduledEnd?: Date): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.schedule(orderId, scheduledStart, scheduledEnd, userId);
  }

  async assignTechnicians(orderId: string, technicianIds: string[]): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    const technicianNames = technicianIds.map((id) => this.technicianName(id));
    await this.service.assignTechnicians(orderId, technicianIds, technicianNames, userId);
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.updateStatus(orderId, status, userId);
  }

  async requestCorrection(orderId: string, reason: string): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.requestCorrection(orderId, reason, userId);
  }

  /** El técnico solicita el cierre ("Solicitar Cierre" en el detalle de
   *  orden): igual que `updateStatus(id,'UNDER_REVIEW')` pero dejando las
   *  observaciones finales como nota, en un solo batch. */
  async requestClosure(orderId: string, observations?: string): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.requestClosure(orderId, observations, userId);
  }

  async createOrders(
    clientId: string,
    clientBusinessName: string,
    rows: NewOrderServiceRow[],
  ): Promise<string[]> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    return this.service.createOrders(clientId, clientBusinessName, rows, userId);
  }

  async updateOrderDetails(orderId: string, changes: OrderDetailsUpdate): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.updateOrderDetails(orderId, changes, userId);
  }

  async updateProgress(orderId: string, progress: number, note?: string): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.updateProgress(orderId, progress, note, userId);
  }

  async deleteOrder(order: ServiceOrder): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.deleteOrder(order, userId);
  }

  watchNotes(orderId: string): Observable<TechnicalNote[]> {
    return this.service.watchNotes(orderId);
  }

  async addNote(
    orderId: string,
    noteType: NoteType,
    content: string,
    attachmentIds?: string[],
  ): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.addNote(orderId, noteType, content, userId, attachmentIds);
  }

  watchEvidence(orderId: string): Observable<Evidence[]> {
    return this.service.watchEvidence(orderId);
  }

  async uploadEvidence(
    orderId: string,
    file: File,
    category: EvidenceCategory | undefined,
    description: string | undefined,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    return this.service.uploadEvidence(orderId, file, category, description, onProgress);
  }

  watchOrderEvents(orderId: string): Observable<OrderEvent[]> {
    return this.service.watchOrderEvents(orderId);
  }

  async generateClosingActDraft(orderId: string, notes: string): Promise<void> {
    try {
      await this.service.generateClosingActDraft(orderId, notes);
    } catch (error) {
      console.error('Error generando el borrador del acta de cierre:', error);
      throw error;
    }
  }

  async createManualClosingAct(orderId: string, content: ClosingActContent): Promise<void> {
    await this.service.createManualClosingAct(orderId, content);
  }

  async uploadClosingAct(
    orderId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    await this.service.uploadClosingAct(orderId, file, onProgress);
  }

  /**
   * Arma el texto de "notas de campo" que se envía a la Cloud Function
   * (CLAUDE.md §12.2: resumen del servicio, notas técnicas, hallazgos,
   * recomendaciones — nunca datos sensibles). La IA solo ve este resumen,
   * nunca los documentos de evidencia completos.
   */
  buildNotesSummary(order: ServiceOrder, notes: TechnicalNote[]): string {
    const lines = [`Servicio: ${order.serviceSummary}`];
    if (notes.length > 0) {
      lines.push('Notas de campo:', ...notes.map((note) => `- (${note.noteType}) ${note.content}`));
    }
    return lines.join('\n');
  }

  watchClosingAct(orderId: string): Observable<ClosingAct | null> {
    return this.service.watchClosingAct(orderId);
  }

  async updateClosingActContent(actId: string, content: ClosingActContent): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.updateClosingActContent(actId, content, userId);
  }

  async approveClosingAct(actId: string, orderId: string): Promise<void> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    await this.service.approveClosingAct(actId, orderId, userId);
  }

  async reviewClosingActAsClient(
    orderId: string,
    actId: string,
    input: ClientActDecisionInput,
  ): Promise<string | undefined> {
    return this.service.reviewClosingActAsClient(orderId, actId, input);
  }

  async closeOrderWithPdf(orderId: string, actId: string): Promise<string> {
    return this.service.closeOrderWithPdf(orderId, actId);
  }
}
