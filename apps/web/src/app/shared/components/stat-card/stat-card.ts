import { Component, input } from '@angular/core';

export type StatCardColor = 'brand' | 'green' | 'red' | 'orange' | 'blue' | 'purple';

@Component({
  selector: 'app-stat-card',
  imports: [],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly color = input<StatCardColor>('brand');
}
