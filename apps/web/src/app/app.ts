import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OrdersFacade } from './features/orders/facades/orders.facade';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('web');

  private readonly ordersFacade = inject(OrdersFacade);

  constructor() {
    // Activa la escucha en tiempo real de Firestore -> Store de Akita
    // desde el arranque de la aplicación.
    this.ordersFacade.init();
  }
}
