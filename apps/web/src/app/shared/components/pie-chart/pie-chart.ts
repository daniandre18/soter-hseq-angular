import { Component, computed, input } from '@angular/core';

export interface PieSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface RenderedSlice extends PieSlice {
  dashArray: string;
  dashOffset: number;
}

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

@Component({
  selector: 'app-pie-chart',
  imports: [],
  templateUrl: './pie-chart.html',
  styleUrl: './pie-chart.scss',
})
export class PieChart {
  readonly slices = input<PieSlice[]>([]);
  readonly unit = input('');
  readonly emptyMessage = input('Sin datos');

  protected readonly radius = RADIUS;

  protected readonly total = computed(() =>
    this.slices().reduce((sum, slice) => sum + slice.value, 0),
  );

  protected readonly renderedSlices = computed<RenderedSlice[]>(() => {
    const total = this.total();
    if (total === 0) {
      return [];
    }
    let offset = 0;
    return this.slices().map((slice) => {
      const dash = (slice.value / total) * CIRCUMFERENCE;
      const rendered: RenderedSlice = {
        ...slice,
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -offset,
      };
      offset += dash;
      return rendered;
    });
  });
}
