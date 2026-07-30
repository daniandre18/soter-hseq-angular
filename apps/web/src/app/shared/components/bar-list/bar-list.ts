import { Component, computed, input } from '@angular/core';

export interface BarListItem {
  key: string;
  label: string;
  value: number;
}

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

  private readonly maxValue = computed(() =>
    Math.max(1, ...this.items().map((item) => item.value)),
  );

  protected widthFor(value: number): number {
    return (value / this.maxValue()) * 100;
  }
}
