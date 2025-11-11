import { Component, ChangeDetectionStrategy, ViewEncapsulation, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface CategoryItem {
  id: string;
  name: string;
}

@Component({
  selector: 'app-mega-menu',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="relative"
          (mouseenter)="showMenu()"
          (mouseleave)="hideMenuWithDelay()">

      <!-- Trigger Button -->
      <button
        class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
        (click)="toggleMenu()"
        [class.text-blue-600]="isMenuVisible()">
        <span>Khám phá</span>
        <svg class="w-4 h-4 transition-transform duration-200"
              [class.rotate-180]="isMenuVisible()"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
    </div>

    <!-- Mega Menu Panel - Coursera-style Full Width -->
    @if (isMenuVisible()) {
      <div class="fixed inset-x-0 top-0 bg-white border-t border-gray-200 z-50"
           [style.top]="menuTop()"
           (mouseenter)="keepMenuOpen()"
           (mouseleave)="hideMenuWithDelay()"
           (wheel)="$event.preventDefault(); $event.stopPropagation()">

        <!-- Inner Container for Centered Content -->
        <div class="max-w-7xl mx-auto px-8 py-8">
            <!-- Main Content Grid - Optimized for full width -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

              <!-- Khám phá danh mục -->
              <div>
                <a routerLink="/courses"
                   class="block mb-4">
                  <p class="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    Khám phá danh mục
                  </p>
                </a>
                <ul class="space-y-2">
                  @for (category of categories.slice(0, 6); track category.id) {
                    <li>
                      <a [routerLink]="['/courses']"
                         [queryParams]="{ category: category.id }"
                         class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">
                        {{ category.name }}
                      </a>
                    </li>
                  }
                </ul>
                <a routerLink="/courses"
                   class="block text-sm text-blue-600 hover:text-blue-700 font-medium mt-3">
                  Xem tất cả →
                </a>
              </div>

              <!-- Khám phá vai trò -->
              <div>
                <a routerLink="/courses"
                   class="block mb-4">
                  <p class="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    Khám phá vai trò
                  </p>
                </a>
                <ul class="space-y-2">
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Thủy thủ</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Kỹ sư hàng hải</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Quản lý cảng biển</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Điều khiển tàu</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">An toàn hàng hải</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Logistics biển</a></li>
                </ul>
              </div>

              <!-- Chứng chỉ chuyên môn -->
              <div>
                <a routerLink="/courses"
                   class="block mb-4">
                  <p class="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    Chứng chỉ chuyên môn
                  </p>
                </a>
                <ul class="space-y-2">
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">STCW Cơ bản</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">STCW Nâng cao</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">IMO Certificates</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">ECDIS</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Radar ARPA</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">GMDSS</a></li>
                </ul>
              </div>

              <!-- Kỹ năng phổ biến -->
              <div>
                <p class="text-sm font-semibold text-gray-900 mb-4">
                  Kỹ năng phổ biến
                </p>
                <ul class="space-y-2">
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Điều hướng hàng hải</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">An toàn trên tàu</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Kỹ thuật máy tàu</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Quản lý hàng hóa</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Luật hàng hải</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Bảo hiểm biển</a></li>
                </ul>
              </div>

              <!-- Đào tạo nâng cao -->
              <div>
                <p class="text-sm font-semibold text-gray-900 mb-4">
                  Đào tạo nâng cao
                </p>
                <ul class="space-y-2">
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Quản lý đội tàu</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Logistics quốc tế</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Công nghệ tàu thông minh</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Bảo vệ môi trường biển</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Quản lý rủi ro hàng hải</a></li>
                  <li><a routerLink="/courses" class="block text-sm text-gray-600 hover:text-blue-600 transition-colors py-1">Lãnh đạo hàng hải</a></li>
                </ul>
              </div>

            </div>

            <!-- Footer Section -->
            <div class="mt-8 pt-6 border-t border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-6">
                  <span class="text-sm text-gray-600">Không chắc nên bắt đầu từ đâu?</span>
                  <a routerLink="/courses"
                     class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Xem tất cả khóa học
                  </a>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-500">Được tin tưởng bởi</span>
                  <span class="text-sm font-semibold text-gray-700">2,500+ học viên</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MegaMenuComponent {
  isMenuVisible = signal(false);
  private hideMenuTimeout?: number;

  // Scroll state for dynamic positioning
  isScrolled = signal(false);
  private lastScrollY = 0;

  // Dynamic top position based on header state
  menuTop = computed(() => this.isScrolled() ? '64px' : '130px');

  categories: CategoryItem[] = [
    { id: 'safety', name: 'An toàn Hàng hải' },
    { id: 'navigation', name: 'Điều khiển Tàu' },
    { id: 'engineering', name: 'Kỹ thuật Máy tàu' },
    { id: 'logistics', name: 'Logistics Hàng hải' },
    { id: 'law', name: 'Luật Hàng hải' },
    { id: 'certificates', name: 'Chứng chỉ Chuyên môn' }
  ];

  showMenu(): void {
    if (this.hideMenuTimeout) {
      clearTimeout(this.hideMenuTimeout);
      this.hideMenuTimeout = undefined;
    }
    this.isMenuVisible.set(true);
  }

  hideMenuWithDelay(): void {
    this.hideMenuTimeout = window.setTimeout(() => {
      this.isMenuVisible.set(false);
    }, 250); // 250ms delay - vùng đệm thời gian
  }

  keepMenuOpen(): void {
    if (this.hideMenuTimeout) {
      clearTimeout(this.hideMenuTimeout);
      this.hideMenuTimeout = undefined;
    }
  }

  toggleMenu(): void {
    if (this.isMenuVisible()) {
      this.hideMenuWithDelay();
    } else {
      this.showMenu();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const scrollThreshold = 10;

    // Update scroll state similar to header logic
    if (Math.abs(currentScrollY - this.lastScrollY) > scrollThreshold) {
      this.isScrolled.set(currentScrollY > 50);
      this.lastScrollY = currentScrollY;
    }
  }
}