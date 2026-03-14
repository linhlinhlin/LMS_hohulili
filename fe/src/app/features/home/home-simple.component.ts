import {
  Component, ChangeDetectionStrategy, OnInit, AfterViewInit,
  signal, computed, inject, PLATFORM_ID, ElementRef, viewChildren
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
    <!-- ═══════════════════════════════════════════════════════════
         SECTION 1: HERO — Maritime Identity
         ═══════════════════════════════════════════════════════════ -->
    <section class="hero-section relative overflow-hidden bg-[#0a1628]">
      <!-- Ocean gradient layers -->
      <div class="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d2847] to-[#0056D2]/40"></div>

      <!-- Subtle wave SVG at bottom -->
      <div class="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 120" fill="none" class="w-full" preserveAspectRatio="none">
          <path d="M0,64 C360,120 720,0 1080,64 C1260,96 1380,80 1440,64 L1440,120 L0,120 Z" fill="white" opacity="1"/>
          <path d="M0,80 C480,20 960,100 1440,40 L1440,120 L0,120 Z" fill="white" opacity="0.6"/>
        </svg>
      </div>

      <!-- Compass watermark -->
      <div class="absolute top-1/2 right-[8%] -translate-y-1/2 opacity-[0.04] hidden lg:block">
        <svg viewBox="0 0 200 200" class="w-[420px] h-[420px]" fill="none" stroke="white" stroke-width="0.5">
          <circle cx="100" cy="100" r="90"/>
          <circle cx="100" cy="100" r="70"/>
          <circle cx="100" cy="100" r="4" fill="white"/>
          <line x1="100" y1="8" x2="100" y2="42" stroke-width="1.5"/>
          <line x1="100" y1="158" x2="100" y2="192" stroke-width="1.5"/>
          <line x1="8" y1="100" x2="42" y2="100" stroke-width="1.5"/>
          <line x1="158" y1="100" x2="192" y2="100" stroke-width="1.5"/>
          <polygon points="100,25 106,80 100,70 94,80" fill="white" stroke="none" opacity="0.3"/>
          <text x="100" y="20" text-anchor="middle" fill="white" font-size="10" opacity="0.5">N</text>
          <text x="100" y="198" text-anchor="middle" fill="white" font-size="10" opacity="0.5">S</text>
          <text x="6" y="104" text-anchor="middle" fill="white" font-size="10" opacity="0.5">W</text>
          <text x="196" y="104" text-anchor="middle" fill="white" font-size="10" opacity="0.5">E</text>
        </svg>
      </div>

      <div class="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-32 pt-20 md:pt-28 lg:pt-32">
        <div class="max-w-3xl">
          <!-- Overline -->
          <p class="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-[#0056D2]/60 text-blue-300/70">
            Nền tảng đào tạo hàng hải Việt Nam
          </p>

          <!-- Headline -->
          <h1 class="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Học Hàng hải mọi lúc
            <span class="mt-1 block bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              kể cả trên biển.
            </span>
          </h1>

          <!-- Subtitle -->
          <p class="mt-6 max-w-xl text-lg leading-relaxed text-blue-100/70 sm:text-xl">
            Nền tảng đầu tiên tại Việt Nam tích hợp trí tuệ nhân tạo và
            hoạt động ngoại tuyến — được thiết kế cho người đi biển.
          </p>

          <!-- CTAs -->
          <div class="mt-10 flex flex-col gap-4 sm:flex-row">
            <a routerLink="/courses"
               class="inline-flex items-center justify-center rounded-lg bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0a1628] shadow-lg shadow-white/10 transition-all hover:bg-blue-50 hover:shadow-xl hover:shadow-white/20">
              Khám phá khóa học
              <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
            <a href="https://wiii.holilihu.online" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center justify-center rounded-lg border border-white/20 px-7 py-3.5 text-[15px] font-medium text-white/90 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/5 hover:text-white">
              Dùng thử Wiii AI
              <svg class="ml-2 h-4 w-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         SECTION 2: COURSE SPOTLIGHT — Real courses from API
         ═══════════════════════════════════════════════════════════ -->
    <section class="scroll-reveal bg-white py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 flex items-end justify-between">
          <div>
            <h2 class="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">Khóa học nổi bật</h2>
            <p class="mt-3 text-lg text-gray-500">Được thiết kế bởi chuyên gia hàng hải hàng đầu</p>
          </div>
          <a routerLink="/courses"
             class="hidden items-center text-[15px] font-medium text-[#0056D2] transition-colors hover:text-[#004BB5] sm:flex">
            Xem tất cả
            <svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>

        @if (coursesLoading()) {
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            @for (i of [1,2,3,4]; track i) {
              <div class="animate-pulse rounded-xl border border-gray-100 bg-white">
                <div class="h-40 rounded-t-xl bg-gray-100"></div>
                <div class="p-4 space-y-3">
                  <div class="h-4 w-3/4 rounded bg-gray-100"></div>
                  <div class="h-3 w-1/2 rounded bg-gray-100"></div>
                  <div class="h-4 w-1/3 rounded bg-gray-100"></div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            @for (course of courses(); track course.id) {
              <a [routerLink]="['/courses', course.id]"
                 class="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                <!-- Thumbnail -->
                <div class="relative h-40 overflow-hidden bg-gradient-to-br from-[#0056D2]/10 to-[#0056D2]/5">
                  @if (course.thumbnailUrl) {
                    <img [src]="course.thumbnailUrl"
                         [alt]="course.title"
                         (error)="$any($event.target).style.display='none'"
                         class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105">
                  }
                  @if (course.categoryName) {
                    <span class="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700 backdrop-blur-sm">
                      {{ course.categoryName }}
                    </span>
                  }
                </div>
                <!-- Info -->
                <div class="p-4">
                  <h3 class="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-[#0056D2]">
                    {{ course.title }}
                  </h3>
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
          <a routerLink="/courses" class="text-[15px] font-medium text-[#0056D2]">Xem tất cả khóa học →</a>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         SECTION 3: DIFFERENTIATORS — What makes this different
         ═══════════════════════════════════════════════════════════ -->
    <section class="scroll-reveal bg-slate-50 py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto mb-16 max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">Được thiết kế cho ngành Hàng hải</h2>
          <p class="mt-4 text-lg text-gray-500">Ba khác biệt mà không nền tảng nào khác có được</p>
        </div>

        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
          <!-- Offline PWA -->
          <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0056D2]/10">
              <svg class="h-6 w-6 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900">Học trên biển</h3>
            <p class="mt-3 leading-relaxed text-gray-600">
              Tải khóa học và video về thiết bị, học tập ngay cả khi không có internet.
              Khi có mạng, tiến độ tự động đồng bộ lên hệ thống.
            </p>
            <p class="mt-4 text-sm font-medium text-[#0056D2]/80">Progressive Web App · Offline-first</p>
          </div>

          <!-- AI Assistant -->
          <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
              <svg class="h-6 w-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900">Wiii AI trợ giảng 24/7</h3>
            <p class="mt-3 leading-relaxed text-gray-600">
              Trợ lý AI hiểu chuyên sâu về hàng hải — giải đáp thắc mắc, gợi ý lộ trình,
              hỗ trợ ôn thi bằng tiếng Việt ngay trong lúc học.
            </p>
            <a href="https://wiii.holilihu.online" target="_blank" rel="noopener noreferrer"
               class="mt-4 inline-flex items-center text-sm font-medium text-cyan-600 hover:text-cyan-700">
              Trải nghiệm Wiii AI
              <svg class="ml-1 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>

          <!-- STCW Certificates -->
          <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <svg class="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900">Chứng chỉ STCW / IMO</h3>
            <p class="mt-3 leading-relaxed text-gray-600">
              Hoàn thành khóa học và nhận chứng chỉ theo chuẩn quốc tế STCW, được
              công nhận bởi Trường Đại học Hàng hải Việt Nam.
            </p>
            <p class="mt-4 text-sm font-medium text-amber-600/80">International Maritime Organization</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         SECTION 4: CATEGORIES — 6 Maritime Fields
         ═══════════════════════════════════════════════════════════ -->
    <section class="scroll-reveal bg-white py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto mb-14 max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">Lĩnh vực đào tạo</h2>
          <p class="mt-4 text-lg text-gray-500">Chương trình chuyên sâu theo từng lĩnh vực hàng hải</p>
        </div>

        <div class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          @for (cat of categories; track cat.slug) {
            <a [routerLink]="['/courses']" [queryParams]="{category: cat.slug}"
               class="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-[#0056D2]/30 hover:bg-[#0056D2]/[0.02] hover:shadow-sm sm:p-6">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-2xl"
                   [class]="cat.bgClass">
                {{ cat.icon }}
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

    <!-- ═══════════════════════════════════════════════════════════
         SECTION 5: AI ASSISTANT — Wiii Showcase
         ═══════════════════════════════════════════════════════════ -->
    <section class="scroll-reveal overflow-hidden bg-[#0a1628] py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <!-- Text -->
          <div>
            <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Powered by AI
            </div>
            <h2 class="text-3xl font-bold tracking-tight text-white lg:text-4xl">
              Trợ giảng AI Wiii
            </h2>
            <p class="mt-5 text-lg leading-relaxed text-blue-100/60">
              Wiii AI hiểu sâu về lĩnh vực hàng hải — từ quy tắc tránh va (COLREGS) đến kỹ thuật máy tàu.
              Hỗ trợ bạn 24/7 bằng tiếng Việt, ngay trong quá trình học.
            </p>
            <ul class="mt-8 space-y-4">
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span class="text-blue-100/70">Giải đáp thắc mắc chuyên ngành hàng hải</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span class="text-blue-100/70">Gợi ý lộ trình học và thi chứng chỉ phù hợp</span>
              </li>
              <li class="flex items-start gap-3">
                <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span class="text-blue-100/70">Hỗ trợ ôn thi, tóm tắt bài giảng</span>
              </li>
            </ul>
            <div class="mt-10">
              <a href="https://wiii.holilihu.online" target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center rounded-lg bg-cyan-500 px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 hover:shadow-xl hover:shadow-cyan-500/30">
                Trò chuyện với Wiii
                <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>
            </div>
          </div>

          <!-- Chat mockup -->
          <div class="relative">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-1 shadow-2xl backdrop-blur-sm">
              <div class="rounded-xl bg-[#111b2e] p-6">
                <!-- Chat header -->
                <div class="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                  <div class="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/20">
                    <svg class="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">Wiii AI</p>
                    <p class="text-xs text-green-400">Trực tuyến</p>
                  </div>
                </div>
                <!-- Messages -->
                <div class="space-y-4">
                  <div class="flex justify-end">
                    <div class="rounded-2xl rounded-tr-md bg-[#0056D2] px-4 py-2.5 text-sm text-white">
                      Quy tắc tránh va COLREGS áp dụng thế nào khi hai tàu đối hướng?
                    </div>
                  </div>
                  <div class="flex justify-start">
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

    <!-- ═══════════════════════════════════════════════════════════
         SECTION 6: FOR ORGANIZATIONS — B2B/B2G
         ═══════════════════════════════════════════════════════════ -->
    <section class="scroll-reveal bg-white py-20 lg:py-28">
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
                <li class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  Quản lý tiến độ đào tạo đội ngũ
                </li>
                <li class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  Nội dung tùy chỉnh theo yêu cầu tổ chức
                </li>
                <li class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  Báo cáo phân tích và chứng chỉ hàng loạt
                </li>
              </ul>
              <a routerLink="/contact" [queryParams]="{type: 'enterprise'}"
                 class="mt-8 inline-flex items-center rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-slate-900 transition-all hover:bg-blue-50">
                Liên hệ tư vấn
                <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </a>
            </div>
            <!-- Visual element -->
            <div class="hidden items-center justify-center p-14 lg:flex">
              <div class="grid grid-cols-2 gap-4 text-center">
                <div class="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
                  <div class="text-3xl font-bold text-white">IMO</div>
                  <div class="mt-1 text-xs text-slate-400">Tiêu chuẩn quốc tế</div>
                </div>
                <div class="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
                  <div class="text-3xl font-bold text-white">STCW</div>
                  <div class="mt-1 text-xs text-slate-400">Chứng chỉ chuyên ngành</div>
                </div>
                <div class="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
                  <div class="text-3xl font-bold text-white">24/7</div>
                  <div class="mt-1 text-xs text-slate-400">Hỗ trợ AI</div>
                </div>
                <div class="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
                  <div class="text-3xl font-bold text-white">PWA</div>
                  <div class="mt-1 text-xs text-slate-400">Học ngoại tuyến</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         SECTION 7: BRAND FOOTER NOTE
         ═══════════════════════════════════════════════════════════ -->
    <section class="border-t border-gray-100 bg-slate-50 py-10">
      <div class="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p class="text-sm text-gray-400">
          Sản phẩm của
          <span class="font-medium text-gray-600">The Wiii Lab</span>
          — Hong · Linh · Linh · Hung
        </p>
      </div>
    </section>
  `,
  styles: [`
    .hero-section {
      min-height: 85vh;
    }

    /* Scroll reveal animation */
    .scroll-reveal {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .scroll-reveal.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Line clamp for course titles */
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
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  courses = signal<FeaturedCourse[]>([]);
  coursesLoading = signal(true);

  readonly categories = [
    { name: 'An toàn Hàng hải', slug: 'safety', icon: '🛟', desc: 'SOLAS, cứu sinh, phòng cháy', bgClass: 'bg-red-50' },
    { name: 'Điều khiển tàu', slug: 'navigation', icon: '🧭', desc: 'Hàng hải thiên văn, radar, ECDIS', bgClass: 'bg-blue-50' },
    { name: 'Kỹ thuật máy tàu', slug: 'engineering', icon: '⚙️', desc: 'Diesel, turbine, hệ thống điện', bgClass: 'bg-slate-50' },
    { name: 'Logistics Hàng hải', slug: 'logistics', icon: '📦', desc: 'Vận tải container, cảng biển', bgClass: 'bg-amber-50' },
    { name: 'Luật Hàng hải', slug: 'law', icon: '⚖️', desc: 'UNCLOS, bảo hiểm, hợp đồng', bgClass: 'bg-purple-50' },
    { name: 'Chứng chỉ STCW', slug: 'certificates', icon: '📜', desc: 'GMDSS, Radar, ECDIS, GOC', bgClass: 'bg-green-50' },
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

  private initScrollReveal(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
  }
}
