import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersFacade } from '../orders/facades/orders.facade';
import { ClientsFacade } from '../clients/facades/clients.facade';
import { ORDER_STATUS_CONFIG } from '../orders/models/order-status-config';
import type { ServiceOrder } from '../orders/models/order.model';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { BarList } from '../../shared/components/bar-list/bar-list';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { Avatar } from '../../shared/components/avatar/avatar';
import { Icon } from '../../shared/components/icon/icon';
import { formatDateNumeric } from '../../shared/utils/format-date';

@Component({
  selector: 'app-dashboard',
  imports: [StatCard, BarList, StatusBadge, Avatar, Icon, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly ordersFacade = inject(OrdersFacade);
  protected readonly clientsFacade = inject(ClientsFacade);
  protected readonly formatDateNumeric = formatDateNumeric;

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

  protected primaryTechnicianName(order: ServiceOrder): string | null {
    const [firstId] = order.assignedTechnicianIds;
    return firstId ? this.ordersFacade.technicianName(firstId) : null;
  }

  protected formatVisitDay(date: Date): string {
    return date.toLocaleDateString('es-CO', { day: 'numeric' });
  }

  protected formatVisitMonth(date: Date): string {
    return date.toLocaleDateString('es-CO', { month: 'short' });
  }
}
