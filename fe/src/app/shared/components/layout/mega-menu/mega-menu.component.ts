import { Component, ChangeDetectionStrategy, ViewEncapsulation, signal, computed, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-mega-menu',
  imports: [RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="relative"
          (mouseenter)="showMenu()"
          (mouseleave)="hideMenuWithDelay()">

      <button
        class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-[#0056D2]"
        (click)="toggleMenu()"
        [class.text-[#0056D2]]="isMenuVisible()">
        <span>Khám phá</span>
        <svg class="h-4 w-4 transition-transform duration-200"
              [class.rotate-180]="isMenuVisible()"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
    </div>

    @if (isMenuVisible()) {
      <div class="fixed inset-x-0 z-50 border-t border-gray-100 bg-white shadow-lg"
           [style.top]="menuTop()"
           (mouseenter)="keepMenuOpen()"
           (mouseleave)="hideMenuWithDelay()">

        <div class="mx-auto max-w-7xl px-8 py-8">
          <div class="grid grid-cols-1 gap-10 md:grid-cols-3">

            <!-- Danh mục khóa học -->
            <div>
              <p class="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">Danh mục</p>
              <ul class="space-y-1">
                @for (cat of categories; track cat.slug) {
                  <li>
                    <a [routerLink]="['/courses']"
                       [queryParams]="{category: cat.slug}"
                       (click)="hideMenu()"
                       class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-[#0056D2]/5 hover:text-[#0056D2]">
                      <svg class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                        @switch (cat.icon) {
                          @case ('shield') { <path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> }
                          @case ('compass') { <circle cx="12" cy="12" r="10"/><polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/> }
                          @case ('cog') { <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/> }
                          @case ('truck') { <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/> }
                          @case ('scale') { <path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/> }
                          @case ('award') { <circle cx="12" cy="8" r="6"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/> }
                        }
                      </svg>
                      {{ cat.name }}
                    </a>
                  </li>
                }
              </ul>
            </div>

            <!-- Chứng chỉ chuyên môn -->
            <div>
              <p class="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">Chứng chỉ</p>
              <ul class="space-y-1">
                @for (cert of certificates; track cert) {
                  <li>
                    <a routerLink="/courses"
                       [queryParams]="{q: cert}"
                       (click)="hideMenu()"
                       class="block rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-[#0056D2]/5 hover:text-[#0056D2]">
                      {{ cert }}
                    </a>
                  </li>
                }
              </ul>
            </div>

            <!-- Wiii AI + CTA -->
            <div class="rounded-xl bg-[#0a1628] p-6">
              <div class="mb-3 flex items-center gap-2">
                <img src="/images/wiii-avatar.png" alt="Wiii AI" class="h-8 w-8 rounded-full">
                <div>
                  <p class="text-sm font-semibold text-white">Wiii AI</p>
                  <p class="text-xs text-blue-300/60">Trợ giảng 24/7</p>
                </div>
              </div>
              <p class="mb-4 text-sm leading-relaxed text-blue-100/50">
                Không chắc nên bắt đầu từ đâu? Hỏi Wiii AI để được gợi ý lộ trình phù hợp.
              </p>
              <a href="https://wiii.holilihu.online" target="_blank" rel="noopener noreferrer"
                 (click)="hideMenu()"
                 class="inline-flex items-center rounded-lg bg-[#0056D2] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#004BB5]">
                Hỏi Wiii AI
                <svg class="ml-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>
              <div class="mt-4 border-t border-white/10 pt-4">
                <a routerLink="/courses" (click)="hideMenu()"
                   class="text-sm font-medium text-blue-300/70 transition-colors hover:text-white">
                  Xem tất cả khóa học →
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MegaMenuComponent {
  isMenuVisible = signal(false);
  private hideMenuTimeout?: number;
  isScrolled = signal(false);
  private lastScrollY = 0;
  menuTop = computed(() => this.isScrolled() ? '64px' : '130px');

  readonly categories = [
    { slug: 'safety', name: 'An toàn hàng hải', icon: 'shield' },
    { slug: 'navigation', name: 'Điều khiển tàu', icon: 'compass' },
    { slug: 'engineering', name: 'Kỹ thuật máy tàu', icon: 'cog' },
    { slug: 'logistics', name: 'Logistics hàng hải', icon: 'truck' },
    { slug: 'law', name: 'Luật hàng hải', icon: 'scale' },
    { slug: 'certificates', name: 'Chứng chỉ STCW', icon: 'award' },
  ];

  readonly certificates = [
    'STCW Cơ bản',
    'STCW Nâng cao',
    'ECDIS',
    'Radar ARPA',
    'GMDSS',
    'IMO Certificates',
  ];

  showMenu(): void {
    if (this.hideMenuTimeout) { clearTimeout(this.hideMenuTimeout); this.hideMenuTimeout = undefined; }
    this.isMenuVisible.set(true);
  }

  hideMenuWithDelay(): void {
    this.hideMenuTimeout = window.setTimeout(() => this.isMenuVisible.set(false), 250);
  }

  hideMenu(): void {
    this.isMenuVisible.set(false);
  }

  keepMenuOpen(): void {
    if (this.hideMenuTimeout) { clearTimeout(this.hideMenuTimeout); this.hideMenuTimeout = undefined; }
  }

  toggleMenu(): void {
    this.isMenuVisible() ? this.hideMenuWithDelay() : this.showMenu();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (Math.abs(y - this.lastScrollY) > 10) { this.isScrolled.set(y > 50); this.lastScrollY = y; }
  }
}
