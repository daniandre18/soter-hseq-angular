import { Component, inject } from '@angular/core';
import { OrdersFacade } from '../orders/facades/orders.facade';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly ordersFacade = inject(OrdersFacade);

  constructor() {
    // Se activa acá (y no en el arranque de la app) porque este componente
    // solo se monta detrás de authGuard/roleGuard, cuando ya hay sesión.
    // Arrancarlo antes de autenticarse causaba un permission-denied
    // permanente en el listener de Firestore (nunca se reintenta tras
    // loguearse).
    this.ordersFacade.init();
  }
}
