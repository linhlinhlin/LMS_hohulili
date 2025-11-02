import { Component, signal, computed, OnInit, Inject, inject } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CategoryHeroComponent } from './shared/category-hero.component';
import { CategoryCourseGridComponent, CategoryCourseItem } from './shared/category-course-grid.component';
import { CategoryCareerComponent } from './shared/category-career.component';
import { CategoryTrendsComponent } from './shared/category-trends.component';
import { Meta, Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { CATEGORY_CONFIGS } from './category.configs';

export interface CategoryConfig {
  id: string;
  title: string;
  subtitle: string;
  iconEmoji: string;
  brandColor: 'blue' | 'green' | 'amber' | 'indigo' | 'rose' | 'cyan';
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  primaryCta: { text: string; link: string; queryParams?: any };
  secondaryCta?: { text: string; link: string; queryParams?: any };
  courses: CategoryCourse[];
  careerCards: CareerCard[];
  trendCards: TrendCard[];
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
}

export interface CategoryCourse {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  students: number;
  rating: number;
  reviews: number;
  price: number;
  instructor: {
    name: string;
    title: string;
    avatar: string;
    credentials: string[];
  };
  thumbnail: string;
  category: string;
  tags: string[];
  skills: string[];
  prerequisites: string[];
  certificate: {
    type: 'STCW' | 'IMO' | 'Professional' | 'Completion';
    description: string;
  };
  curriculum: {
    modules: number;
    lessons: number;
    duration: string;
  };
  isPopular?: boolean;
  isNew?: boolean;
  isFree?: boolean;
}

export interface CareerCard {
  title: string;
  description: string;
  salary: string;
  requirements: string[];
}

export interface TrendCard {
  icon: string;
  title: string;
  highlight: string;
  description: string;
}

@Component({
  selector: 'app-configurable-category',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CategoryHeroComponent,
    CategoryCourseGridComponent,
    CategoryCareerComponent,
    CategoryTrendsComponent
  ],
  template: `
    @if (config(); as categoryConfig) {
      <div class="min-h-screen bg-gray-50">
        <app-category-hero
          [title]="categoryConfig.title"
          [subtitle]="categoryConfig.subtitle"
          [iconEmoji]="categoryConfig.iconEmoji"
          [brandColor]="categoryConfig.brandColor"
          [gradientFrom]="categoryConfig.gradientFrom"
          [gradientVia]="categoryConfig.gradientVia"
          [gradientTo]="categoryConfig.gradientTo"
          [primaryCta]="categoryConfig.primaryCta"
          [secondaryCta]="categoryConfig.secondaryCta"
        ></app-category-hero>

        <!-- Courses preview -->
        <app-category-course-grid
          [title]="'Khóa học nổi bật'"
          [subtitle]="'Khám phá các khóa học chuyên sâu được thiết kế bởi các chuyên gia hàng đầu'"
          [items]="courseItems()"
          [brandColor]="categoryConfig.brandColor"
          [viewAllLink]="'/courses'"
          [viewAllQueryParams]="{ category: categoryConfig.id }"
        ></app-category-course-grid>

        <app-category-career
          [brandColor]="categoryConfig.brandColor"
          [title]="'Cơ hội nghề nghiệp'"
          [subtitle]="'Khám phá các vị trí công việc và cơ hội thăng tiến trong lĩnh vực ' + categoryConfig.title"
          [cards]="categoryConfig.careerCards"
        ></app-category-career>

        <app-category-trends
          [brandColor]="categoryConfig.brandColor"
          [title]="'Xu hướng ngành'"
          [subtitle]="'Cập nhật những xu hướng mới nhất trong lĩnh vực ' + categoryConfig.title"
          [cards]="categoryConfig.trendCards"
        ></app-category-trends>
      </div>
    }
  `
})
export class ConfigurableCategoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  config = signal<CategoryConfig | null>(null);

  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const category = this.route.snapshot.data['category'] || this.route.snapshot.params['category'];
    const categoryConfig = CATEGORY_CONFIGS[category];

    if (categoryConfig) {
      this.config.set(categoryConfig);
      this.updateSEO();
      this.injectCollectionPageJsonLd();
      this.injectItemListJsonLd();
    }
  }

  courseItems = computed<CategoryCourseItem[]>(() => {
    const config = this.config();
    if (!config) return [];
    return config.courses.slice(0, 6).map(course => ({
      id: course.id,
      title: course.title,
      description: course.shortDescription,
      level: course.level,
      price: course.price,
      thumbnailUrl: course.thumbnail,
      link: ['/courses', course.id]
    }));
  });

  private updateSEO(): void {
    const config = this.config();
    if (!config) return;

    this.title.setTitle(config.seoTitle);
    this.meta.updateTag({ name: 'description', content: config.seoDescription });
    this.meta.updateTag({ property: 'og:title', content: config.seoTitle });
    this.meta.updateTag({ property: 'og:description', content: config.seoDescription });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ name: 'keywords', content: config.keywords.join(', ') });
  }

  private injectCollectionPageJsonLd(): void {
    const config = this.config();
    if (!config) return;

    this.injectJsonLd(`jsonld-${config.id}-collection`, {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: config.title,
      description: config.seoDescription,
      about: config.id,
      isPartOf: { '@type': 'WebSite', name: 'LMS Maritime' }
    });
  }

  private injectItemListJsonLd(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const config = this.config();
    if (!config) return;

    const items = config.courses.slice(0, 6).map((course: CategoryCourse, idx: number) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Course',
        name: course.title,
        description: course.shortDescription,
        provider: { '@type': 'Organization', name: 'LMS Maritime' },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: course.rating,
          reviewCount: course.reviews
        }
      }
    }));

    this.injectJsonLd(`jsonld-${config.id}-itemlist`, {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items
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