import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ORDER_PRIORITY_CONFIG } from '../../models/order-priority-config';
import type { ServiceOrder } from '../../models/order.model';

/** Grid clave-valor de solo lectura con los datos generales de la orden
 *  (columna izquierda de `OrderDetail`, primera tarjeta). Presentacional
 *  puro: no inyecta la fachada ni Firestore. */
@Component({
  selector: 'app-order-info-card',
  imports: [RouterLink, Avatar, StatusBadge, TranslocoPipe, LocalizedDatePipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-info-card.html',
  styleUrl: './order-info-card.scss',
})
export class OrderInfoCard {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  readonly order = input.required<ServiceOrder>();
  readonly assignedTechnicianNames = input<string[]>([]);

  protected readonly priorityLabel = computed(() => {
    this.language.currentLanguage();
    this.language.translationsLoaded();
    return this.transloco.translate(ORDER_PRIORITY_CONFIG[this.order().priority].translationKey);
  });
  protected readonly priorityColor = computed(
    () => ORDER_PRIORITY_CONFIG[this.order().priority].color,
  );
}
