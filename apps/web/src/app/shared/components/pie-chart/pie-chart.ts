import { Component, computed, input } from '@angular/core';
import {
  ArcElement,
  Legend,
  PieController,
  Tooltip,
  type ChartConfiguration,
  type ChartData,
} from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';

export interface PieSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface RenderedSlice extends PieSlice {
  percentage: number;
}

@Component({
  selector: 'app-pie-chart',
  imports: [BaseChartDirective],
  providers: [provideCharts({ registerables: [PieController, ArcElement, Tooltip, Legend] })],
  templateUrl: './pie-chart.html',
  styleUrl: './pie-chart.scss',
})
export class PieChart {
  readonly slices = input<PieSlice[]>([]);
  readonly unit = input('');
  readonly emptyMessage = input('Sin datos');

  protected readonly total = computed(() =>
    this.slices().reduce((sum, slice) => sum + slice.value, 0),
  );

  protected readonly renderedSlices = computed<RenderedSlice[]>(() => {
    const total = this.total();
    if (total === 0) {
      return [];
    }
    return this.slices().map((slice) => ({
      ...slice,
      percentage: Math.round((slice.value / total) * 100),
    }));
  });

  protected readonly chartType = 'pie' as const;

  protected readonly chartData = computed<ChartData<'pie', number[], string>>(() => ({
    labels: this.slices().map((slice) => slice.label),
    datasets: [
      {
        data: this.slices().map((slice) => slice.value),
        backgroundColor: this.slices().map((slice) => slice.color),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6,
      },
    ],
  }));

  protected readonly chartOptions = computed<ChartConfiguration<'pie'>['options']>(() => {
    const unit = this.unit();
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.label}: ${context.formattedValue} ${unit}`.trimEnd(),
          },
        },
      },
    };
  });
}
