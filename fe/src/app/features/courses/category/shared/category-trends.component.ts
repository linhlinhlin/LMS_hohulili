import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TrendCard {
  icon?: string;
  title: string;
  highlight?: string;
  description: string;
}

@Component({
  selector: 'app-category-trends',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="py-16 bg-white" role="region" [attr.aria-label]="'Xu hướng ngành: ' + title">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">{{ title }}</h2>
          <p class="text-lg text-gray-600 max-w-3xl mx-auto" *ngIf="subtitle">{{ subtitle }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8" role="list" aria-label="Danh sách xu hướng ngành">
          <div class="rounded-2xl p-8" *ngFor="let card of cards; trackBy: trackByTitle" [ngClass]="containerBgClass" role="listitem" [attr.aria-label]="'Xu hướng: ' + card.title">
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl" [ngClass]="iconBgClass" *ngIf="card.icon" aria-hidden="true">
                <span>{{ card.icon }}</span>
              </div>
              <div>
                <h3 class="text-xl font-bold text-gray-900">{{ card.title }}</h3>
                <p class="font-medium" [ngClass]="accentTextClass" *ngIf="card.highlight" [attr.aria-label]="'Điểm nổi bật: ' + card.highlight">{{ card.highlight }}</p>
              </div>
            </div>
            <p class="text-gray-600">{{ card.description }}</p>
          </div>
        </div>
      </div>
    </section>
  `
})
export class CategoryTrendsComponent {
  @Input() title = 'Xu hướng ngành';
  @Input() subtitle?: string;
  @Input() brandColor: 'blue' | 'green' | 'amber' | 'indigo' | 'rose' | 'cyan' = 'blue';
  @Input() cards: TrendCard[] = [];

  trackByTitle(index: number, card: TrendCard): string {
    return card.title;
  }

  get accentTextClass(): string {
    switch (this.brandColor) {
      case 'green': return 'text-green-600';
      case 'amber': return 'text-amber-700';
      case 'indigo': return 'text-indigo-700';
      case 'rose': return 'text-rose-700';
      case 'cyan': return 'text-cyan-700';
      default: return 'text-blue-600';
    }
  }

  get iconBgClass(): string {
    switch (this.brandColor) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-amber-500';
      case 'indigo': return 'bg-indigo-500';
      case 'rose': return 'bg-rose-500';
      case 'cyan': return 'bg-cyan-500';
      default: return 'bg-blue-500';
    }
  }

  get containerBgClass(): string {
    switch (this.brandColor) {
      case 'green': return 'bg-gradient-to-br from-green-50 to-green-100';
      case 'amber': return 'bg-gradient-to-br from-amber-50 to-amber-100';
      case 'indigo': return 'bg-gradient-to-br from-indigo-50 to-indigo-100';
      case 'rose': return 'bg-gradient-to-br from-rose-50 to-rose-100';
      case 'cyan': return 'bg-gradient-to-br from-cyan-50 to-cyan-100';
      default: return 'bg-gradient-to-br from-blue-50 to-blue-100';
    }
  }
}


