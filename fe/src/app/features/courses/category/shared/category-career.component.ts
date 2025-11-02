import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CareerCard {
  title: string;
  description: string;
  salary?: string;
  requirements: string[];
}

@Component({
  selector: 'app-category-career',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="py-16 bg-gray-50" id="career" role="region" [attr.aria-label]="'Cơ hội nghề nghiệp: ' + title">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">{{ title }}</h2>
          <p class="text-lg text-gray-600 max-w-3xl mx-auto" *ngIf="subtitle">{{ subtitle }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" role="list" aria-label="Danh sách cơ hội nghề nghiệp">
          <div class="rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300" *ngFor="let card of cards; trackBy: trackByTitle"
               [ngClass]="containerBgClass" role="listitem" [attr.aria-label]="'Cơ hội nghề nghiệp: ' + card.title">
            <h3 class="text-xl font-bold text-gray-900 mb-3">{{ card.title }}</h3>
            <p class="text-gray-600 mb-4">{{ card.description }}</p>
            <div class="text-lg font-semibold mb-4" [ngClass]="accentTextClass" *ngIf="card.salary" [attr.aria-label]="'Mức lương: ' + card.salary">{{ card.salary }}</div>
            <div class="space-y-2">
              <h4 class="font-medium text-gray-900">Yêu cầu:</h4>
              <ul class="space-y-1" role="list" [attr.aria-label]="'Yêu cầu cho ' + card.title">
                <li class="text-sm text-gray-600 flex items-center" *ngFor="let req of card.requirements; trackBy: trackByRequirement" role="listitem">
                  <span class="w-2 h-2 rounded-full mr-2" [ngClass]="dotClass" aria-hidden="true"></span>
                  {{ req }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class CategoryCareerComponent {
  @Input() title = 'Cơ hội nghề nghiệp';
  @Input() subtitle?: string;
  @Input() brandColor: 'blue' | 'green' | 'amber' | 'indigo' | 'rose' | 'cyan' = 'blue';
  @Input() cards: CareerCard[] = [];

  trackByTitle(index: number, card: CareerCard): string {
    return card.title;
  }

  trackByRequirement(index: number, requirement: string): string {
    return requirement;
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

  get dotClass(): string {
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
      case 'green': return 'bg-gradient-to-br from-gray-50 to-gray-100';
      case 'amber': return 'bg-gradient-to-br from-gray-50 to-gray-100';
      case 'indigo': return 'bg-gradient-to-br from-gray-50 to-gray-100';
      case 'rose': return 'bg-gradient-to-br from-gray-50 to-gray-100';
      case 'cyan': return 'bg-gradient-to-br from-gray-50 to-gray-100';
      default: return 'bg-gradient-to-br from-gray-50 to-gray-100';
    }
  }
}


