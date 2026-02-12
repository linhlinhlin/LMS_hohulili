import { Component, OnInit, ElementRef, signal, effect, input, ChangeDetectionStrategy, viewChild } from '@angular/core';

import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

export interface RevenueData {
  labels: string[];
  data: number[];
}

@Component({
  selector: 'app-revenue-chart',
  imports: [],
  template: `
    <div class="chart-container">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      height: 400px;
      width: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RevenueChartComponent implements OnInit {
  readonly chartCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  
  // Input data
  revenueData = input<RevenueData>({
    labels: [],
    data: []
  });
  
  private chart: Chart | null = null;
  private isInitialized = signal(false);

  constructor() {
    // Watch for data changes and update chart
    effect(() => {
      const data = this.revenueData();
      if (this.isInitialized() && this.chart) {
        this.updateChart(data);
      }
    });
  }

  ngOnInit(): void {
    this.initChart();
    this.isInitialized.set(true);
  }

  private initChart(): void {
    const ctx = this.chartCanvas().nativeElement.getContext('2d');
    if (!ctx) return;

    const data = this.revenueData();

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: data.data,
          borderColor: '#0056D2',
          backgroundColor: 'rgba(0, 86, 210, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#0056D2',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              padding: 15,
              font: {
                size: 12,
                family: "'Inter', sans-serif"
              },
              color: '#6b7280'
            }
          },
          tooltip: {
            backgroundColor: '#111827',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#374151',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                if (typeof value === 'number') {
                  return `Doanh thu: ${this.formatCurrency(value)}`;
                }
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 11,
                family: "'Inter', sans-serif"
              },
              color: '#9ca3af'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#f3f4f6'
            },
            border: {
              display: false
            },
            ticks: {
              font: {
                size: 11,
                family: "'Inter', sans-serif"
              },
              color: '#9ca3af',
              callback: (value) => {
                if (typeof value === 'number') {
                  return this.formatCurrency(value);
                }
                return value;
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(data: RevenueData): void {
    if (!this.chart) return;

    this.chart.data.labels = data.labels;
    this.chart.data.datasets[0].data = data.data;
    this.chart.update('none'); // Update without animation for better performance
  }

  private formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
