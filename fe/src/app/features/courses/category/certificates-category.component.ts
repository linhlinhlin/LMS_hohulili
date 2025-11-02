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
  selector: 'app-certificates-category',
  standalone: true,
  imports: [CommonModule, RouterModule, CategoryHeroComponent, CategoryCourseGridComponent, CategoryCareerComponent, CategoryTrendsComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-category-hero
        [title]="'Chứng chỉ Chuyên môn'"
        [subtitle]="'STCW, IMO và các chứng chỉ quốc tế cập nhật.'"
        [brandColor]="'cyan'"
        [gradientFrom]="'from-cyan-600'"
        [gradientVia]="'via-cyan-700'"
        [gradientTo]="'to-cyan-800'"
        [primaryCta]="{ text: 'Xem khóa học', link: '/courses', queryParams: { category: 'certificates' } }"
      ></app-category-hero>

      <app-category-course-grid
        [title]="'Lựa chọn phổ biến'"
        [brandColor]="'cyan'"
        [viewAllLink]="'/courses'"
        [viewAllQueryParams]="{ category: 'certificates' }"
        [items]="[
          { id: 'stcw-advanced', title: 'STCW Nâng cao', description: 'Cập nhật chuẩn quốc tế mới nhất.', level: 'advanced', link: '/courses/stcw-advanced' },
          { id: 'imo-certificates', title: 'Chứng chỉ IMO', description: 'Các quy định IMO quan trọng.', level: 'advanced', link: '/courses/imo-certificates' }
        ]"
      ></app-category-course-grid>

      <app-category-career
        [brandColor]="'cyan'"
        [title]="'Cơ hội nghề nghiệp'"
        [subtitle]="'Các vị trí yêu cầu chứng chỉ STCW/IMO cập nhật'"
        [cards]="[
          { title: 'STCW Certified Crew', description: 'Vận hành, an toàn và ứng phó khẩn cấp', salary: '16-28 triệu VNĐ/tháng', requirements: ['STCW cơ bản/nâng cao', 'Y tế', 'Kỷ luật'] },
          { title: 'HSE Specialist', description: 'An toàn, môi trường và tuân thủ trên tàu/cảng', salary: '22-38 triệu VNĐ/tháng', requirements: ['ISM/ISPS', 'Đánh giá rủi ro', 'Báo cáo sự cố'] },
          { title: 'Training Instructor', description: 'Giảng dạy, kiểm định và tái chứng nhận', salary: '28-45 triệu VNĐ/tháng', requirements: ['Chứng chỉ sư phạm', 'Kinh nghiệm thực tế', 'Tiêu chuẩn IMO'] }
        ]"
      ></app-category-career>

      <app-category-trends
        [brandColor]="'cyan'"
        [title]="'Xu hướng ngành'"
        [subtitle]="'Chuẩn hóa quốc tế và tái chứng nhận định kỳ'"
        [cards]="[
          { icon: '🏆', title: 'Tăng nhu cầu chứng chỉ', highlight: '+18%/năm', description: 'Các hãng yêu cầu tái chứng nhận và cập nhật kỹ năng thường xuyên.' },
          { icon: '🧪', title: 'Đào tạo thực hành', highlight: '+25% thời lượng', description: 'Tăng cường mô phỏng và thực hành cho các tình huống khẩn cấp.' }
        ]"
      ></app-category-trends>
    </div>
  `
})
export class CertificatesCategoryComponent implements OnInit {
  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const pageTitle = 'Chứng chỉ Chuyên môn - LMS Maritime';
    const description = 'STCW, IMO và các chứng chỉ quốc tế cập nhật. Danh mục khóa học chứng chỉ hàng hải.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.injectJsonLd('jsonld-category-certificates', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Chứng chỉ Chuyên môn',
      description,
      about: 'certificates',
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
