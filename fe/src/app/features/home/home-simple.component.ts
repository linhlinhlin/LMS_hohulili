import {
  Component, ChangeDetectionStrategy, OnInit, AfterViewInit,
  signal, inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiClient } from '../../api/client/api-client';

interface FeaturedCourse {
  id: string;
  title: string;
  teacherName: string;
  thumbnailUrl?: string;
  price?: number;
  salePrice?: number;
  priceType?: string;
  enrolledCount: number;
  categoryName?: string;
  lessonCount?: number;
}

@Component({
  selector: 'app-home-simple',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ══════════════════════════════════════════════
         HERO — Maritime Identity + Entrance Animation
         ══════════════════════════════════════════════ -->
    <section class="hero-section relative overflow-hidden bg-[#0a1628]">
      <div class="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d2847] to-[#0056D2]/40"></div>

      <!-- Animated wave at bottom -->
      <div class="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 120" fill="none" class="wave-bottom w-full" preserveAspectRatio="none">
          <path d="M0,64 C360,120 720,0 1080,64 C1260,96 1380,80 1440,64 L1440,120 L0,120 Z" fill="white"/>
          <path d="M0,80 C480,20 960,100 1440,40 L1440,120 L0,120 Z" fill="white" opacity="0.5"/>
        </svg>
      </div>

      <!-- Compass watermark — slow rotate -->
      <div class="compass-watermark absolute top-1/2 right-[8%] -translate-y-1/2 opacity-[0.04] hidden lg:block">
        <svg viewBox="0 0 200 200" class="w-[420px] h-[420px]" fill="none" stroke="white" stroke-width="0.5">
          <circle cx="100" cy="100" r="90"/><circle cx="100" cy="100" r="70"/><circle cx="100" cy="100" r="4" fill="white"/>
          <line x1="100" y1="8" x2="100" y2="42" stroke-width="1.5"/><line x1="100" y1="158" x2="100" y2="192" stroke-width="1.5"/>
          <line x1="8" y1="100" x2="42" y2="100" stroke-width="1.5"/><line x1="158" y1="100" x2="192" y2="100" stroke-width="1.5"/>
          <polygon points="100,25 106,80 100,70 94,80" fill="white" stroke="none" opacity="0.3"/>
          <text x="100" y="20" text-anchor="middle" fill="white" font-size="10" opacity="0.5">N</text>
          <text x="100" y="198" text-anchor="middle" fill="white" font-size="10" opacity="0.5">S</text>
          <text x="6" y="104" text-anchor="middle" fill="white" font-size="10" opacity="0.5">W</text>
          <text x="196" y="104" text-anchor="middle" fill="white" font-size="10" opacity="0.5">E</text>
        </svg>
      </div>

      <div class="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-32 pt-20 md:pt-28 lg:pt-32">
        <div class="max-w-3xl">
          <p class="hero-enter hero-enter-1 mb-5 text-sm font-medium uppercase tracking-[0.2em] text-blue-300/70">
            Nền tảng đào tạo hàng hải Việt Nam
          </p>
          <h1 class="hero-enter hero-enter-2 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Học Hàng hải mọi lúc
            <span class="mt-1 block bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              kể cả trên biển.
            </span>
          </h1>
          <p class="hero-enter hero-enter-3 mt-6 max-w-xl text-lg leading-relaxed text-blue-100/70 sm:text-xl">
            Nền tảng đầu tiên tại Việt Nam tích hợp trí tuệ nhân tạo và
            hoạt động ngoại tuyến — được thiết kế cho người đi biển.
          </p>
          <div class="hero-enter hero-enter-4 mt-10 flex flex-col gap-4 sm:flex-row">
            <a routerLink="/courses"
               class="inline-flex items-center justify-center rounded-lg bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0a1628] shadow-lg shadow-white/10 transition-all hover:bg-blue-50 hover:shadow-xl">
              Khám phá khóa học
              <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
            <a href="https://wiii.holilihu.online" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center justify-center rounded-lg border border-white/20 px-7 py-3.5 text-[15px] font-medium text-white/90 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/5">
              Dùng thử Wiii AI
              <svg class="ml-2 h-4 w-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         COURSES — Real API Data
         ══════════════════════════════════════════════ -->
    <section class="scroll-reveal bg-white py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 flex items-end justify-between">
          <div>
            <h2 class="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">Khóa học nổi bật</h2>
            <p class="mt-3 text-lg text-gray-500">Được thiết kế bởi chuyên gia hàng hải hàng đầu</p>
          </div>
          <a routerLink="/courses" class="hidden items-center text-[15px] font-medium text-[#0056D2] hover:text-[#004BB5] sm:flex">
            Xem tất cả <svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>

        @if (coursesLoading()) {
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            @for (i of [1,2,3,4]; track i) {
              <div class="animate-pulse rounded-xl border border-gray-100"><div class="h-40 rounded-t-xl bg-gray-100"></div><div class="p-4 space-y-3"><div class="h-4 w-3/4 rounded bg-gray-100"></div><div class="h-3 w-1/2 rounded bg-gray-100"></div></div></div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            @for (course of courses(); track course.id; let idx = $index) {
              <a [routerLink]="['/courses', course.id]"
                 class="stagger-child group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                 [style.--stagger-index]="idx">
                <div class="relative h-40 overflow-hidden">
                  @if (course.thumbnailUrl) {
                    <img [src]="course.thumbnailUrl" [alt]="course.title"
                         (error)="$any($event.target).style.display='none'"
                         class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105">
                  }
                  <!-- Gradient fallback with maritime pattern -->
                  <div class="absolute inset-0 -z-10" [class]="getCategoryGradient(course.categoryName)">
                    <svg class="absolute bottom-2 right-2 h-16 w-16 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1">
                      <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/>
                    </svg>
                  </div>
                  @if (course.categoryName) {
                    <span class="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700 backdrop-blur-sm">{{ course.categoryName }}</span>
                  }
                </div>
                <div class="p-4">
                  <h3 class="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-[#0056D2]">{{ course.title }}</h3>
                  <p class="mt-1.5 text-xs text-gray-500">{{ course.teacherName }}</p>
                  <div class="mt-3 flex items-center justify-between">
                    @if (course.priceType === 'FREE') {
                      <span class="text-sm font-bold text-green-600">Miễn phí</span>
                    } @else if (course.salePrice && course.salePrice < (course.price || 0)) {
                      <div class="flex items-baseline gap-1.5">
                        <span class="text-sm font-bold text-[#0056D2]">{{ formatPrice(course.salePrice) }}</span>
                        <span class="text-xs text-gray-400 line-through">{{ formatPrice(course.price) }}</span>
                      </div>
                    } @else {
                      <span class="text-sm font-bold text-gray-900">{{ formatPrice(course.price) }}</span>
                    }
                    @if (course.enrolledCount > 0) {
                      <span class="text-[11px] text-gray-400">{{ course.enrolledCount }} học viên</span>
                    }
                  </div>
                </div>
              </a>
            }
          </div>
        }
        <div class="mt-8 text-center sm:hidden">
          <a routerLink="/courses" class="text-[15px] font-medium text-[#0056D2]">Xem tất cả khóa học &rarr;</a>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         DIFFERENTIATORS — SVG Icons (no emoji)
         ══════════════════════════════════════════════ -->
    <section class="scroll-reveal bg-slate-50 py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto mb-16 max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">Được thiết kế cho ngành Hàng hải</h2>
          <p class="mt-4 text-lg text-gray-500">Ba khác biệt mà không nền tảng nào khác có được</p>
        </div>
        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
          @for (diff of differentiators; track diff.title; let idx = $index) {
            <div class="stagger-child rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                 [style.--stagger-index]="idx">
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl" [class]="diff.iconBg">
                <svg class="h-6 w-6" [class]="diff.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  @switch (diff.svgId) {
                    @case ('globe') {
                      <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/>
                    }
                    @case ('sparkles') {
                      <path d="m12 3-1.9 5.8a2 2 0 01-1.3 1.3L3 12l5.8 1.9a2 2 0 011.3 1.3L12 21l1.9-5.8a2 2 0 011.3-1.3L21 12l-5.8-1.9a2 2 0 01-1.3-1.3L12 3Z"/><path d="M5 3v4M19 17v4M3 5h4M17 19h4"/>
                    }
                    @case ('shield-check') {
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
                    }
                  }
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900">{{ diff.title }}</h3>
              <p class="mt-3 leading-relaxed text-gray-600">{{ diff.desc }}</p>
              @if (diff.link) {
                <a [href]="diff.link" target="_blank" rel="noopener noreferrer"
                   class="mt-4 inline-flex items-center text-sm font-medium" [class]="diff.linkColor">
                  {{ diff.linkText }}
                  <svg class="ml-1 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>
              } @else {
                <p class="mt-4 text-sm font-medium" [class]="diff.tagColor">{{ diff.tag }}</p>
              }
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         CATEGORIES — SVG Icons (professional)
         ══════════════════════════════════════════════ -->
    <section class="scroll-reveal bg-white py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto mb-14 max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">Lĩnh vực đào tạo</h2>
          <p class="mt-4 text-lg text-gray-500">Chương trình chuyên sâu theo từng lĩnh vực hàng hải</p>
        </div>
        <div class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          @for (cat of categories; track cat.slug; let idx = $index) {
            <a [routerLink]="['/courses']" [queryParams]="{category: cat.slug}"
               class="stagger-child group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:border-[#0056D2]/30 hover:bg-[#0056D2]/[0.02] hover:shadow-sm sm:p-6"
               [style.--stagger-index]="idx">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" [class]="cat.bgClass">
                <svg class="h-5 w-5" [class]="cat.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  @switch (cat.svgId) {
                    @case ('shield') { <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> }
                    @case ('compass') { <circle cx="12" cy="12" r="10"/><polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/> }
                    @case ('cog') { <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/> }
                    @case ('truck') { <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/> }
                    @case ('scale') { <path d="M16 3h5v5M4 20L21 3"/><path d="M21 16v5h-5M15 15l6 6"/><path d="M4 4l5 5"/> }
                    @case ('award') { <circle cx="12" cy="8" r="6"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/> }
                  }
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="font-semibold text-gray-900 group-hover:text-[#0056D2]">{{ cat.name }}</h3>
                <p class="mt-0.5 text-sm text-gray-500">{{ cat.desc }}</p>
              </div>
            </a>
          }
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         WIII AI — Showcase
         ══════════════════════════════════════════════ -->
    <section class="scroll-reveal overflow-hidden bg-[#0a1628] py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Powered by AI
            </div>
            <h2 class="text-3xl font-bold tracking-tight text-white lg:text-4xl">Trợ giảng AI Wiii</h2>
            <p class="mt-5 text-lg leading-relaxed text-blue-100/60">
              Wiii AI hiểu sâu về lĩnh vực hàng hải — từ quy tắc tránh va (COLREGS) đến kỹ thuật máy tàu.
              Hỗ trợ bạn 24/7 bằng tiếng Việt, ngay trong quá trình học.
            </p>
            <ul class="mt-8 space-y-4">
              @for (item of aiFeatures; track item) {
                <li class="flex items-start gap-3">
                  <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span class="text-blue-100/70">{{ item }}</span>
                </li>
              }
            </ul>
            <div class="mt-10">
              <a href="https://wiii.holilihu.online" target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center rounded-lg bg-cyan-500 px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 hover:shadow-xl">
                Trò chuyện với Wiii
                <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>
            </div>
          </div>
          <!-- Chat mockup with real Wiii mascot -->
          <div class="relative">
            <!-- Wiii mascot floating above chat -->
            <div class="mb-6 flex justify-center lg:mb-8">
              <div class="wiii-float relative">
                <img src="/images/wiii-avatar.png" alt="Wiii AI mascot"
                     class="h-24 w-24 rounded-3xl shadow-xl shadow-orange-500/20 lg:h-28 lg:w-28">
                <div class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-[#0a1628] bg-green-400"></div>
              </div>
            </div>
            <!-- Chat window -->
            <div class="rounded-2xl border border-white/10 bg-white/5 p-1 shadow-2xl backdrop-blur-sm">
              <div class="rounded-xl bg-[#111b2e] p-5">
                <div class="mb-5 flex items-center gap-3 border-b border-white/10 pb-3">
                  <img src="/images/wiii-avatar.png" alt="Wiii" class="h-8 w-8 rounded-full">
                  <div><p class="text-sm font-semibold text-white">Wiii AI</p><p class="text-xs text-green-400">Trực tuyến</p></div>
                </div>
                <div class="space-y-3">
                  <div class="flex justify-end">
                    <div class="rounded-2xl rounded-tr-md bg-[#0056D2] px-4 py-2.5 text-sm text-white">
                      Quy tắc tránh va COLREGS áp dụng thế nào khi hai tàu đối hướng?
                    </div>
                  </div>
                  <div class="flex items-start gap-2">
                    <img src="/images/wiii-avatar.png" alt="" class="mt-0.5 h-6 w-6 rounded-full">
                    <div class="max-w-[85%] rounded-2xl rounded-tl-md bg-white/10 px-4 py-2.5 text-sm leading-relaxed text-blue-100/80">
                      Theo Quy tắc 14 (COLREGS), khi hai tàu máy đối hướng, mỗi tàu phải
                      <span class="text-cyan-300">chuyển hướng sang mạn phải</span>
                      để đi qua mạn trái của tàu kia...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         PARTNERS — Trust Signals
         ══════════════════════════════════════════════ -->
    <section class="scroll-reveal border-y border-gray-100 bg-white py-14">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p class="mb-8 text-center text-sm font-medium uppercase tracking-widest text-gray-400">Hệ sinh thái The Wiii Lab</p>
        <div class="flex flex-wrap items-center justify-center gap-10 lg:gap-16">
          @for (partner of partners; track partner.name) {
            <div class="flex flex-col items-center gap-2">
              <img [src]="partner.logo" [alt]="partner.name" class="h-12 w-12 rounded-xl object-contain sm:h-14 sm:w-14">
              <span class="text-xs font-medium text-gray-500">{{ partner.name }}</span>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         ORGANIZATIONS — B2B/B2G
         ══════════════════════════════════════════════ -->
    <section class="scroll-reveal bg-slate-50 py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800">
          <div class="grid items-center lg:grid-cols-2">
            <div class="p-10 lg:p-14">
              <p class="mb-3 text-sm font-medium uppercase tracking-widest text-blue-400">Dành cho tổ chức</p>
              <h2 class="text-3xl font-bold text-white">Đào tạo thuyền viên theo chuẩn quốc tế</h2>
              <p class="mt-4 text-lg leading-relaxed text-slate-300">
                Giải pháp đào tạo toàn diện cho doanh nghiệp vận tải biển, cảng biển,
                và cơ sở giáo dục hàng hải.
              </p>
              <ul class="mt-6 space-y-3 text-slate-300">
                @for (item of orgFeatures; track item) {
                  <li class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    {{ item }}
                  </li>
                }
              </ul>
              <a routerLink="/contact" [queryParams]="{type: 'enterprise'}"
                 class="mt-8 inline-flex items-center rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-slate-900 transition-all hover:bg-blue-50">
                Liên hệ tư vấn
                <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </a>
            </div>
            <div class="hidden items-center justify-center p-14 lg:flex">
              <div class="grid grid-cols-2 gap-4 text-center">
                @for (badge of orgBadges; track badge.label) {
                  <div class="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
                    <div class="text-3xl font-bold text-white">{{ badge.value }}</div>
                    <div class="mt-1 text-xs text-slate-400">{{ badge.label }}</div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         BRAND FOOTER
         ══════════════════════════════════════════════ -->
    <section class="border-t border-gray-100 bg-white py-10">
      <div class="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p class="text-sm text-gray-400">
          Sản phẩm của <span class="font-medium text-gray-600">The Wiii Lab</span>
        </p>
      </div>
    </section>
  `,
  styles: [`
    .hero-section { min-height: 85vh; }

    /* ── Hero entrance (CSS-only, no GSAP needed) ── */
    .hero-enter {
      opacity: 0;
      transform: translateY(20px);
      animation: heroFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .hero-enter-1 { animation-delay: 0.1s; }
    .hero-enter-2 { animation-delay: 0.25s; }
    .hero-enter-3 { animation-delay: 0.4s; }
    .hero-enter-4 { animation-delay: 0.55s; }

    @keyframes heroFadeIn {
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Compass slow rotation ── */
    .compass-watermark {
      animation: compassSpin 120s linear infinite;
    }
    @keyframes compassSpin {
      to { transform: translateY(-50%) rotate(360deg); }
    }

    /* ── Wave subtle sway ── */
    .wave-bottom {
      animation: waveSway 8s ease-in-out infinite alternate;
    }
    @keyframes waveSway {
      from { transform: translateX(-8px); }
      to { transform: translateX(8px); }
    }

    /* ── Scroll reveal (sections) ── */
    .scroll-reveal {
      opacity: 0;
      transform: translateY(28px);
      transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .scroll-reveal.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* ── Staggered children (Linear-style) ── */
    .scroll-reveal.visible .stagger-child {
      animation: staggerIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      animation-delay: calc(var(--stagger-index, 0) * 80ms + 200ms);
      opacity: 0;
      transform: translateY(16px);
    }
    @keyframes staggerIn {
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Wiii mascot gentle float ── */
    .wiii-float {
      animation: wiiiFloat 4s ease-in-out infinite;
    }
    @keyframes wiiiFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    /* ── Line clamp ── */
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class HomeSimpleComponent implements OnInit, AfterViewInit {
  private api = inject(ApiClient);
  private platformId = inject(PLATFORM_ID);

  courses = signal<FeaturedCourse[]>([]);
  coursesLoading = signal(true);

  readonly differentiators = [
    {
      svgId: 'globe', title: 'Học trên biển',
      desc: 'Tải khóa học và video về thiết bị, học tập ngay cả khi không có internet. Khi có mạng, tiến độ tự động đồng bộ lên hệ thống.',
      iconBg: 'bg-[#0056D2]/10', iconColor: 'text-[#0056D2]',
      tag: 'Progressive Web App \u00B7 Offline-first', tagColor: 'text-[#0056D2]/80',
      link: null, linkText: '', linkColor: ''
    },
    {
      svgId: 'sparkles', title: 'Wiii AI trợ giảng 24/7',
      desc: 'Trợ lý AI hiểu chuyên sâu về hàng hải \u2014 giải đáp thắc mắc, gợi ý lộ trình, hỗ trợ ôn thi bằng tiếng Việt ngay trong lúc học.',
      iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-600',
      tag: '', tagColor: '',
      link: 'https://wiii.holilihu.online', linkText: 'Trải nghiệm Wiii AI', linkColor: 'text-cyan-600 hover:text-cyan-700'
    },
    {
      svgId: 'shield-check', title: 'Chứng chỉ STCW / IMO',
      desc: 'Hoàn thành khóa học và nhận chứng chỉ theo chuẩn quốc tế STCW, được công nhận bởi Trường Đại học Hàng hải Việt Nam.',
      iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600',
      tag: 'International Maritime Organization', tagColor: 'text-amber-600/80',
      link: null, linkText: '', linkColor: ''
    }
  ];

  readonly categories = [
    { name: 'An toàn Hàng hải', slug: 'safety', svgId: 'shield', desc: 'SOLAS, cứu sinh, phòng cháy', bgClass: 'bg-red-50', iconColor: 'text-red-500' },
    { name: 'Điều khiển tàu', slug: 'navigation', svgId: 'compass', desc: 'Hàng hải thiên văn, radar, ECDIS', bgClass: 'bg-blue-50', iconColor: 'text-blue-500' },
    { name: 'Kỹ thuật máy tàu', slug: 'engineering', svgId: 'cog', desc: 'Diesel, turbine, hệ thống điện', bgClass: 'bg-slate-100', iconColor: 'text-slate-600' },
    { name: 'Logistics Hàng hải', slug: 'logistics', svgId: 'truck', desc: 'Vận tải container, cảng biển', bgClass: 'bg-amber-50', iconColor: 'text-amber-600' },
    { name: 'Luật Hàng hải', slug: 'law', svgId: 'scale', desc: 'UNCLOS, bảo hiểm, hợp đồng', bgClass: 'bg-purple-50', iconColor: 'text-purple-500' },
    { name: 'Chứng chỉ STCW', slug: 'certificates', svgId: 'award', desc: 'GMDSS, Radar, ECDIS, GOC', bgClass: 'bg-green-50', iconColor: 'text-green-600' },
  ];

  readonly aiFeatures = [
    'Giải đáp thắc mắc chuyên ngành hàng hải',
    'Gợi ý lộ trình học và thi chứng chỉ phù hợp',
    'Hỗ trợ ôn thi, tóm tắt bài giảng'
  ];

  readonly partners = [
    { name: 'LMS Maritime', logo: '/icons/logo-master.png' },
    { name: 'Wiii AI', logo: '/images/wiii-avatar.png' },
    { name: 'The Wiii Lab', logo: '/icons/thewiiilab.png' },
  ];

  readonly orgFeatures = [
    'Quản lý tiến độ đào tạo đội ngũ',
    'Nội dung tùy chỉnh theo yêu cầu tổ chức',
    'Báo cáo phân tích và chứng chỉ hàng loạt'
  ];

  readonly orgBadges = [
    { value: 'IMO', label: 'Tiêu chuẩn quốc tế' },
    { value: 'STCW', label: 'Chứng chỉ chuyên ngành' },
    { value: '24/7', label: 'Hỗ trợ AI' },
    { value: 'PWA', label: 'Học ngoại tuyến' }
  ];

  ngOnInit(): void {
    this.loadFeaturedCourses();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initScrollReveal();
    }
  }

  private loadFeaturedCourses(): void {
    this.api.getWithResponse<any>('/api/v3/courses?page=0&size=8&sort=enrolledCount,desc')
      .subscribe({
        next: (res) => {
          const content = res.data?.content || res.data || [];
          this.courses.set(content.slice(0, 8));
          this.coursesLoading.set(false);
        },
        error: () => this.coursesLoading.set(false)
      });
  }

  formatPrice(price?: number): string {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  getCategoryGradient(categoryName?: string): string {
    if (!categoryName) return 'bg-gradient-to-br from-[#0056D2]/15 to-[#0056D2]/5';
    const map: Record<string, string> = {
      'An toan hang hai': 'bg-gradient-to-br from-red-100 to-red-50',
      'Hang hai - Dieu khien tau bien': 'bg-gradient-to-br from-blue-100 to-blue-50',
      'Ky thuat may tau bien': 'bg-gradient-to-br from-slate-200 to-slate-100',
      'Logistics va van tai bien': 'bg-gradient-to-br from-amber-100 to-amber-50',
      'Luat hang hai': 'bg-gradient-to-br from-purple-100 to-purple-50',
      'Luat bien quoc te': 'bg-gradient-to-br from-purple-100 to-purple-50',
    };
    for (const [key, value] of Object.entries(map)) {
      if (categoryName.toLowerCase().includes(key.toLowerCase().substring(0, 8))) return value;
    }
    return 'bg-gradient-to-br from-[#0056D2]/15 to-[#0056D2]/5';
  }

  private initScrollReveal(): void {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    );
    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
  }
}
