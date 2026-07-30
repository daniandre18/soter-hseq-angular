import { Component, computed, input } from '@angular/core';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

export interface PieSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-pie-chart',
  imports: [BaseChartDirective],
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

  protected readonly chartType = 'doughnut' as const;

  protected readonly chartData = computed<ChartData<'doughnut', number[], string>>(() => ({
    labels: this.slices().map((slice) => slice.label),
    datasets: [
      {
        data: this.slices().map((slice) => slice.value),
        backgroundColor: this.slices().map((slice) => slice.color),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }));

  protected readonly chartOptions = computed<ChartConfiguration<'doughnut'>['options']>(() => {
    const unit = this.unit();
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
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
