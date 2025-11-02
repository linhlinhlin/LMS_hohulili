import { Component, ChangeDetectionStrategy, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface CourseCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  courses: CourseItem[];
}

interface CourseItem {
  id: string;
  title: string;
  level: string;
  duration: string;
  students: number;
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

      <!-- Mega Menu Panel -->
      @if (isMenuVisible()) {
        <div class="absolute top-full left-0 mt-2 w-screen max-w-6xl bg-white rounded-lg shadow-xl border border-gray-200 z-50"
             (mouseenter)="keepMenuOpen()"
             (mouseleave)="hideMenuWithDelay()">
          
          <div class="p-8">
            <!-- Header -->
            <div class="mb-6">
              <h3 class="text-2xl font-bold text-gray-900 mb-2">Khám phá khóa học</h3>
              <p class="text-gray-600">Chọn lĩnh vực bạn quan tâm để bắt đầu hành trình học tập</p>
            </div>

            <!-- Categories Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              @for (category of categories; track category.id) {
                <div class="group">
                  <!-- Category Header -->
                  <div class="flex items-center space-x-3 mb-4">
                    <div class="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
                         [style.background-color]="category.color">
                      {{ category.icon }}
                    </div>
                    <div>
                      <h4 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {{ category.name }}
                      </h4>
                      <p class="text-sm text-gray-500">{{ category.description }}</p>
                    </div>
                  </div>

                  <!-- Course List -->
                  <ul class="space-y-2">
                    @for (course of category.courses.slice(0, 4); track course.id) {
                      <li>
                        <a [routerLink]="['/courses', course.id]" 
                           class="block p-2 rounded-md hover:bg-gray-50 transition-colors group">
                          <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                              {{ course.title }}
                            </span>
                            <span class="text-xs text-gray-400">{{ course.duration }}</span>
                          </div>
                          <div class="flex items-center space-x-2 mt-1">
                            <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              {{ course.level }}
                            </span>
                            <span class="text-xs text-gray-400">{{ course.students }}+ học viên</span>
                          </div>
                        </a>
                      </li>
                    }
                  </ul>

                  <!-- View All Link -->
                  <div class="mt-3">
                    <a [routerLink]="['/courses', category.id]" 
                       class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Xem tất cả {{ category.name.toLowerCase() }} →
                    </a>
                  </div>
                </div>
              }
            </div>

            <!-- Footer -->
            <div class="mt-8 pt-6 border-t border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <span class="text-sm text-gray-600">Không tìm thấy khóa học phù hợp?</span>
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
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MegaMenuComponent {
  isMenuVisible = signal(false);
  private hideMenuTimeout?: number;

  categories: CourseCategory[] = [
    {
      id: 'safety',
      name: 'An toàn Hàng hải',
      description: 'Chứng chỉ STCW, an toàn lao động',
      icon: '🛡️',
      color: '#3B82F6',
      courses: [
        { id: 'stcw-basic', title: 'STCW Cơ bản', level: 'Cơ bản', duration: '40h', students: 1200 },
        { id: 'safety-management', title: 'Quản lý An toàn', level: 'Nâng cao', duration: '24h', students: 800 },
        { id: 'emergency-response', title: 'Ứng phó Khẩn cấp', level: 'Trung cấp', duration: '16h', students: 600 },
        { id: 'fire-fighting', title: 'Chữa cháy trên tàu', level: 'Cơ bản', duration: '20h', students: 900 }
      ]
    },
    {
      id: 'navigation',
      name: 'Điều khiển Tàu',
      description: 'Navigation, radar, GPS, ECDIS',
      icon: '🧭',
      color: '#10B981',
      courses: [
        { id: 'radar-navigation', title: 'Điều hướng Radar', level: 'Trung cấp', duration: '32h', students: 750 },
        { id: 'gps-ecdis', title: 'GPS & ECDIS', level: 'Nâng cao', duration: '28h', students: 650 },
        { id: 'celestial-nav', title: 'Điều hướng Thiên văn', level: 'Nâng cao', duration: '36h', students: 400 },
        { id: 'bridge-management', title: 'Quản lý Cầu tàu', level: 'Trung cấp', duration: '24h', students: 550 }
      ]
    },
    {
      id: 'engineering',
      name: 'Kỹ thuật Máy tàu',
      description: 'Động cơ, hệ thống, bảo trì',
      icon: '⚙️',
      color: '#F59E0B',
      courses: [
        { id: 'marine-engines', title: 'Động cơ Hàng hải', level: 'Trung cấp', duration: '40h', students: 850 },
        { id: 'electrical-systems', title: 'Hệ thống Điện', level: 'Cơ bản', duration: '24h', students: 700 },
        { id: 'maintenance', title: 'Bảo trì Tàu', level: 'Nâng cao', duration: '32h', students: 600 },
        { id: 'automation', title: 'Tự động hóa Tàu', level: 'Nâng cao', duration: '28h', students: 450 }
      ]
    },
    {
      id: 'logistics',
      name: 'Logistics Hàng hải',
      description: 'Vận tải, cảng, chuỗi cung ứng',
      icon: '📦',
      color: '#8B5CF6',
      courses: [
        { id: 'port-operations', title: 'Vận hành Cảng', level: 'Trung cấp', duration: '24h', students: 600 },
        { id: 'cargo-handling', title: 'Xử lý Hàng hóa', level: 'Cơ bản', duration: '20h', students: 800 },
        { id: 'supply-chain', title: 'Chuỗi Cung ứng', level: 'Nâng cao', duration: '32h', students: 500 },
        { id: 'customs-clearance', title: 'Thủ tục Hải quan', level: 'Trung cấp', duration: '16h', students: 650 }
      ]
    },
    {
      id: 'law',
      name: 'Luật Hàng hải',
      description: 'Quy định quốc tế, bảo hiểm, hợp đồng',
      icon: '⚖️',
      color: '#EF4444',
      courses: [
        { id: 'maritime-law', title: 'Luật Hàng hải Quốc tế', level: 'Nâng cao', duration: '36h', students: 400 },
        { id: 'insurance', title: 'Bảo hiểm Hàng hải', level: 'Trung cấp', duration: '24h', students: 550 },
        { id: 'contracts', title: 'Hợp đồng Vận tải', level: 'Cơ bản', duration: '20h', students: 700 },
        { id: 'environmental', title: 'Luật Môi trường', level: 'Trung cấp', duration: '16h', students: 450 }
      ]
    },
    {
      id: 'certificates',
      name: 'Chứng chỉ Chuyên môn',
      description: 'STCW, IMO, chứng chỉ quốc tế',
      icon: '🏆',
      color: '#06B6D4',
      courses: [
        { id: 'stcw-advanced', title: 'STCW Nâng cao', level: 'Nâng cao', duration: '48h', students: 300 },
        { id: 'imo-certificates', title: 'Chứng chỉ IMO', level: 'Nâng cao', duration: '40h', students: 250 },
        { id: 'specialized-training', title: 'Đào tạo Chuyên sâu', level: 'Chuyên gia', duration: '60h', students: 200 },
        { id: 'renewal-courses', title: 'Khóa Gia hạn', level: 'Cập nhật', duration: '12h', students: 1000 }
      ]
    }
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
}