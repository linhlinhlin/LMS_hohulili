import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface CategoryCta {
  text: string;
  link?: string | any[];
  queryParams?: Record<string, unknown>;
  variant?: 'primary' | 'secondary';
}

@Component({
  selector: 'app-category-hero',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="relative text-white" [ngClass]="gradientClass" role="banner" [attr.aria-label]="'Trang chủ danh mục ' + title">
      <div class="absolute inset-0 bg-black/15" *ngIf="overlay" aria-hidden="true"></div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div class="flex items-center space-x-3 mb-6" *ngIf="iconEmoji">
              <div class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl" [ngClass]="iconBgClass">
                {{ iconEmoji }}
              </div>
              <div>
                <h1 class="text-4xl lg:text-5xl font-bold mb-2">{{ title }}</h1>
                <p class="text-lg opacity-90" [ngClass]="subtitleColorClass">{{ subtitle }}</p>
              </div>
            </div>
            <ng-container *ngIf="!iconEmoji">
              <h1 class="text-4xl lg:text-5xl font-bold mb-3">{{ title }}</h1>
              <p class="text-lg opacity-90 mb-8" [ngClass]="subtitleColorClass">{{ subtitle }}</p>
            </ng-container>

            <div class="flex flex-col sm:flex-row gap-4" *ngIf="primaryCta || secondaryCta">
              <a *ngIf="primaryCta"
                 [routerLink]="primaryCta.link"
                 [queryParams]="primaryCta.queryParams"
                 [attr.aria-label]="'Hành động chính: ' + primaryCta.text"
                 class="px-8 py-4 rounded-lg font-semibold transition-colors duration-200 text-center"
                 [ngClass]="primaryBtnClass">
                {{ primaryCta.text }}
              </a>
              <a *ngIf="secondaryCta"
                 [routerLink]="secondaryCta.link"
                 [queryParams]="secondaryCta.queryParams"
                 [attr.aria-label]="'Hành động phụ: ' + secondaryCta.text"
                 class="px-8 py-4 rounded-lg font-semibold transition-colors duration-200 text-center border-2"
                 [ngClass]="secondaryBtnClass">
                {{ secondaryCta.text }}
              </a>
            </div>
          </div>
          <div class="hidden lg:block" aria-hidden="true">
            <ng-container *ngIf="imageUrl; else placeholder">
              <img [src]="imageUrl" [alt]="'Hình ảnh minh họa cho ' + title" class="w-full h-72 object-cover rounded-2xl shadow-2xl" />
            </ng-container>
            <ng-template #placeholder>
              <div class="h-72 rounded-2xl bg-white/10 backdrop-blur-sm shadow-2xl"></div>
            </ng-template>
          </div>
        </div>
      </div>
    </section>
  `
})
export class CategoryHeroComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() iconEmoji?: string;
  @Input() imageUrl?: string;

  // Tailwind classes for brand/gradient and tinting
  @Input() gradientFrom = 'from-slate-700';
  @Input() gradientVia = 'via-slate-800';
  @Input() gradientTo = 'to-slate-900';
  @Input() overlay = true;

  // Color tokens per category for buttons and icon background
  @Input() brandColor = 'blue'; // blue | green | amber | indigo | rose | cyan

  @Input() primaryCta?: CategoryCta;
  @Input() secondaryCta?: CategoryCta;

  get gradientClass(): string {
    return `bg-gradient-to-br ${this.gradientFrom} ${this.gradientVia} ${this.gradientTo}`;
  }

  get subtitleColorClass(): string {
    switch (this.brandColor) {
      case 'green': return 'text-green-100';
      case 'amber': return 'text-amber-100';
      case 'indigo': return 'text-indigo-100';
      case 'rose': return 'text-rose-100';
      case 'cyan': return 'text-cyan-100';
      default: return 'text-blue-100';
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

  get primaryBtnClass(): string {
    switch (this.brandColor) {
      case 'green': return 'bg-white text-green-600 hover:bg-gray-100';
      case 'amber': return 'bg-white text-amber-700 hover:bg-gray-100';
      case 'indigo': return 'bg-white text-indigo-700 hover:bg-gray-100';
      case 'rose': return 'bg-white text-rose-700 hover:bg-gray-100';
      case 'cyan': return 'bg-white text-cyan-700 hover:bg-gray-100';
      default: return 'bg-white text-blue-600 hover:bg-gray-100';
    }
  }

  get secondaryBtnClass(): string {
    switch (this.brandColor) {
      case 'green': return 'border-white text-white hover:bg-white hover:text-green-600';
      case 'amber': return 'border-white text-white hover:bg-white hover:text-amber-700';
      case 'indigo': return 'border-white text-white hover:bg-white hover:text-indigo-700';
      case 'rose': return 'border-white text-white hover:bg-white hover:text-rose-700';
      case 'cyan': return 'border-white text-white hover:bg-white hover:text-cyan-700';
      default: return 'border-white text-white hover:bg-white hover:text-blue-600';
    }
  }
}


