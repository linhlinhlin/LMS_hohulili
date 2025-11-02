import { Component, signal, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoryHeroComponent } from './shared/category-hero.component';
import { CategoryCourseGridComponent } from './shared/category-course-grid.component';
import { CategoryCareerComponent } from './shared/category-career.component';
import { CategoryTrendsComponent } from './shared/category-trends.component';
import { Meta, Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-logistics-category',
  standalone: true,
  imports: [CommonModule, RouterModule, CategoryHeroComponent, CategoryCourseGridComponent, CategoryCareerComponent, CategoryTrendsComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-category-hero
        [title]="'Logistics Hàng hải'"
        [subtitle]="'Vận tải, cảng biển, chuỗi cung ứng và thủ tục hải quan.'"
        [brandColor]="'indigo'"
        [gradientFrom]="'from-indigo-600'"
        [gradientVia]="'via-indigo-700'"
        [gradientTo]="'to-indigo-800'"
        [primaryCta]="{ text: 'Khám phá khóa học', link: '/courses', queryParams: { category: 'logistics' } }"
      ></app-category-hero>

      <app-category-course-grid
        [title]="'Khóa học nổi bật'"
        [brandColor]="'indigo'"
        [viewAllLink]="'/courses'"
        [viewAllQueryParams]="{ category: 'logistics' }"
        [items]="[
          { id: 'port-operations', title: 'Vận hành Cảng hiện đại', description: 'Quy trình, an toàn và tối ưu hóa vận hành cảng.', level: 'intermediate', link: '/courses/port-operations' },
          { id: 'cargo-handling', title: 'Xử lý Hàng hóa', description: 'Kỹ thuật xếp dỡ, bảo quản và an toàn hàng hóa.', level: 'beginner', link: '/courses/cargo-handling' }
        ]"
      ></app-category-course-grid>

      <app-category-career
        [brandColor]="'indigo'"
        [title]="'Cơ hội nghề nghiệp'"
        [subtitle]="'Các vị trí logistics hàng hải trong chuỗi cung ứng'"
        [cards]="[
          { title: 'Port Operations Specialist', description: 'Vận hành cảng, lập kế hoạch bến bãi', salary: '18-30 triệu VNĐ/tháng', requirements: ['Quy trình cảng', 'An toàn', 'Kinh nghiệm 1-3 năm'] },
          { title: 'Customs & Compliance', description: 'Thủ tục hải quan, tuân thủ quy định', salary: '20-32 triệu VNĐ/tháng', requirements: ['Luật hải quan', 'Chứng từ', 'Tiếng Anh'] },
          { title: 'Supply Chain Planner', description: 'Lập kế hoạch chuỗi cung ứng, tối ưu vận tải', salary: '25-40 triệu VNĐ/tháng', requirements: ['SCM', 'Data/Excel', 'Kinh nghiệm 3-5 năm'] }
        ]"
      ></app-category-career>

      <app-category-trends
        [brandColor]="'indigo'"
        [title]="'Xu hướng ngành'"
        [subtitle]="'Số hóa và tối ưu vận hành logistics hàng hải'"
        [cards]="[
          { icon: '📦', title: 'Số hóa quy trình', highlight: '+30% hiệu suất', description: 'Hệ thống TOS, EDI và theo dõi thời gian thực nâng hiệu quả.' },
          { icon: '⚓', title: 'Green Shipping', highlight: '+20% chương trình', description: 'Giảm phát thải, tối ưu hành trình và năng lượng tại cảng.' }
        ]"
      ></app-category-trends>
    </div>
  `
})
export class LogisticsCategoryComponent implements OnInit {
  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const pageTitle = 'Logistics Hàng hải - LMS Maritime';
    const description = 'Vận tải, cảng biển, chuỗi cung ứng và thủ tục hải quan. Các khóa học logistics hàng hải.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.injectJsonLd('jsonld-category-logistics', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Logistics Hàng hải',
      description,
      about: 'logistics',
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
