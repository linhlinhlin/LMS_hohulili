import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoryHeroComponent } from './shared/category-hero.component';
import { CategoryCourseGridComponent } from './shared/category-course-grid.component';
import { CategoryCareerComponent } from './shared/category-career.component';
import { CategoryTrendsComponent } from './shared/category-trends.component';
import { Meta, Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-navigation-category',
  standalone: true,
  imports: [CommonModule, RouterModule, CategoryHeroComponent, CategoryCourseGridComponent, CategoryCareerComponent, CategoryTrendsComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-category-hero
        [title]="'Điều khiển Tàu'"
        [subtitle]="'Navigation, radar, GPS, ECDIS'"
        [brandColor]="'green'"
        [gradientFrom]="'from-green-600'"
        [gradientVia]="'via-green-700'"
        [gradientTo]="'to-green-800'"
        [primaryCta]="{ text: 'Khám phá khóa học', link: '/courses', queryParams: { category: 'navigation' } }"
      ></app-category-hero>

      <app-category-course-grid
        [title]="'Khóa học nổi bật'"
        [brandColor]="'green'"
        [viewAllLink]="'/courses'"
        [viewAllQueryParams]="{ category: 'navigation' }"
        [items]="[
          { id: 'radar-navigation', title: 'Điều hướng Radar', description: 'Radar, phát hiện mục tiêu và tránh va chạm.', level: 'intermediate', price: 3200000, link: '/courses/radar-navigation' },
          { id: 'gps-ecdis', title: 'GPS & ECDIS', description: 'Định vị toàn cầu và ECDIS hiện đại.', level: 'advanced', price: 3800000, link: '/courses/gps-ecdis' },
          { id: 'celestial-nav', title: 'Điều hướng Thiên văn', description: 'Kỹ thuật sử dụng thiên thể và sextant.', level: 'advanced', price: 4200000, link: '/courses/celestial-nav' }
        ]"
      ></app-category-course-grid>

      <app-category-career
        [brandColor]="'green'"
        [title]="'Cơ hội nghề nghiệp'"
        [subtitle]="'Khám phá các vị trí công việc và cơ hội thăng tiến trong lĩnh vực Điều khiển Tàu'"
        [cards]="[
          { title: 'Navigation Officer', description: 'Chịu trách nhiệm điều hướng và vận hành tàu biển', salary: '18-30 triệu VNĐ/tháng', requirements: ['Chứng chỉ Navigation', 'Kinh nghiệm 3-5 năm', 'Thành thạo ECDIS, GPS'] },
          { title: 'Chief Officer', description: 'Phó thuyền trưởng, quản lý hoạt động điều hướng', salary: '25-40 triệu VNĐ/tháng', requirements: ['Chứng chỉ Chief Officer', 'Kinh nghiệm 5+ năm', 'Kỹ năng lãnh đạo'] },
          { title: 'Master Mariner', description: 'Thuyền trưởng, chỉ huy tàu và toàn bộ hoạt động', salary: '35-60 triệu VNĐ/tháng', requirements: ['Chứng chỉ Master', 'Kinh nghiệm 8+ năm', 'Bằng đại học hàng hải'] }
        ]"
      ></app-category-career>

      <app-category-trends
        [brandColor]="'green'"
        [title]="'Xu hướng ngành'"
        [subtitle]="'Các xu hướng nổi bật trong lĩnh vực Điều khiển Tàu'"
        [cards]="[
          { icon: '🧭', title: 'Điều hướng số', highlight: '+20% áp dụng', description: 'Tăng cường sử dụng ECDIS, hệ thống số và cảm biến hiện đại trong điều hướng.' },
          { icon: '🛰️', title: 'Tích hợp GNSS', highlight: '+30% độ chính xác', description: 'Kết hợp nhiều hệ thống vệ tinh (GPS, GLONASS, Galileo) để tăng độ tin cậy.' }
        ]"
      ></app-category-trends>
    </div>
  `
})
export class NavigationCategoryComponent implements OnInit {
  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const pageTitle = 'Điều khiển Tàu - LMS Maritime';
    const description = 'Navigation, radar, GPS, ECDIS. Khóa học điều hướng hàng hải hiện đại.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.injectJsonLd('jsonld-category-navigation', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Điều khiển Tàu',
      description,
      about: 'navigation',
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

