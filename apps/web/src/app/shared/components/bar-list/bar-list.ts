import { Component, computed, input } from '@angular/core';

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  /** Color fijo (hex) para la barra; si no se da, se asigna por ciclo. Útil
   *  cuando el dato ya tiene un color semántico propio (p. ej. el color de
   *  un estado), para no perder ese significado al mostrarlo como barra. */
  color?: string;
}

interface RenderedBarItem extends BarListItem {
  percentage: number;
  color: string;
}

// Se repite cada 3 filas, igual que la maqueta (azul, verde, ámbar).
const COLOR_CYCLE = ['#2563eb', '#16a34a', '#f59e0b'];

@Component({
  selector: 'app-bar-list',
  imports: [],
  templateUrl: './bar-list.html',
  styleUrl: './bar-list.scss',
})
export class BarList {
  readonly items = input<BarListItem[]>([]);
  readonly unit = input('');
  readonly emptyMessage = input('Sin datos');
  /** Muestra el valor absoluto (p. ej. "8") junto al porcentaje. */
  readonly showValue = input(false);

  protected readonly renderedItems = computed<RenderedBarItem[]>(() => {
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
