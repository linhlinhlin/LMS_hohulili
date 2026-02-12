import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent, IconName } from '../../../../shared/components/icon/icon.component';

export interface CategoryCta {
  text: string;
  link?: string | any[];
  queryParams?: Record<string, unknown>;
  variant?: 'primary' | 'secondary';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-category-hero',
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <section class="relative text-white" [ngClass]="gradientClass()" role="banner" [attr.aria-label]="'Trang chủ danh mục ' + title()">
      @if (overlay()) {
        <div class="absolute inset-0 bg-black/15" aria-hidden="true"></div>
      }
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            @if (iconEmoji()) {
              <div class="flex items-center space-x-3 mb-6">
                <div class="w-16 h-16 rounded-xl flex items-center justify-center" [ngClass]="iconBgClass()">
                  <app-icon [name]="iconEmoji()!" size="xl" class="text-white"/>
                </div>
                <div>
                  <h1 class="text-4xl lg:text-5xl font-bold mb-2">{{ title() }}</h1>
                  <p class="text-lg opacity-90" [ngClass]="subtitleColorClass()">{{ subtitle() }}</p>
                </div>
              </div>
            } @else {
              <h1 class="text-4xl lg:text-5xl font-bold mb-3">{{ title() }}</h1>
              <p class="text-lg opacity-90 mb-8" [ngClass]="subtitleColorClass()">{{ subtitle() }}</p>
            }

            @if (primaryCta() || secondaryCta()) {
              <div class="flex flex-col sm:flex-row gap-4">
                @if (primaryCta(); as cta) {
                  <a [routerLink]="cta.link"
                     [queryParams]="cta.queryParams"
                     [attr.aria-label]="'Hành động chính: ' + cta.text"
                     class="px-8 py-4 rounded-lg font-semibold transition-colors duration-200 text-center"
                     [ngClass]="primaryBtnClass()">
                    {{ cta.text }}
                  </a>
                }
                @if (secondaryCta(); as cta) {
                  <a [routerLink]="cta.link"
                     [queryParams]="cta.queryParams"
                     [attr.aria-label]="'Hành động phụ: ' + cta.text"
                     class="px-8 py-4 rounded-lg font-semibold transition-colors duration-200 text-center border-2"
                     [ngClass]="secondaryBtnClass()">
                    {{ cta.text }}
                  </a>
                }
              </div>
            }
          </div>
          <div class="hidden lg:block" aria-hidden="true">
            @if (imageUrl()) {
              <img [src]="imageUrl()" [alt]="'Hình ảnh minh họa cho ' + title()" class="w-full h-72 object-cover rounded-2xl shadow-2xl" />
            } @else {
              <div class="h-72 rounded-2xl bg-white/10 backdrop-blur-sm shadow-2xl"></div>
            }
          </div>
        </div>
      </div>
    </section>
  `
})
export class CategoryHeroComponent {
  title = input('');
  subtitle = input('');
  iconEmoji = input<IconName | undefined>(undefined);
  imageUrl = input<string | undefined>(undefined);

  // Tailwind classes for brand/gradient and tinting
  gradientFrom = input('from-slate-700');
  gradientVia = input('via-slate-800');
  gradientTo = input('to-slate-900');
  overlay = input(true);

  // Color tokens per category for buttons and icon background
  brandColor = input('blue'); // blue | green | amber | indigo | rose | cyan

  primaryCta = input<CategoryCta | undefined>(undefined);
  secondaryCta = input<CategoryCta | undefined>(undefined);

  gradientClass = computed(() =>
    `bg-gradient-to-br ${this.gradientFrom()} ${this.gradientVia()} ${this.gradientTo()}`
  );

  subtitleColorClass = computed(() => {
    switch (this.brandColor()) {
      case 'green': return 'text-green-100';
      case 'amber': return 'text-amber-100';
      case 'indigo': return 'text-indigo-100';
      case 'rose': return 'text-rose-100';
      case 'cyan': return 'text-cyan-100';
      default: return 'text-white/80';
    }
  });

  iconBgClass = computed(() => {
    switch (this.brandColor()) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-amber-500';
      case 'indigo': return 'bg-indigo-500';
      case 'rose': return 'bg-rose-500';
      case 'cyan': return 'bg-cyan-500';
      default: return 'bg-[#0056D2]';
    }
  });

  primaryBtnClass = computed(() => {
    switch (this.brandColor()) {
      case 'green': return 'bg-white text-green-600 hover:bg-gray-100';
      case 'amber': return 'bg-white text-amber-700 hover:bg-gray-100';
      case 'indigo': return 'bg-white text-indigo-700 hover:bg-gray-100';
      case 'rose': return 'bg-white text-rose-700 hover:bg-gray-100';
      case 'cyan': return 'bg-white text-cyan-700 hover:bg-gray-100';
      default: return 'bg-white text-[#0056D2] hover:bg-gray-100';
    }
  });

  secondaryBtnClass = computed(() => {
    switch (this.brandColor()) {
      case 'green': return 'border-white text-white hover:bg-white hover:text-green-600';
      case 'amber': return 'border-white text-white hover:bg-white hover:text-amber-700';
      case 'indigo': return 'border-white text-white hover:bg-white hover:text-indigo-700';
      case 'rose': return 'border-white text-white hover:bg-white hover:text-rose-700';
      case 'cyan': return 'border-white text-white hover:bg-white hover:text-cyan-700';
      default: return 'border-white text-white hover:bg-white hover:text-[#0056D2]';
    }
  });
}


