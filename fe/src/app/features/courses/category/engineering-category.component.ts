import { Component, signal, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoryHeroComponent } from './shared/category-hero.component';
import { CategoryCourseGridComponent } from './shared/category-course-grid.component';
import { CategoryCareerComponent } from './shared/category-career.component';
import { CategoryTrendsComponent } from './shared/category-trends.component';
import { Meta, Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-engineering-category',
  imports: [RouterModule, CategoryHeroComponent, CategoryCourseGridComponent, CategoryCareerComponent, CategoryTrendsComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-category-hero
        [title]="'Kỹ thuật Máy tàu'"
        [subtitle]="'Động cơ, hệ thống, bảo trì và tự động hóa tàu biển.'"
        [brandColor]="'amber'"
        [gradientFrom]="'from-amber-600'"
        [gradientVia]="'via-amber-700'"
        [gradientTo]="'to-amber-800'"
        [primaryCta]="{ text: 'Xem tất cả khóa học', link: '/courses' }"
        [secondaryCta]="{ text: 'Khóa học theo chủ đề', link: '/courses', queryParams: { category: 'engineering' } }"
      ></app-category-hero>

      <!-- Courses preview -->
      <app-category-course-grid
        [title]="'Khóa học nổi bật'"
        [subtitle]="'Bắt đầu với những kỹ năng cốt lõi cho kỹ sư máy tàu'"
        [brandColor]="'amber'"
        [viewAllLink]="'/courses'"
        [viewAllQueryParams]="{ category: 'engineering' }"
        [items]="[
          { id: 'marine-engines', title: 'Động cơ Hàng hải cơ bản', description: 'Nguyên lý hoạt động và bảo dưỡng cơ bản của động cơ tàu.', level: 'beginner', price: 1800000, link: '/courses/marine-engines' },
          { id: 'electrical-systems', title: 'Hệ thống điện và điều khiển', description: 'Chẩn đoán, bảo trì hệ thống điện – điều khiển trên tàu.', level: 'intermediate', price: 2400000, link: '/courses/electrical-systems' }
        ]"
      ></app-category-course-grid>

      <app-category-career
        [brandColor]="'amber'"
        [title]="'Cơ hội nghề nghiệp'"
        [subtitle]="'Vai trò kỹ sư máy tàu trong vận hành và bảo trì hiện đại'"
        [cards]="[
          { title: 'Marine Engineer', description: 'Vận hành, bảo trì hệ thống động lực tàu', salary: '22-40 triệu VNĐ/tháng', requirements: ['Bằng Kỹ sư Máy tàu', 'Kinh nghiệm 2-3 năm', 'An toàn & ISM'] },
          { title: 'Electrical/Automation Engineer', description: 'Hệ thống điện, điều khiển và tự động hóa', salary: '25-45 triệu VNĐ/tháng', requirements: ['Điện - Điều khiển', 'PLC/SCADA', 'Kinh nghiệm 3-5 năm'] },
          { title: 'Maintenance Supervisor', description: 'Quản lý bảo trì dự phòng và sửa chữa', salary: '28-50 triệu VNĐ/tháng', requirements: ['CMMS', 'Kỹ năng quản lý', 'Kinh nghiệm 5+ năm'] }
        ]"
      ></app-category-career>

      <app-category-trends
        [brandColor]="'amber'"
        [title]="'Xu hướng ngành'"
        [subtitle]="'Công nghệ và phương pháp bảo trì mới trong lĩnh vực máy tàu'"
        [cards]="[
          { icon: 'settings', title: 'Bảo trì dự đoán (PdM)', highlight: '+35% áp dụng', description: 'Ứng dụng cảm biến và phân tích dữ liệu để dự đoán hỏng hóc.' },
          { icon: 'plug', title: 'Điện hóa & Tự động hóa', highlight: '+25% nhu cầu', description: 'Hệ thống điện lai, tự động hóa nâng cao trên tàu thế hệ mới.' }
        ]"
      ></app-category-trends>
    </div>
  `
})
export class EngineeringCategoryComponent implements OnInit {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject<Document>(DOCUMENT);
  private platformId = inject<Object>(PLATFORM_ID);


  ngOnInit(): void {
    const pageTitle = 'Kỹ thuật Máy tàu - LMS Maritime';
    const description = 'Động cơ, hệ thống, bảo trì và tự động hóa tàu biển. Khóa học nổi bật cho kỹ sư máy tàu.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.injectJsonLd('jsonld-category-engineering', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Kỹ thuật Máy tàu',
      description,
      about: 'engineering',
      isPartOf: { '@type': 'WebSite', name: 'LMS Maritime' }
    });
  }

  private injectJsonLd(id: string, data: unknown): void {
    if (!isPlatformBrowser(this.platformId)) return;
    let scriptEl = this.document.getElementById(id) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = this.document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.id = id;
      this.document.head.appendChild(scriptEl);
    }
    scriptEl.text = JSON.stringify(data);
  }
}
