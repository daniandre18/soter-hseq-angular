import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { LanguageService } from '../../../../core/i18n/language.service';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Combobox, type ComboboxOption } from '../../../../shared/components/combobox/combobox';
import { OrderFormModal } from '../../components/order-form-modal/order-form-modal';
import { OrderInfoCard } from '../../components/order-info-card/order-info-card';
import { OrderManagementCard } from '../../components/order-management-card/order-management-card';
import { OrderAdvanceForm } from '../../components/order-advance-form/order-advance-form';
import { OrderEvidenceCard } from '../../components/order-evidence-card/order-evidence-card';
import { OrderActivityFeed } from '../../components/order-activity-feed/order-activity-feed';
import { OrderClosingActCard } from '../../components/order-closing-act-card/order-closing-act-card';
import { OrderMilestoneTimeline } from '../../components/order-milestone-timeline/order-milestone-timeline';
import { OrderClosureActionsCard } from '../../components/order-closure-actions-card/order-closure-actions-card';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import { ORDER_PRIORITY_CONFIG } from '../../models/order-priority-config';
import type { ServiceOrder } from '../../models/order.model';

const SCHEDULABLE_STATUSES = new Set<ServiceOrder['status']>(['DRAFT', 'SCHEDULED']);
const ASSIGNABLE_STATUSES = new Set<ServiceOrder['status']>(['SCHEDULED', 'ASSIGNED']);
const CANCELLABLE_STATUSES = new Set<ServiceOrder['status']>(['DRAFT', 'SCHEDULED', 'ASSIGNED']);
const MIN_EVIDENCE_COUNT_FOR_REVIEW = 1;

/**
 * Detalle de una Orden de Trabajo como página completa (sustituye al
 * antiguo `OrderDetailModal`). Concentra los permisos por rol+estado (los
 * mismos que tenía el modal, ver CLAUDE.md §3 y §10.2) y los datos en vivo
 * de la orden; cada tarjeta hija es presentacional y recibe lo que
 * necesita por `input()` — las mutaciones propias de cada tarjeta
 * (programar, asignar, registrar avance, subir evidencia, Acta) viven en
 * la tarjeta correspondiente, no aquí, para no volver a esta página una
 * fachada gigantesca (CLAUDE.md §29).
 */
