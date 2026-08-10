import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OrdersFacade } from '../../facades/orders.facade';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { Card } from '../../../../shared/components/card/card';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import type { ServiceOrder } from '../../models/order.model';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { releaseOnDestroy } from '../../../../shared/utils/release-on-destroy';

const ACTIVE_STATUSES = new Set<ServiceOrder['status']>(['ASSIGNED', 'IN_PROGRESS']);

@Component({
  selector: 'app-my-orders',
  imports: [Card, StatCard, StatusBadge, TranslocoPipe, LocalizedDatePipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.scss',
})
export class MyOrders {
  protected readonly ordersFacade = inject(OrdersFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  protected readonly myOrders = computed(() => {
    const uid = this.authFacade.currentUser()?.id;
    return uid ? this.ordersFacade.orders().filter((order) => order.assignedTechnicianIds.includes(uid)) : [];
  });

  protected readonly assignedCount = computed(
    () => this.myOrders().filter((order) => order.status === 'ASSIGNED').length,
  );

  protected readonly inProgressCount = computed(
    () => this.myOrders().filter((order) => order.status === 'IN_PROGRESS').length,
  );

  protected readonly activeOrders = computed(() =>
    this.myOrders()
      .filter((order) => ACTIVE_STATUSES.has(order.status))
      .sort((a, b) => (a.scheduledStart?.getTime() ?? 0) - (b.scheduledStart?.getTime() ?? 0)),
  );

  protected readonly otherOrders = computed(() =>
    this.myOrders()
      .filter((order) => !ACTIVE_STATUSES.has(order.status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
  );

  constructor() {
    releaseOnDestroy(this.ordersFacade.init());
  }

  protected statusLabel(status: ServiceOrder['status']): string {
    this.language.currentLanguage();
    return this.transloco.translate(ORDER_STATUS_CONFIG[status].translationKey);
  }

  protected statusColor(status: ServiceOrder['status']): string {
    return ORDER_STATUS_CONFIG[status].color;
  }

  protected openDetail(order: ServiceOrder): void {
    void this.router.navigate(['/ordenes', order.id]);
  }
}
