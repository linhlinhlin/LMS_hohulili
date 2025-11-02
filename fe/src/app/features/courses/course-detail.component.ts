import { Component, signal, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { CourseService } from '../../state/course.service';
import { Course, CourseCategory, ExtendedCourse } from '../../shared/types/course.types';

@Component({
  selector: 'app-course-detail',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Course Header -->
      <div class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          @if (courseService.isLoading()) {
            <div class="animate-pulse">
              <div class="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
              <div class="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          } @else if (course()) {
            <div class="flex flex-col lg:flex-row gap-8">
              <div class="lg:w-2/3">
                <h1 class="text-3xl font-bold text-gray-900 mb-4">{{ course()?.title }}</h1>
                <p class="text-lg text-gray-600 mb-6">{{ course()?.description }}</p>
                
                <div class="flex flex-wrap gap-4 mb-6">
                  <span class="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                    {{ getCategoryName(course()?.category!) }}
                  </span>
                  <span class="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                    {{ course()?.level }}
                  </span>
                  <span class="bg-yellow-100 text-yellow-800 text-sm font-semibold px-3 py-1 rounded-full">
                    {{ course()?.rating }} ⭐
                  </span>
                </div>

                <div class="flex items-center space-x-6 text-sm text-gray-600">
                  <span>{{ course()?.studentsCount }} học viên</span>
                  <span>{{ course()?.lessonsCount }} bài học</span>
                  <span>{{ getDurationInHours(course()?.duration!) }} giờ</span>
                </div>
              </div>

              <div class="lg:w-1/3">
                <div class="bg-white border border-gray-800 rounded-lg p-6 sticky top-8">
                  <div class="text-center mb-6">
                    <img [src]="course()?.thumbnail" 
                         [alt]="course()?.title"
                         class="w-full h-48 object-cover rounded-lg mb-4">
                    <div class="text-3xl font-bold text-gray-900 mb-2">
                      {{ getPriceDisplay(course()?.price!) }}
                    </div>
                  </div>

                  <button class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all mb-4">
                    Đăng ký khóa học
                  </button>

                  <div class="space-y-3 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Thời lượng:</span>
                      <span class="font-medium">{{ getDurationInHours(course()?.duration!) }} giờ</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Cấp độ:</span>
                      <span class="font-medium">{{ course()?.level }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Đánh giá:</span>
                      <span class="font-medium">{{ course()?.rating }}/5</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Học viên:</span>
                      <span class="font-medium">{{ course()?.studentsCount }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Course Content -->
      @if (course()) {
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main Content -->
            <div class="lg:col-span-2">
              <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Giới thiệu khóa học</h2>
                <div class="prose max-w-none">
                  <p class="text-gray-600 leading-relaxed">
                    Khóa học này được thiết kế đặc biệt cho sinh viên và chuyên gia trong lĩnh vực hàng hải. 
                    Bạn sẽ được học từ những kiến thức cơ bản đến nâng cao, với sự hướng dẫn của các chuyên gia có kinh nghiệm thực tế.
                  </p>
                </div>
              </div>

              <!-- Instructor -->
              <div class="bg-white rounded-lg shadow-sm p-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Giảng viên</h2>
                <div class="flex items-start space-x-4">
                  <img [src]="course()!.instructor.avatar" 
                       [alt]="course()!.instructor.name"
                       class="w-16 h-16 rounded-full" />
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">{{ course()!.instructor.name }}</h3>
                    <p class="text-gray-600 mb-2">{{ course()!.instructor.title }}</p>
                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{{ course()!.instructor.experience || 0 }} năm kinh nghiệm</span>
                      <span>{{ course()!.instructor.rating || 0 }}/5 đánh giá</span>
                      <span>{{ course()!.instructor.studentsCount || 0 }} học viên</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sidebar -->
            <div class="lg:col-span-1">
              <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Nội dung khóa học</h3>
                <div class="space-y-3">
                  <div class="flex items-center justify-between py-2 border-b border-gray-100">
                    <span class="text-sm text-gray-600">Tổng số bài học</span>
                    <span class="text-sm font-medium">{{ course()?.lessonsCount }}</span>
                  </div>
                  <div class="flex items-center justify-between py-2 border-b border-gray-100">
                    <span class="text-sm text-gray-600">Thời lượng video</span>
                    <span class="text-sm font-medium">{{ getDurationInHours(course()?.duration!) }}h</span>
                  </div>
                  <div class="flex items-center justify-between py-2 border-b border-gray-100">
                    <span class="text-sm text-gray-600">Tài liệu</span>
                    <span class="text-sm font-medium">Có</span>
                  </div>
                  <div class="flex items-center justify-between py-2">
                    <span class="text-sm text-gray-600">Chứng chỉ</span>
                    <span class="text-sm font-medium">Có</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseDetailComponent implements OnInit {
  protected courseService = inject(CourseService);
  private route = inject(ActivatedRoute);
  private title = inject(Title);
  private meta = inject(Meta);
  constructor(@Inject(DOCUMENT) private document: Document, @Inject(PLATFORM_ID) private platformId: Object) {}

  course = signal<ExtendedCourse | null>(null);
  
  // Make Math available in template
  Math = Math;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadCourse(params['id']);
      }
    });
  }

  private async loadCourse(id: string): Promise<void> {
    try {
      const course = await this.courseService.getCourseById(id);
      this.course.set(course);
      if (course) {
        this.updateSeo(course);
      }
    } catch (error) {
      console.error('Error loading course:', error);
    }
  }

  getCategoryName(category: string): string {
    const categoryNames: Record<string, string> = {
      'safety': 'An toàn Hàng hải',
      'navigation': 'Điều khiển Tàu',
      'engineering': 'Kỹ thuật Máy tàu',
      'logistics': 'Logistics Hàng hải',
      'law': 'Luật Hàng hải',
      'certificates': 'Chứng chỉ Chuyên môn'
    };
    return categoryNames[category] || category;
  }

  getDurationInHours(duration: string): number {
    // Convert string duration like "40h" to number
    const match = duration.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  getPriceDisplay(price: number): string {
    return price === 0 ? 'Miễn phí' : price.toLocaleString() + ' VNĐ';
  }

  private updateSeo(course: ExtendedCourse): void {
    const pageTitle = `${course.title} - LMS Maritime`;
    this.title.setTitle(pageTitle);
    const description = course.description?.slice(0, 160) || course.shortDescription || course.title;
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    // JSON-LD (Course schema)
    if (!isPlatformBrowser(this.platformId)) return;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.title,
      description: description,
      provider: {
        '@type': 'Organization',
        name: 'LMS Maritime',
        sameAs: 'https://example.com'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: course.rating,
        reviewCount: course.reviews
      },
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: course.level,
        offers: {
          '@type': 'Offer',
          price: course.price,
          priceCurrency: 'VND',
          availability: 'https://schema.org/InStock'
        }
      }
    } as const;

    const scriptId = 'jsonld-course';
    let scriptEl = this.document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = this.document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.id = scriptId;
      this.document.head.appendChild(scriptEl);
    }
    scriptEl.text = JSON.stringify(jsonLd);

    // BreadcrumbList
    const breadcrumbId = 'jsonld-breadcrumbs';
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Khóa học', item: `${this.document.location.origin}/courses` },
        { '@type': 'ListItem', position: 2, name: this.getCategoryName(course.category), item: `${this.document.location.origin}/courses/${course.category}` },
        { '@type': 'ListItem', position: 3, name: course.title, item: `${this.document.location.origin}/courses/${course.id}` }
      ]
    };
    let breadcrumbEl = this.document.getElementById(breadcrumbId) as HTMLScriptElement | null;
    if (!breadcrumbEl) {
      breadcrumbEl = this.document.createElement('script');
      breadcrumbEl.type = 'application/ld+json';
      breadcrumbEl.id = breadcrumbId;
      this.document.head.appendChild(breadcrumbEl);
    }
    breadcrumbEl.text = JSON.stringify(breadcrumb);
  }
}
