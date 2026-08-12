import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { DashboardFacade } from './facades/dashboard.facade';
import { ORDER_STATUS_CONFIG } from '../orders/models/order-status-config';
import type { ServiceOrder } from '../orders/models/order.model';
import { KpiCard } from '../../shared/components/kpi-card/kpi-card';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { SegmentedBar } from '../../shared/components/segmented-bar/segmented-bar';
import { FunnelChart, type FunnelStage } from '../../shared/components/funnel-chart/funnel-chart';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { ProgressBar } from '../../shared/components/progress-bar/progress-bar';
import { Avatar } from '../../shared/components/avatar/avatar';
import { Button } from '../../shared/components/button/button';
import { Icon } from '../../shared/components/icon/icon';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../core/i18n/language.service';
import { releaseOnDestroy } from '../../shared/utils/release-on-destroy';

@Component({
  selector: 'app-dashboard',
  imports: [
    KpiCard,
    Skeleton,
    SegmentedBar,
    FunnelChart,
    StatusBadge,
    ProgressBar,
    Avatar,
    Button,
    Icon,
    RouterLink,
    TranslocoPipe,
  ],
  providers: [...provideTranslocoScope('dashboard', 'orders', 'quotes')],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly dashboardFacade = inject(DashboardFacade);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  /** El scope `dashboard` de Transloco se carga async (ver
   *  `TranslocoHttpLoader`, un request HTTP por scope): los `computed()` de
   *  abajo llaman `transloco.translate()` de forma síncrona, así que si se
   *  renderizan antes de que ese request resuelva, muestran la clave cruda
   *  en vez del texto. Esta señal solo se vuelve `true` una vez el scope ya
   *  cargó, para poder tapar las KPI cards con un skeleton hasta entonces
   *  en vez de dejarlas mostrar "dashboard.kpi.algoOther" un instante.
   *  `TranslocoService.load()` espera la ruta completa `scope/idioma` (no
   *  solo el nombre del scope) — de ahí el `switchMap` sobre `langChanges$`,
   *  el mismo patrón que usa `selectTranslate()` internamente. */
  private readonly kpiTranslationsReady = toSignal(
    this.transloco.langChanges$.pipe(
      switchMap((lang) => this.transloco.load(`dashboard/${lang}`)),
      map(() => true),
    ),
    { initialValue: false },
  );
  protected readonly kpiReady = computed(
    () => this.kpiTranslationsReady() && !this.dashboardFacade.loading(),
  );

  protected readonly translatedStatusBreakdown = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    return this.dashboardFacade.statusBreakdown().map((slice) => ({
      ...slice,
      label: this.transloco.translate(slice.label),
    }));
  });

  /** KPI 1 — Órdenes Activas: abiertas + pendientes de iniciar. */
  protected readonly activeOrdersCount = computed(
    () => this.dashboardFacade.openCount() + this.dashboardFacade.pendingCount(),
  );

  protected readonly activeOrdersSubtitle = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    const open = this.dashboardFacade.openCount();
    const pending = this.dashboardFacade.pendingCount();
    const openLabel = this.transloco.translate(
      open === 1 ? 'dashboard.kpi.activeOrdersOpenOne' : 'dashboard.kpi.activeOrdersOpenOther',
      { count: open },
    );
    const pendingLabel = this.transloco.translate(
      pending === 1
        ? 'dashboard.kpi.activeOrdersPendingOne'
        : 'dashboard.kpi.activeOrdersPendingOther',
      { count: pending },
    );
    return `${openLabel}, ${pendingLabel}`;
  });

  protected readonly overdueAlertText = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    const overdue = this.dashboardFacade.overdueCount();
    if (overdue === 0) {
      return '';
    }
    return this.transloco.translate(
      overdue === 1 ? 'dashboard.kpi.overdueBadgeOne' : 'dashboard.kpi.overdueBadgeOther',
      { count: overdue },
    );
  });

  /** Total visible en el banner compacto; reúne ambos tipos de alerta que
   * requieren una acción desde el listado de órdenes. */
  protected readonly operationalAlertsCount = computed(
    () =>
      this.dashboardFacade.overdueCount() + this.dashboardFacade.correctionRequiredCount(),
  );

  /** KPI 2 — Recursos en Campo: técnicos con una orden EN_PROGRESO hoy, de
   *  todos los registrados con rol TECHNICIAN. */
  protected readonly fieldResourcesSubtitle = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    const active = this.dashboardFacade.techniciansInFieldCount();
    const total = this.dashboardFacade.technicianCount();
    return this.transloco.translate(
      active === 1 ? 'dashboard.kpi.fieldResourcesSubtitleOne' : 'dashboard.kpi.fieldResourcesSubtitleOther',
      { count: active, total },
    );
  });

  /** KPI 3 — Visitas de Hoy, con el total de la semana calendario como contexto. */
  protected readonly visitsWeekSubtitle = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    const count = this.dashboardFacade.visitsThisWeekCount();
    return this.transloco.translate(
      count === 1 ? 'dashboard.kpi.visitsWeekOne' : 'dashboard.kpi.visitsWeekOther',
      { count },
    );
  });

  /** KPI 4 — Conversión Comercial: % de cotizaciones convertidas en orden. */
  protected readonly conversionValue = computed(() => `${this.dashboardFacade.conversionRate()}%`);

  protected readonly conversionSubtitle = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    const total = this.dashboardFacade.quotesTotal();
    return this.transloco.translate(
      total === 1 ? 'dashboard.quotesTotalOne' : 'dashboard.quotesTotalOther',
      { count: total },
    );
  });

  /** Embudo comercial: Enviadas → Aprobadas → Convertidas. */
  protected readonly funnelStages = computed<FunnelStage[]>(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    const counts = this.dashboardFacade.funnelCounts();
    return [
      { key: 'sent', label: this.transloco.translate('dashboard.funnelSent'), value: counts.sent },
      {
        key: 'approved',
        label: this.transloco.translate('dashboard.funnelApproved'),
        value: counts.approved,
      },
      {
        key: 'converted',
        label: this.transloco.translate('dashboard.funnelConverted'),
        value: counts.converted,
      },
    ];
  });

  constructor() {
    // El listener del snapshot materializado se inicia acá porque la ruta ya
    // está detrás de authGuard/roleGuard. Al salir, la liberación impide que
    // una respuesta tardía actualice estado que ya no tiene consumidores.
    releaseOnDestroy(this.dashboardFacade.init());
  }

  protected statusLabel(status: ServiceOrder['status']): string {
    this.language.currentLanguage();
    return this.transloco.translate(ORDER_STATUS_CONFIG[status].translationKey);
  }

  protected statusColor(status: ServiceOrder['status']): string {
    return ORDER_STATUS_CONFIG[status].color;
  }

  protected statusProgress(order: ServiceOrder): number {
    return order.progress;
  }

  protected technicianNameFor(order: ServiceOrder): string {
    const id = order.assignedTechnicianIds[0];
    return id ? this.dashboardFacade.technicianNameFor(order) : '';
  }

  /** Reemplaza el "Sin iniciar" plano bajo el badge de estado (en "Órdenes
   *  Críticas / Recientes") por la fecha de ejecución programada o, si ya
   *  no hay ejecución futura, la fecha de vencimiento — más accionable que
   *  un texto fijo. Cae de vuelta a "Sin iniciar" si la orden no tiene
   *  ninguna fecha (p. ej. un `DRAFT` recién creado). */
  protected recentOrderScheduleLabel(order: ServiceOrder): string {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    if (order.scheduledStart) {
      return this.transloco.translate('dashboard.executionLabel', {
        day: this.formatRelativeDay(order.scheduledStart),
        time: this.formatVisitTime(order.scheduledStart),
      });
    }
    if (order.scheduledEnd) {
      return this.transloco.translate('dashboard.dueLabel', {
        date: this.formatRelativeDay(order.scheduledEnd),
      });
    }
    return this.transloco.translate('dashboard.notStarted');
  }

  private formatRelativeDay(date: Date): string {
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (isToday) {
      return this.transloco.translate('dashboard.today');
    }
    return date.toLocaleDateString(this.language.currentLocale(), { day: 'numeric', month: 'short' });
  }

  protected formatVisitDay(date: Date): string {
    return date.toLocaleDateString(this.language.currentLocale(), { day: 'numeric' });
  }

  protected formatVisitMonth(date: Date): string {
    return date.toLocaleDateString(this.language.currentLocale(), { month: 'short' });
  }

  protected formatVisitTime(date: Date): string {
    return date.toLocaleTimeString(this.language.currentLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  protected goToCreateOrder(): void {
    void this.router.navigate(['/ordenes'], { queryParams: { crear: '1' } });
  }

  protected goToScheduleVisit(): void {
    void this.router.navigate(['/agenda']);
  }
}
