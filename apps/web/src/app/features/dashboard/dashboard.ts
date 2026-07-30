import { Component, inject } from '@angular/core';
import { OrdersFacade } from '../orders/facades/orders.facade';
import { ClientsFacade } from '../clients/facades/clients.facade';
import { ORDER_STATUS_CONFIG } from '../orders/models/order-status-config';
import type { ServiceOrder } from '../orders/models/order.model';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { PieChart } from '../../shared/components/pie-chart/pie-chart';
import { BarList } from '../../shared/components/bar-list/bar-list';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { ProgressBar } from '../../shared/components/progress-bar/progress-bar';

@Component({
  selector: 'app-dashboard',
  imports: [StatCard, PieChart, BarList, StatusBadge, ProgressBar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly ordersFacade = inject(OrdersFacade);
  protected readonly clientsFacade = inject(ClientsFacade);

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
    return ORDER_STATUS_CONFIG[status].label;
  }

  protected statusColor(status: ServiceOrder['status']): string {
    return ORDER_STATUS_CONFIG[status].color;
  }

  protected statusProgress(status: ServiceOrder['status']): number {
    return ORDER_STATUS_CONFIG[status].progress;
  }

  protected formatVisitDay(date: Date): string {
    return date.toLocaleDateString('es-CO', { day: 'numeric' });
  }

  protected formatVisitMonth(date: Date): string {
    return date.toLocaleDateString('es-CO', { month: 'short' });
  }
}
