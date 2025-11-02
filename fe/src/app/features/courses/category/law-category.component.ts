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
  selector: 'app-law-category',
  standalone: true,
  imports: [CommonModule, RouterModule, CategoryHeroComponent, CategoryCourseGridComponent, CategoryCareerComponent, CategoryTrendsComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-category-hero
        [title]="'Luật Hàng hải'"
        [subtitle]="'Quy định quốc tế, bảo hiểm, hợp đồng và môi trường biển.'"
        [brandColor]="'rose'"
        [gradientFrom]="'from-rose-600'"
        [gradientVia]="'via-rose-700'"
        [gradientTo]="'to-rose-800'"
        [primaryCta]="{ text: 'Bắt đầu học', link: '/courses', queryParams: { category: 'law' } }"
      ></app-category-hero>

      <app-category-course-grid
        [title]="'Khóa học tiêu biểu'"
        [brandColor]="'rose'"
        [viewAllLink]="'/courses'"
        [viewAllQueryParams]="{ category: 'law' }"
        [items]="[
          { id: 'maritime-law', title: 'Luật Hàng hải Quốc tế', description: 'Công ước, quy tắc và áp dụng thực tiễn.', level: 'advanced', link: '/courses/maritime-law' },
          { id: 'insurance', title: 'Bảo hiểm Hàng hải', description: 'Rủi ro, điều khoản và quy trình bồi thường.', level: 'intermediate', link: '/courses/insurance' }
        ]"
      ></app-category-course-grid>

      <app-category-career
        [brandColor]="'rose'"
        [title]="'Cơ hội nghề nghiệp'"
        [subtitle]="'Vị trí pháp chế hàng hải và bảo hiểm'"
        [cards]="[
          { title: 'Maritime Lawyer', description: 'Tư vấn hợp đồng, tranh chấp vận tải biển', salary: '30-55 triệu VNĐ/tháng', requirements: ['Luật thương mại', 'Tiếng Anh pháp lý', 'Kinh nghiệm 3-5 năm'] },
          { title: 'Claims & Insurance', description: 'Bồi thường, giám định tổn thất', salary: '25-45 triệu VNĐ/tháng', requirements: ['Bảo hiểm hàng hải', 'Đánh giá rủi ro', 'Giao tiếp'] },
          { title: 'Compliance Officer', description: 'Tuân thủ, môi trường và an toàn', salary: '22-40 triệu VNĐ/tháng', requirements: ['Quy định IMO', 'Báo cáo', 'Chi tiết cẩn trọng'] }
        ]"
      ></app-category-career>

      <app-category-trends
        [brandColor]="'rose'"
        [title]="'Xu hướng ngành'"
        [subtitle]="'Cập nhật quy định quốc tế và tiêu chuẩn tuân thủ'"
        [cards]="[
          { icon: '⚖️', title: 'Cập nhật công ước', highlight: '+10%/năm', description: 'Quy định mới về an toàn, môi trường đòi hỏi tái chứng nhận định kỳ.' },
          { icon: '📝', title: 'Hợp đồng điện tử', highlight: '+40% áp dụng', description: 'E-bill of lading và chữ ký số trong vận tải biển.' }
        ]"
      ></app-category-trends>
    </div>
  `
})
export class LawCategoryComponent implements OnInit {
  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const pageTitle = 'Luật Hàng hải - LMS Maritime';
    const description = 'Quy định quốc tế, bảo hiểm, hợp đồng và môi trường biển. Khóa học pháp lý hàng hải.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.injectJsonLd('jsonld-category-law', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Luật Hàng hải',
      description,
      about: 'law',
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
