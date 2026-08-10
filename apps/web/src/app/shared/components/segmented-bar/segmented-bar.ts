import { Component, computed, input } from '@angular/core';
import type { BarListItem } from '../bar-list/bar-list';

interface RenderedSegment extends BarListItem {
  percentage: number;
  color: string;
}

// Se repite si algún item no trae color propio — igual que en BarList.
const COLOR_CYCLE = ['#2563eb', '#16a34a', '#f59e0b'];

/** Barra de progreso horizontal única, dividida proporcionalmente en
 *  segmentos de color — a diferencia de `BarList` (una fila por item), acá
 *  todos los items comparten una sola barra, con la leyenda debajo. */
@Component({
  selector: 'app-segmented-bar',
  imports: [],
  templateUrl: './segmented-bar.html',
  styleUrl: './segmented-bar.scss',
})
export class SegmentedBar {
  readonly items = input<BarListItem[]>([]);
  readonly unit = input('');
  readonly emptyMessage = input('Sin datos');

  protected readonly renderedItems = computed<RenderedSegment[]>(() => {
    const items = this.items();
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return [];
    }
    return items.map((item, index) => ({
      ...item,
      percentage: Math.round((item.value / total) * 100),
      color: item.color ?? COLOR_CYCLE[index % COLOR_CYCLE.length],
    }));
  });
}
