import {
  Component,
  signal,
  inject,
  type OnInit,
  type AfterViewInit,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-home-hero',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Hero Section - Enhanced with better messaging and video background support -->
    <section class="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900 text-white overflow-hidden">
      <!-- Video Background Placeholder -->
      <div class="absolute inset-0 bg-black bg-opacity-40 z-10"></div>
      
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="waves" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 20 Q25 0 50 20 T100 20 V0 H0 Z" fill="currentColor"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#waves)"/>
        </svg>
      </div>

      <div class="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div class="text-center">
          <h1 #heroTitle class="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance opacity-0">
            Nâng tầm sự nghiệp
            <span class="block text-yellow-400">Hàng hải của bạn</span>
          </h1>
          <p #heroDescription class="text-xl md:text-2xl mb-8 text-blue-100 max-w-4xl mx-auto text-pretty opacity-0">
            Học hỏi từ các chuyên gia hàng đầu và nhận chứng chỉ được công nhận để vươn ra biển lớn
          </p>
          
          <!-- Key Benefits -->
          <div #heroBenefits class="flex flex-wrap justify-center gap-6 mb-10 text-sm md:text-base opacity-0">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>50+ môn học chuyên nghiệp</span>
            </div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>2.500+ học viên tin tưởng</span>
            </div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Học mọi lúc, mọi nơi</span>
            </div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Chứng chỉ uy tín</span>
            </div>
          </div>

          <div #heroButtons class="flex flex-col sm:flex-row gap-4 justify-center opacity-0">
            <a routerLink="/courses" 
               class="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover:shadow-lg">
              Khám phá khóa học
            </a>
            @if (!authService.isAuthenticated()) {
              <a routerLink="/auth/register" 
                 class="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105">
                Đăng ký miễn phí
              </a>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeHeroComponent implements OnInit, AfterViewInit {
  protected authService = inject(AuthService);

  // ViewChild references for GSAP animations
  heroTitle = viewChild<ElementRef>('heroTitle');
  heroDescription = viewChild<ElementRef>('heroDescription');
  heroBenefits = viewChild<ElementRef>('heroBenefits');
  heroButtons = viewChild<ElementRef>('heroButtons');

  ngOnInit(): void {
    // Component initialization
  }

  async ngAfterViewInit(): Promise<void> {
    // Lazy load GSAP only when this component is rendered
    try {
      const { gsap } = await import('gsap');
      
      // Create a timeline for smooth sequential animations
      const tl = gsap.timeline();
      
      // Animate hero title with stagger effect
      tl.from(this.heroTitle()?.nativeElement, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: "power2.out"
      })
      // Animate description with slight delay
      .from(this.heroDescription()?.nativeElement, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.4")
      // Animate benefits with stagger
      .from(this.heroBenefits()?.nativeElement, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.2")
      // Animate buttons last
      .from(this.heroButtons()?.nativeElement, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.2");

    } catch (error) {
      console.warn('GSAP failed to load, falling back to CSS animations:', error);
      // Fallback: show elements immediately if GSAP fails
      this.showElementsImmediately();
    }
  }

  private showElementsImmediately(): void {
    // Fallback method to show elements if GSAP fails
    const elements = [
      this.heroTitle()?.nativeElement,
      this.heroDescription()?.nativeElement,
      this.heroBenefits()?.nativeElement,
      this.heroButtons()?.nativeElement
    ].filter(Boolean);

    elements.forEach(el => {
      if (el) {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }
    });
  }
}
