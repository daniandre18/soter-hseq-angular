import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersFacade } from '../orders/facades/orders.facade';
import { ClientsFacade } from '../clients/facades/clients.facade';
import { ORDER_STATUS_CONFIG } from '../orders/models/order-status-config';
import type { ServiceOrder } from '../orders/models/order.model';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { BarList } from '../../shared/components/bar-list/bar-list';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { ProgressBar } from '../../shared/components/progress-bar/progress-bar';
import { Icon } from '../../shared/components/icon/icon';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-dashboard',
  imports: [StatCard, BarList, StatusBadge, ProgressBar, Icon, RouterLink, TranslocoPipe],
  providers: [...provideTranslocoScope('dashboard', 'orders')],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly ordersFacade = inject(OrdersFacade);
  protected readonly clientsFacade = inject(ClientsFacade);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  protected readonly translatedStatusBreakdown = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    return this.ordersFacade.statusBreakdown().map((slice) => ({
      ...slice,
      label: this.transloco.translate(slice.label),
    }));
  });

  constructor() {
    // Se activan acá (y no en el arranque de la app) porque este componente
    // solo se monta detrás de authGuard/roleGuard, cuando ya hay sesión.
    // Arrancarlos antes de autenticarse causaba un permission-denied
    // permanente en el listener de Firestore (nunca se reintenta tras
    // loguearse).
    this.ordersFacade.init();
    this.clientsFacade.init();
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
}
