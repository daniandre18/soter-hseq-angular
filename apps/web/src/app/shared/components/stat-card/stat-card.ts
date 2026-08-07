import { Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';
import { LocalizedNumberPipe } from '../../pipes/localized-number.pipe';

export type StatCardColor = 'brand' | 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'neutral';

@Component({
  selector: 'app-stat-card',
  imports: [Icon, LocalizedNumberPipe],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly icon = input.required<IconName>();
  readonly color = input<StatCardColor>('brand');
  readonly compact = input(false);
}
