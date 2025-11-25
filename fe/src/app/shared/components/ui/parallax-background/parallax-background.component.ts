import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-parallax-background',
  standalone: true,
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Clean Professional Hero Section - Full viewport height -->
    <div class="scrollDist relative min-h-screen h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" style="height: 100vh;">

      <!-- Background geometric pattern -->
      <div class="absolute inset-0 opacity-5" style="width: 100vw; height: 100vh;">
        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <!-- Floating geometric shapes for visual interest -->
      <div class="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
      <div class="absolute top-40 right-20 w-16 h-16 bg-indigo-300 rounded-lg opacity-15 animate-pulse" style="animation-delay: 1s;"></div>
      <div class="absolute bottom-32 left-1/4 w-12 h-12 bg-cyan-200 rounded-full opacity-25 animate-pulse" style="animation-delay: 2s;"></div>
      <div class="absolute top-1/3 right-1/3 w-8 h-8 bg-blue-300 rounded-lg opacity-20 animate-pulse" style="animation-delay: 0.5s;"></div>

      <!-- Foreground overlay - clean professional design -->
      <div class="foreground-layer absolute inset-0 flex items-center justify-center z-20" style="width: 100vw; height: 100vh;">
        <div class="text-center max-w-4xl mx-auto px-4">
          <!-- Hero Title -->
          <h1 class="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance text-slate-800">
            Nâng tầm sự nghiệp
            <span class="block text-blue-600">Hàng hải của bạn</span>
          </h1>

          <!-- Subtitle -->
          <p class="text-xl md:text-2xl mb-8 text-slate-600 max-w-4xl mx-auto text-pretty">
            Học hỏi từ các chuyên gia hàng đầu và nhận chứng chỉ được công nhận để vươn ra biển lớn
          </p>

          <!-- Key Benefits -->
          <div class="flex flex-wrap justify-center gap-6 mb-10 text-sm md:text-base text-slate-700">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>50+ môn học chuyên nghiệp</span>
            </div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>2.500+ học viên tin tưởng</span>
            </div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Học mọi lúc, mọi nơi</span>
            </div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Chứng chỉ uy tín</span>
            </div>
          </div>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button (click)="navigateToCourses()"
               class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover:shadow-lg">
              Khám phá khóa học
            </button>
            <button (click)="navigateToLogin()"
               class="bg-white hover:bg-gray-50 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover:shadow-lg border-2 border-blue-600">
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-gradient-radial {
      background: radial-gradient(circle, var(--tw-gradient-stops));
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParallaxBackgroundComponent {
  private router = inject(Router);

  navigateToCourses(): void {
    this.router.navigate(['/courses']).catch(error => {
      console.error('Navigation to courses failed:', error);
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']).catch(error => {
      console.error('Navigation to login failed:', error);
    });
  }
}
