import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { ClientsFacade } from '../../../clients/facades/clients.facade';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Icon } from '../../../../shared/components/icon/icon';
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
import { OrderTeamCard } from '../../components/order-team-card/order-team-card';
import { OrderClientContactCard } from '../../components/order-client-contact-card/order-client-contact-card';
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
export type OrderDetailTab = 'detail' | 'advance' | 'activity';
const MOBILE_TAB_ORDER: OrderDetailTab[] = ['detail', 'advance', 'activity'];

@Component({
  selector: 'app-order-detail',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    Icon,
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
    OrderTeamCard,
    OrderClientContactCard,
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
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  /** <768px: header compacto + navegación por pestañas en vez del grid de
   *  2 columnas — evita el scroll excesivo que generaba apilar todas las
   *  tarjetas en una sola columna larga. Solo una de las dos estructuras
   *  se instancia a la vez (`@if`/`@else` en el template), así que un
   *  formulario con estado local (p. ej. el textarea de Registro de
   *  Avance) nunca vive duplicado entre el layout de escritorio y el
   *  móvil. */
  private readonly mobileQuery = window.matchMedia('(max-width: 767px)');
  protected readonly isMobile = signal(this.mobileQuery.matches);

  protected readonly activeTab = signal<OrderDetailTab>('detail');

  protected setTab(tab: OrderDetailTab): void {
    this.activeTab.set(tab);
  }

  /** Mismo patrón WAI-ARIA tabs (roving tabindex + flechas) que ya se usaba
   *  en el antiguo `OrderDetailModal`. */
  protected onTabKeydown(event: KeyboardEvent, current: OrderDetailTab): void {
    const currentIndex = MOBILE_TAB_ORDER.indexOf(current);
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % MOBILE_TAB_ORDER.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + MOBILE_TAB_ORDER.length) % MOBILE_TAB_ORDER.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = MOBILE_TAB_ORDER.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextTab = MOBILE_TAB_ORDER[nextIndex];
    this.activeTab.set(nextTab);
    document.getElementById(`order-tab-${nextTab}`)?.focus();
  }

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
  protected readonly currentUserDisplayName = computed(
    () => this.authFacade.currentUser()?.displayName ?? '',
  );
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

  protected readonly assignedTechnicianNames = computed(() => {
    const order = this.order();
    if (!order) {
      return [];
    }
    return order.assignedTechnicianNames?.length
      ? order.assignedTechnicianNames
      : order.assignedTechnicianIds.map((id) => this.ordersFacade.technicianName(id));
  });
  /** Objetos completos (no solo el nombre) para la tarjeta de equipo de la
   *  columna derecha — mismo `technicians()` que ya carga `OrdersFacade`
   *  para la asignación, sin ninguna consulta nueva. */
  protected readonly assignedTechnicians = computed(() => {
    const ids = new Set(this.order()?.assignedTechnicianIds ?? []);
    return this.ordersFacade.technicians().filter((technician) => ids.has(technician.id));
  });

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
  protected readonly canReviewActAsClient = computed(() => {
    const act = this.closingAct();
    return (
      this.role() === 'VIEWER' &&
      this.order()?.status === 'APPROVED' &&
      !!act &&
      act.status === 'APPROVED'
    );
  });

  constructor() {
    // Igual guardia que `orders-list.ts`: `firestore.rules` no deja leer
    // `clients/{id}` a TECHNICIAN/VIEWER, así que solo se pide si el rol
    // puede — nunca se intenta y se descarta el error.
    if (this.canManage()) {
      this.clientsFacade.init();
    }

    const onMobileQueryChange = (event: MediaQueryListEvent): void => this.isMobile.set(event.matches);
    this.mobileQuery.addEventListener('change', onMobileQueryChange);
    this.destroyRef.onDestroy(() => this.mobileQuery.removeEventListener('change', onMobileQueryChange));
  }

  /** Contacto del cliente para la columna derecha — solo ADMIN/COORDINATOR
   *  (ver constructor). Para el resto de roles queda `undefined` y la
   *  tarjeta simplemente no se renderiza. */
  protected readonly client = computed(() => {
    const order = this.order();
    return this.canManage() && order ? this.clientsFacade.byId(order.clientId) : undefined;
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

  /** Acción rápida desde "Técnicos asignados" (sin asignar) en la tarjeta
   *  de Información — lleva la vista al bloque de asignación ya existente
   *  en `OrderManagementCard`, sin duplicar ese formulario aquí. */
  protected scrollToAssign(): void {
    document.getElementById('order-assign-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
