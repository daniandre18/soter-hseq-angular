import { Component, computed, input } from '@angular/core';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

export interface BarListItem {
  key: string;
  label: string;
  value: number;
}

const BAR_COLOR = '#4f46e5';

@Component({
  selector: 'app-bar-list',
  imports: [BaseChartDirective],
  templateUrl: './bar-list.html',
  styleUrl: './bar-list.scss',
})
export class BarList {
  readonly items = input<BarListItem[]>([]);
  readonly unit = input('');
  readonly emptyMessage = input('Sin datos');

  protected readonly chartType = 'bar' as const;

  protected readonly chartHeight = computed(() => Math.max(1, this.items().length) * 2.25 + 'rem');

  protected readonly chartData = computed<ChartData<'bar', number[], string>>(() => ({
    labels: this.items().map((item) => item.label),
    datasets: [
      {
        data: this.items().map((item) => item.value),
        backgroundColor: BAR_COLOR,
        borderRadius: 6,
        barThickness: 14,
      },
    ],
  }));

  protected readonly chartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const unit = this.unit();
    return {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: '#f3f4f6' },
        },
        y: {
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.formattedValue} ${unit}`.trimEnd(),
          },
        },
      },
    };
  });
}
