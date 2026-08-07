import { Component, input } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Icon } from '../../../../shared/components/icon/icon';
import { LocalizedRelativeTimePipe } from '../../../../shared/pipes/localized-relative-time.pipe';
import type { AppUser } from '../../../../core/models/app-user.model';

/**
 * Columna derecha: equipo asignado (con contacto) + un resumen rápido de
 * notas/evidencia/antigüedad. Llena el espacio vacío que quedaba bajo el
 * timeline de hitos con información que ya se carga en la página (no
 * agrega ninguna consulta nueva — `technicians` sale del mismo
 * `OrdersFacade.technicians()` que ya usa `OrderManagementCard`).
 * Presentacional puro.
 */
@Component({
  selector: 'app-order-team-card',
  imports: [Avatar, Icon, TranslocoPipe, LocalizedRelativeTimePipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-team-card.html',
  styleUrl: './order-team-card.scss',
})
export class OrderTeamCard {
  readonly technicians = input<AppUser[]>([]);
  readonly notesCount = input(0);
  readonly evidenceCount = input(0);
  readonly createdAt = input.required<Date>();
}
