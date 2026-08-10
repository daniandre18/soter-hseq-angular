import { Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

export type KpiCardColor = 'brand' | 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'neutral';

@Component({
  selector: 'app-kpi-card',
  imports: [Icon],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
})
export class KpiCard {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtitle = input<string>('');
  readonly icon = input.required<IconName>();
  readonly color = input<KpiCardColor>('brand');
  /** Texto del badge de alerta (p. ej. "2 Vencidas"); no se muestra si está vacío. */
  readonly alertText = input<string>('');
}
