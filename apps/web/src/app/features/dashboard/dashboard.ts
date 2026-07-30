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
}