@Component({
  selector: 'app-order-detail',
  imports: [
    RouterLink,
    StatusBadge,
    Combobox,
    OrderFormModal,
    OrderInfoCard,
    OrderManagementCard,
    OrderAdvanceForm,
    OrderEvidenceCard,
    OrderActivityFeed,
    OrderClosingActCard,
    OrderMilestoneTimeline,
    OrderClosureActionsCard,
    TranslocoPipe,
  ],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly ordersFacade = inject(OrdersFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  private readonly orderId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  protected readonly order = computed<ServiceOrder | undefined>(() =>
    this.ordersFacade.byId(this.orderId()),
  );
  /** Solo se considera "no encontrada" una vez que el listener de Firestore
   *  ya trajo datos — evita un parpadeo de "no encontrada" mientras carga. */
  protected readonly notFound = computed(
    () => !this.ordersFacade.loading() && this.orderId() !== '' && !this.order(),
  );

  protected readonly role = computed(() => this.authFacade.currentRole());
  protected readonly backRoute = computed(() => (this.role() === 'TECHNICIAN' ? '/mis-ordenes' : '/ordenes'));

  protected readonly notes = toSignal(
    toObservable(this.order).pipe(
      switchMap((order) => (order ? this.ordersFacade.watchNotes(order.id) : of([]))),
    ),
    { initialValue: [] },
  );
  protected readonly evidenceList = toSignal(
    toObservable(this.order).pipe(
      switchMap((order) => (order ? this.ordersFacade.watchEvidence(order.id) : of([]))),
    ),
    { initialValue: [] },
  );
  protected readonly events = toSignal(
    toObservable(this.order).pipe(
      switchMap((order) => (order ? this.ordersFacade.watchOrderEvents(order.id) : of([]))),
    ),
    { initialValue: [] },
  );
  protected readonly closingAct = toSignal(
    toObservable(this.order).pipe(
      switchMap((order) => (order ? this.ordersFacade.watchClosingAct(order.id) : of(null))),
    ),
    { initialValue: null },
  );
  protected readonly resolveAuthorName = (id: string) => this.ordersFacade.displayNameFor(id);
  protected readonly activityCount = computed(() => this.notes().length + this.evidenceList().length);

  protected readonly statusLabel = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    const order = this.order();
    return order ? this.transloco.translate(ORDER_STATUS_CONFIG[order.status].translationKey) : '';
  });
  protected readonly statusColor = computed(() =>
    this.order() ? ORDER_STATUS_CONFIG[this.order()!.status].color : 'gray',
  );
  protected readonly priorityLabel = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    const order = this.order();
    return order ? this.transloco.translate(ORDER_PRIORITY_CONFIG[order.priority].translationKey) : '';
  });
  protected readonly priorityColor = computed(() =>
    this.order() ? ORDER_PRIORITY_CONFIG[this.order()!.priority].color : 'gray',
  );

  protected readonly assignedTechnicianNames = computed(
    () => this.order()?.assignedTechnicianIds.map((id) => this.ordersFacade.technicianName(id)) ?? [],
  );

  // --- Permisos (idénticos a los del antiguo OrderDetailModal) ---
  protected readonly canManage = computed(() => {
    const role = this.role();
    return role === 'ADMIN' || role === 'COORDINATOR';
  });
  protected readonly canEditOrder = computed(() => {
    const order = this.order();
    return this.canManage() && !!order && order.status !== 'CLOSED' && order.status !== 'CANCELLED';
  });
  protected readonly canSchedule = computed(() => {
    const order = this.order();
    return this.canManage() && !!order && SCHEDULABLE_STATUSES.has(order.status);
  });
  protected readonly canAssign = computed(() => {
    const order = this.order();
    return this.canManage() && !!order && ASSIGNABLE_STATUSES.has(order.status);
  });
  protected readonly canCancel = computed(() => {
    const order = this.order();
    return this.canManage() && !!order && CANCELLABLE_STATUSES.has(order.status);
  });
  protected readonly canChangeStatusFreely = computed(() => {
    const order = this.order();
    return this.canManage() && !!order && order.status !== 'CLOSED';
  });
  protected readonly canExecute = computed(() => {
    const order = this.order();
    const uid = this.authFacade.currentUser()?.id;
    return (
      !!order &&
      this.role() === 'TECHNICIAN' &&
      !!uid &&
      order.assignedTechnicianIds.includes(uid) &&
      order.status === 'ASSIGNED'
    );
  });
  protected readonly canLog = computed(() => {
    const order = this.order();
    if (!order || order.status === 'CLOSED') {
      return false;
    }
    const role = this.role();
    return role === 'ADMIN' || role === 'COORDINATOR' || role === 'TECHNICIAN';
  });
  protected readonly canRequestClosure = computed(() => {
    const order = this.order();
    const uid = this.authFacade.currentUser()?.id;
    return (
      !!order &&
      this.role() === 'TECHNICIAN' &&
      !!uid &&
      order.assignedTechnicianIds.includes(uid) &&
      (order.status === 'IN_PROGRESS' || order.status === 'CORRECTION_REQUIRED')
    );
  });
  /** Igual gate que exigía "Enviar a Revisión" en el modal (CLAUDE.md §10.2:
   *  "no enviar a revisión sin notas"/"sin evidencia mínima"). */
  protected readonly closureBlockedReason = computed<string | null>(() => {
    if (this.notes().length === 0) {
      return this.transloco.translate('orders.page.closure.blockedNoNotes');
    }
    if (this.evidenceList().length < MIN_EVIDENCE_COUNT_FOR_REVIEW) {
      return this.transloco.translate('orders.page.closure.blockedNoEvidence');
    }
    return null;
  });
  protected readonly canRequestCorrection = computed(
    () => this.canManage() && this.order()?.status === 'UNDER_REVIEW',
  );
  protected readonly canRequestActa = computed(
    () => this.canLog() && this.order()?.status === 'UNDER_REVIEW' && !this.closingAct(),
  );
  protected readonly canEditActa = computed(() => {
    const act = this.closingAct();
    return this.canManage() && !!act && act.status !== 'APPROVED' && act.status !== 'FINAL';
  });
  protected readonly canApproveActa = computed(() => {
    const act = this.closingAct();
    return this.canManage() && !!act && act.status !== 'APPROVED' && act.status !== 'FINAL';
  });
  protected readonly canCloseOrder = computed(() => {
    const act = this.closingAct();
    return this.canManage() && !!act && act.status === 'APPROVED';
  });

  // --- Buscador rápido de órdenes (barra superior) ---
  protected readonly searchOptions = computed<ComboboxOption[]>(() =>
    this.ordersFacade
      .orders()
      .map((order) => ({ value: order.id, label: `${order.orderNumber} · ${order.clientBusinessName}` })),
  );
  protected readonly searchValue = signal('');

  protected onSearchSelect(orderId: string): void {
    this.searchValue.set('');
    if (orderId) {
      void this.router.navigate(['/ordenes', orderId]);
    }
  }

  // --- Edición de metadatos: sigue abriendo el modal existente (fuera de alcance de este rediseño) ---
  protected readonly formOpen = signal(false);

  protected openEdit(): void {
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }
}
