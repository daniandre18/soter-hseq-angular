import { Component, input } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';
import { Icon } from '../../../../shared/components/icon/icon';
import type { Client } from '../../../clients/models/client.model';

/**
 * "Contacto en Sitio / Cliente": teléfono, correo y dirección del cliente
 * para la columna derecha de `OrderDetail`. Solo se pide/renderiza para
 * ADMIN/COORDINATOR — `firestore.rules` no permite que TECHNICIAN/VIEWER
 * lean `clients/{id}` directamente (ver `OrderDetail.client`), así que
 * este componente asume que si recibe un `client` es porque quien mira la
 * página ya tiene permiso de leerlo.
 */
@Component({
  selector: 'app-order-client-contact-card',
  imports: [Icon, TranslocoPipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-client-contact-card.html',
  styleUrl: './order-client-contact-card.scss',
})
export class OrderClientContactCard {
  readonly client = input.required<Client>();
}
