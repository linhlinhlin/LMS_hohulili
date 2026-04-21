import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-about',
  imports: [RouterModule],
  template: `
    <!-- ══════════════════════════════════════════════
         HERO — Matching landing page maritime style
         ══════════════════════════════════════════════ -->
    <section class="relative overflow-hidden bg-[#0a1628]">
      <div class="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d2847] to-[#0056D2]/40"></div>
      <div class="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 80" fill="none" class="w-full" preserveAspectRatio="none">
          <path d="M0,48 C360,80 720,0 1080,48 C1260,64 1380,56 1440,48 L1440,80 L0,80 Z" fill="white"/>
        </svg>
      </div>
      <div class="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-28 pt-20 md:pt-28">
        <div class="max-w-3xl">
          <p class="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-blue-300/70">Giới thiệu</p>
          <h1 class="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
            Về LMS Maritime
          </h1>
          <p class="mt-6 max-w-xl text-lg leading-relaxed text-blue-100/70">
            Nền tảng đào tạo hàng hải hiện đại, tích hợp trí tuệ nhân tạo và hoạt động ngoại tuyến — được phát triển bởi The Wiii Lab, Hải Phòng.
          </p>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         MISSION + VISION
         ══════════════════════════════════════════════ -->
    <section class="bg-white py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-3xl text-center mb-16">
          <h2 class="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">Sứ mệnh của chúng tôi</h2>
          <p class="mt-4 text-lg text-gray-500">Nâng cao chất lượng đào tạo hàng hải Việt Nam thông qua công nghệ</p>
        </div>
        <div class="grid gap-8 md:grid-cols-2">
          <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0056D2]/10">
              <svg class="h-6 w-6 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900">Mục tiêu</h3>
            <p class="mt-3 leading-relaxed text-gray-600">
              Cung cấp nền tảng học tập trực tuyến hiện đại, đào tạo chuyên sâu về kiến thức hàng hải,
              góp phần nâng cao chất lượng nhân lực ngành hàng hải Việt Nam.
            </p>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <svg class="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path d="m12 3-1.9 5.8a2 2 0 01-1.3 1.3L3 12l5.8 1.9a2 2 0 011.3 1.3L12 21l1.9-5.8a2 2 0 011.3-1.3L21 12l-5.8-1.9a2 2 0 01-1.3-1.3L12 3Z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900">Tầm nhìn</h3>
            <p class="mt-3 leading-relaxed text-gray-600">
              Trở thành hệ thống LMS hàng đầu trong lĩnh vực đào tạo hàng hải,
              được tin tưởng bởi các tổ chức và cá nhân trong ngành — không chỉ ở Việt Nam mà còn khu vực.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         FEATURES — 3 columns with icons
         ══════════════════════════════════════════════ -->
    <section class="bg-slate-50 py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto mb-16 max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">Tính năng nổi bật</h2>
          <p class="mt-4 text-lg text-gray-500">Công nghệ tiên tiến phục vụ đào tạo hàng hải</p>
        </div>
        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
          @for (feature of features; track feature.title; let idx = $index) {
            <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl" [class]="feature.iconBg">
                <svg class="h-6 w-6" [class]="feature.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  @switch (feature.icon) {
                    @case ('book') {
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    }
                    @case ('check') {
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    }
                    @case ('bolt') {
                      <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    }
                  }
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900">{{ feature.title }}</h3>
              <p class="mt-3 leading-relaxed text-gray-600">{{ feature.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         TEAM — 4 thành viên The Wiii Lab
         ══════════════════════════════════════════════ -->
    <section class="bg-white py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto mb-16 max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">Thành viên The Wiii Lab</h2>
          <p class="mt-4 text-lg text-gray-500">Đội ngũ nghiên cứu và phát triển đến từ Hải Phòng</p>
        </div>
        <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          @for (member of team; track member.name) {
            <div class="group text-center">
              <div class="relative mx-auto mb-5 h-40 w-40 overflow-hidden rounded-2xl border-2 border-gray-100 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:border-[#0056D2]/30">
                <img [src]="member.photo" [alt]="member.name"
                     class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105">
              </div>
              <h3 class="text-lg font-bold text-gray-900">{{ member.name }}</h3>
              <p class="mt-1 text-sm font-medium text-[#0056D2]">{{ member.role }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         CTA — Call to action
         ══════════════════════════════════════════════ -->
    <section class="overflow-hidden bg-[#0a1628] py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-bold tracking-tight text-white lg:text-4xl">
          Sẵn sàng bắt đầu hành trình học tập?
        </h2>
        <p class="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-blue-100/60">
          Tham gia ngay để trải nghiệm hệ thống đào tạo hàng hải chuyên nghiệp
        </p>
        <div class="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <a routerLink="/auth/login"
             class="inline-flex items-center justify-center rounded-lg bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0a1628] shadow-lg shadow-white/10 transition-all hover:bg-blue-50 hover:shadow-xl">
            Bắt đầu ngay
            <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
          <a routerLink="/courses"
             class="inline-flex items-center justify-center rounded-lg border border-white/20 px-7 py-3.5 text-[15px] font-medium text-white/90 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/5">
            Xem khóa học
          </a>
        </div>
      </div>
    </section>
  `
})
export class AboutComponent implements OnInit {
  private seo = inject(SeoService);

  readonly features = [
    {
      icon: 'book', title: 'Khóa học chuyên sâu',
      desc: 'Nội dung đào tạo được thiết kế bởi các chuyên gia hàng hải giàu kinh nghiệm, theo chuẩn STCW quốc tế.',
      iconBg: 'bg-[#0056D2]/10', iconColor: 'text-[#0056D2]'
    },
    {
      icon: 'check', title: 'Hệ thống đánh giá',
      desc: 'Quiz, bài tập và kiểm tra thực tế giúp đánh giá chính xác năng lực học viên theo tiêu chuẩn ngành.',
      iconBg: 'bg-green-100', iconColor: 'text-green-600'
    },
    {
      icon: 'bolt', title: 'Học tập linh hoạt',
      desc: 'Học mọi lúc, mọi nơi — kể cả trên biển. Tích hợp AI trợ giảng và hoạt động ngoại tuyến hoàn toàn.',
      iconBg: 'bg-purple-100', iconColor: 'text-purple-600'
    }
  ];

  readonly team = [
    { name: 'Nghiêm Thị Mỹ Linh', role: 'Nghiên cứu viên', photo: '/images/team-nghiemlinh.jpg' },
    { name: 'Phạm Thị Minh Hồng', role: 'Nghiên cứu viên', photo: '/images/team-hong.jpg' },
    { name: 'Nguyễn Thùy Linh', role: 'Nghiên cứu viên', photo: '/images/team-thuylinh.jpg' },
    { name: 'Nguyễn Mạnh Hùng', role: 'Nghiên cứu viên', photo: '/images/team-hung.jpg' },
  ];

  ngOnInit(): void {
    this.seo.setPageMeta(
      'Giới thiệu',
      'Về LMS Maritime — nền tảng đào tạo hàng hải hiện đại, phát triển bởi The Wiii Lab, Hải Phòng.',
      undefined,
      'https://holilihu.online/about'
    );
    this.seo.setCanonical('https://holilihu.online/about');
  }
}
