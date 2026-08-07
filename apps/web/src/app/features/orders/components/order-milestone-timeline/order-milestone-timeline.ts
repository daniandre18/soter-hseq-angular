import { Component, computed, input } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';
import { Icon } from '../../../../shared/components/icon/icon';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { deriveOrderMilestones } from '../../models/order-milestone.model';
import type { OrderEvent } from '../../models/order-event.model';
import type { ServiceOrder } from '../../models/order.model';

/** "Estado de Actividades": timeline vertical de 5 hitos genéricos del
 *  ciclo de vida de la orden (columna derecha de `OrderDetail`). Consume
 *  `deriveOrderMilestones` — ver ese archivo para la lógica de derivación
 *  a partir de datos reales, no una lista inventada. */
@Component({
  selector: 'app-order-milestone-timeline',
  imports: [Icon, TranslocoPipe, LocalizedDatePipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-milestone-timeline.html',
  styleUrl: './order-milestone-timeline.scss',
})
export class OrderMilestoneTimeline {
  readonly order = input.required<ServiceOrder>();
  readonly events = input<OrderEvent[]>([]);

  protected readonly milestones = computed(() => deriveOrderMilestones(this.order(), this.events()));
}
