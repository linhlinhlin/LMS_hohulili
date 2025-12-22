import { Component, signal, computed, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoryHeroComponent } from './shared/category-hero.component';
import { CategoryCourseGridComponent, CategoryCourseItem } from './shared/category-course-grid.component';
import { CategoryCareerComponent } from './shared/category-career.component';
import { CategoryTrendsComponent } from './shared/category-trends.component';
import { Meta, Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';

interface Course {
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

@Component({
  selector: 'app-safety-category',
  standalone: true,
  imports: [CommonModule, RouterModule, CategoryHeroComponent, CategoryCourseGridComponent, CategoryCareerComponent, CategoryTrendsComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-category-hero
        [title]="'An toàn Hàng hải'"
        [subtitle]="'Chứng chỉ STCW, an toàn lao động và quản lý rủi ro trên biển.'"
        [iconEmoji]="'🛡️'"
        [brandColor]="'blue'"
        [gradientFrom]="'from-blue-600'"
        [gradientVia]="'via-blue-700'"
        [gradientTo]="'to-blue-800'"
        [primaryCta]="{ text: 'Xem tất cả khóa học', link: '/courses' }"
        [secondaryCta]="{ text: 'Khóa học theo chủ đề', link: '/courses', queryParams: { category: 'safety' } }"
      ></app-category-hero>

      <!-- Courses preview -->
      <app-category-course-grid
        [title]="'Khóa học nổi bật'"
        [subtitle]="'Khám phá các khóa học chuyên sâu được thiết kế bởi các chuyên gia hàng đầu'"
        [items]="courseItems()"
        [brandColor]="'blue'"
        [viewAllLink]="'/courses'"
        [viewAllQueryParams]="{ category: 'safety' }"
      ></app-category-course-grid>


      <app-category-career
        [brandColor]="'blue'"
        [title]="'Cơ hội nghề nghiệp'"
        [subtitle]="'Khám phá các vị trí công việc và cơ hội thăng tiến trong lĩnh vực An toàn Hàng hải'"
        [cards]="[
          { title: 'Safety Officer', description: 'Chịu trách nhiệm về an toàn và bảo vệ môi trường trên tàu', salary: '15-25 triệu VNĐ/tháng', requirements: ['Chứng chỉ STCW', 'Kinh nghiệm 2-3 năm', 'Tiếng Anh giao tiếp', 'Kỹ năng quản lý'] },
          { title: 'Marine Safety Inspector', description: 'Kiểm tra và đánh giá an toàn tàu biển tại cảng', salary: '20-35 triệu VNĐ/tháng', requirements: ['Chứng chỉ IMO', 'Kinh nghiệm 5+ năm', 'Bằng đại học liên quan', 'Chứng chỉ kiểm tra'] },
          { title: 'Safety Manager', description: 'Quản lý hệ thống an toàn cho công ty vận tải biển', salary: '30-50 triệu VNĐ/tháng', requirements: ['Chứng chỉ ISM', 'Kinh nghiệm 8+ năm', 'Kỹ năng lãnh đạo', 'Bằng thạc sĩ ưu tiên'] }
        ]"
      ></app-category-career>

      <app-category-trends
        [brandColor]="'blue'"
        [title]="'Xu hướng ngành'"
        [subtitle]="'Cập nhật những xu hướng mới nhất trong lĩnh vực an toàn hàng hải'"
        [cards]="[
          { icon: '📈', title: 'Tăng cường quy định an toàn', highlight: '+15% mỗi năm', description: 'IMO liên tục cập nhật các quy định an toàn mới, yêu cầu nhân sự có chứng chỉ cập nhật.' },
          { icon: '🤖', title: 'Công nghệ an toàn mới', highlight: '+25% mỗi năm', description: 'Ứng dụng AI và IoT trong quản lý an toàn, tạo cơ hội cho chuyên gia công nghệ.' }
        ]"
      ></app-category-trends>
    </div>
  `
})
export class SafetyCategoryComponent implements OnInit {
  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const pageTitle = 'An toàn Hàng hải - Khóa học STCW, ISM, IMO | LMS Maritime';
    const description = 'Khóa học an toàn hàng hải chuyên nghiệp: STCW, ISM Code, IMO. Chứng chỉ quốc tế, giảng viên kinh nghiệm. Đăng ký ngay!';
    
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ name: 'keywords', content: 'an toàn hàng hải, STCW, ISM, IMO, chứng chỉ hàng hải, khóa học an toàn' });

    // Inject CollectionPage JSON-LD
    this.injectCollectionPageJsonLd(description);
    
    // Initialize courses data
    this.initializeCourses();
    
    // Inject ItemList JSON-LD for courses
    this.injectItemListJsonLd();
  }

  private injectCollectionPageJsonLd(description: string): void {
    this.injectJsonLd('jsonld-safety-collection', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'An toàn Hàng hải',
      description,
      about: 'safety',
      isPartOf: { '@type': 'WebSite', name: 'LMS Maritime' }
    });
  }

  private injectItemListJsonLd(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const items = this.courses().slice(0, 6).map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Course',
        name: c.title,
        description: c.shortDescription,
        provider: { '@type': 'Organization', name: 'LMS Maritime' },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: c.rating, reviewCount: c.reviews }
      }
    }));

    this.injectJsonLd('jsonld-safety-itemlist', {
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

  courses = signal<Course[]>([]);

  courseItems = computed<CategoryCourseItem[]>(() => 
    this.courses().slice(0, 6).map(course => ({
      id: course.id,
      title: course.title,
      description: course.shortDescription,
      level: course.level,
      price: course.price,
      thumbnailUrl: course.thumbnail,
      link: ['/courses', course.id]
    }))
  );

  private initializeCourses(): void {
    this.courses.set([
    {
      id: 'stcw-basic',
      title: 'STCW Cơ bản',
      description: 'Khóa học cơ bản về an toàn hàng hải theo tiêu chuẩn STCW quốc tế. Học viên sẽ được trang bị kiến thức về an toàn cá nhân, ứng phó khẩn cấp và các quy tắc an toàn cơ bản.',
      shortDescription: 'Nền tảng an toàn hàng hải theo tiêu chuẩn STCW',
      level: 'beginner',
      duration: '40h',
      students: 1200,
      rating: 4.8,
      reviews: 156,
      price: 2500000,
      instructor: {
        name: 'Thuyền trưởng Nguyễn Văn An',
        title: 'Chuyên gia An toàn Hàng hải',
        avatar: '/assets/images/instructors/captain-nguyen.jpg',
        credentials: ['STCW Master', 'IMO Expert', '15 năm kinh nghiệm']
      },
      thumbnail: '/assets/images/courses/stcw-basic.jpg',
      category: 'safety',
      tags: ['STCW', 'An toàn', 'Cơ bản'],
      skills: ['An toàn cá nhân', 'Ứng phó khẩn cấp', 'Quy tắc quốc tế'],
      prerequisites: ['Không yêu cầu kinh nghiệm'],
      certificate: {
        type: 'STCW',
        description: 'Chứng chỉ STCW cơ bản'
      },
      curriculum: {
        modules: 8,
        lessons: 32,
        duration: '40 giờ'
      },
      isPopular: true
    },
    {
      id: 'safety-management',
      title: 'Quản lý An toàn',
      description: 'Hệ thống quản lý an toàn hàng hải theo tiêu chuẩn ISM Code. Học viên sẽ học cách xây dựng và vận hành hệ thống quản lý an toàn hiệu quả.',
      shortDescription: 'Quản lý an toàn chuyên nghiệp theo ISM Code',
      level: 'intermediate',
      duration: '24h',
      students: 800,
      rating: 4.9,
      reviews: 67,
      price: 3200000,
      instructor: {
        name: 'Thuyền trưởng Lê Minh Cường',
        title: 'Chuyên gia Quản lý An toàn',
        avatar: '/assets/images/instructors/captain-le.jpg',
        credentials: ['ISM Expert', 'Auditor', '20 năm kinh nghiệm']
      },
      thumbnail: '/assets/images/courses/safety-management.jpg',
      category: 'safety',
      tags: ['Quản lý', 'ISM', 'Trung cấp'],
      skills: ['ISM Code', 'Risk Management', 'Safety Auditing'],
      prerequisites: ['STCW cơ bản', '2 năm kinh nghiệm'],
      certificate: {
        type: 'Professional',
        description: 'Chứng chỉ Quản lý An toàn'
      },
      curriculum: {
        modules: 6,
        lessons: 24,
        duration: '24 giờ'
      },
      isPopular: true
    },
    {
      id: 'fire-fighting',
      title: 'Chữa cháy trên tàu',
      description: 'Kỹ thuật chữa cháy và phòng cháy chuyên nghiệp trên tàu biển. Học viên sẽ được thực hành với các thiết bị chữa cháy hiện đại.',
      shortDescription: 'Kỹ thuật chữa cháy chuyên nghiệp trên tàu',
      level: 'beginner',
      duration: '20h',
      students: 900,
      rating: 4.7,
      reviews: 89,
      price: 1800000,
      instructor: {
        name: 'Kỹ sư Trần Thị Bình',
        title: 'Chuyên gia Phòng cháy',
        avatar: '/assets/images/instructors/engineer-tran.jpg',
        credentials: ['Fire Safety Expert', 'IMO Certified', '12 năm kinh nghiệm']
      },
      thumbnail: '/assets/images/courses/fire-fighting.jpg',
      category: 'safety',
      tags: ['Chữa cháy', 'Phòng cháy', 'An toàn'],
      skills: ['Kỹ thuật chữa cháy', 'Sử dụng thiết bị', 'Phòng cháy'],
      prerequisites: ['STCW cơ bản'],
      certificate: {
        type: 'Professional',
        description: 'Chứng chỉ Chữa cháy chuyên nghiệp'
      },
      curriculum: {
        modules: 5,
        lessons: 20,
        duration: '20 giờ'
      }
    },
    {
      id: 'emergency-response',
      title: 'Ứng phó Khẩn cấp',
      description: 'Kỹ năng ứng phó và xử lý các tình huống khẩn cấp trên biển. Bao gồm Search & Rescue, xử lý tai nạn và quản lý khủng hoảng.',
      shortDescription: 'Xử lý tình huống khẩn cấp chuyên nghiệp',
      level: 'intermediate',
      duration: '16h',
      students: 600,
      rating: 4.6,
      reviews: 45,
      price: 2200000,
      instructor: {
        name: 'Thuyền trưởng Phạm Văn Đức',
        title: 'Chuyên gia Ứng phó Khẩn cấp',
        avatar: '/assets/images/instructors/captain-pham.jpg',
        credentials: ['Emergency Response Expert', 'SAR Specialist', '18 năm kinh nghiệm']
      },
      thumbnail: '/assets/images/courses/emergency-response.jpg',
      category: 'safety',
      tags: ['Khẩn cấp', 'SAR', 'Ứng phó'],
      skills: ['Search & Rescue', 'Emergency Procedures', 'Crisis Management'],
      prerequisites: ['STCW cơ bản'],
      certificate: {
        type: 'Professional',
        description: 'Chứng chỉ Ứng phó Khẩn cấp'
      },
      curriculum: {
        modules: 4,
        lessons: 16,
        duration: '16 giờ'
      }
    },
    {
      id: 'advanced-safety',
      title: 'An toàn Nâng cao',
      description: 'Chuyên sâu về an toàn hàng hải và quản lý rủi ro phức tạp. Dành cho các chuyên gia muốn nâng cao kỹ năng lãnh đạo an toàn.',
      shortDescription: 'Chuyên gia an toàn hàng hải cấp cao',
      level: 'advanced',
      duration: '48h',
      students: 300,
      rating: 4.9,
      reviews: 23,
      price: 4500000,
      instructor: {
        name: 'Thuyền trưởng Hoàng Văn Em',
        title: 'Chuyên gia An toàn Cấp cao',
        avatar: '/assets/images/instructors/captain-hoang.jpg',
        credentials: ['Senior Safety Expert', 'IMO Consultant', '25 năm kinh nghiệm']
      },
      thumbnail: '/assets/images/courses/advanced-safety.jpg',
      category: 'safety',
      tags: ['Nâng cao', 'Chuyên gia', 'Rủi ro'],
      skills: ['Advanced Risk Assessment', 'Safety Leadership', 'Regulatory Compliance'],
      prerequisites: ['Quản lý An toàn', '5 năm kinh nghiệm'],
      certificate: {
        type: 'Professional',
        description: 'Chứng chỉ An toàn Cấp cao'
      },
      curriculum: {
        modules: 12,
        lessons: 48,
        duration: '48 giờ'
      }
    },
    {
      id: 'marine-security',
      title: 'An ninh Hàng hải',
      description: 'Bảo vệ tàu và cảng khỏi các mối đe dọa an ninh. Bao gồm ISPS Code và các biện pháp bảo vệ hiện đại.',
      shortDescription: 'An ninh và bảo vệ hàng hải',
      level: 'intermediate',
      duration: '28h',
      students: 450,
      rating: 4.5,
      reviews: 34,
      price: 2800000,
      instructor: {
        name: 'Thuyền trưởng Võ Minh Phúc',
        title: 'Chuyên gia An ninh Hàng hải',
        avatar: '/assets/images/instructors/captain-vo.jpg',
        credentials: ['Security Expert', 'ISPS Specialist', '16 năm kinh nghiệm']
      },
      thumbnail: '/assets/images/courses/marine-security.jpg',
      category: 'safety',
      tags: ['An ninh', 'ISPS', 'Bảo vệ'],
      skills: ['ISPS Code', 'Security Assessment', 'Threat Analysis'],
      prerequisites: ['STCW cơ bản'],
      certificate: {
        type: 'Professional',
        description: 'Chứng chỉ An ninh Hàng hải'
      },
      curriculum: {
        modules: 7,
        lessons: 28,
        duration: '28 giờ'
      }
    }
  ]);
  }
}

