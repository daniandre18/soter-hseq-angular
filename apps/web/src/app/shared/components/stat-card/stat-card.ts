import { Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

export type StatCardColor = 'brand' | 'green' | 'red' | 'orange' | 'blue' | 'purple';

@Component({
  selector: 'app-stat-card',
  imports: [Icon],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly icon = input.required<IconName>();
  readonly color = input<StatCardColor>('brand');
}
