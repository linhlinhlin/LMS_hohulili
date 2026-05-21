import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CourseCardComponent } from './shared/course-card.component';
import { PaginationComponent, PaginationInfo } from '../../shared/components/pagination/pagination.component';
import { Course, CourseCategory, FilterOptions, ExtendedCourse, LEVEL_LABELS } from '../../shared/types/course.types';
import { Course as DomainCourse, CourseFilters, CourseSortOptions, PaginationOptions, PaginatedResult } from './domain'; // Import domain types
import { CourseLevel } from './domain/types'; // Import enum as value
import { StudentEnrollmentService } from '../student/services/enrollment.service';
import { AuthService } from '../../core/services/auth.service';
import { GetCoursesUseCase } from './application/use-cases/get-courses.use-case';
import { ToastService } from '../../core/services/toast.service';
import { SeoService } from '../../core/services/seo.service';

interface CourseLandingContent {
  category?: CourseCategory;
  path: string;
  eyebrow: string;
  heading: string;
  description: string;
  title: string;
  metaDescription: string;
  breadcrumbName: string;
  keywords: string[];
}

const COURSE_LANDING_CONTENT: Record<string, CourseLandingContent> = {
  all: {
    path: '/courses',
    eyebrow: 'Danh mục khóa học',
    heading: 'Khóa học hàng hải',
    description: 'Khám phá khóa học STCW, an toàn, điều khiển tàu, máy tàu, logistics và luật hàng hải.',
    title: 'Khóa học hàng hải trực tuyến',
    metaDescription: 'Tìm khóa học hàng hải trực tuyến: STCW, an toàn hàng hải, điều khiển tàu, kỹ thuật máy tàu, logistics và luật hàng hải.',
    breadcrumbName: 'Khóa học',
    keywords: ['lms hàng hải', 'khóa học hàng hải', 'đào tạo hàng hải trực tuyến', 'STCW']
  },
  safety: {
    category: CourseCategory.SAFETY,
    path: '/courses/an-toan-hang-hai',
    eyebrow: 'An toàn hàng hải',
    heading: 'Khóa học an toàn hàng hải',
    description: 'Học an toàn lao động trên tàu, cứu sinh, phòng cháy chữa cháy và quy trình ứng phó sự cố theo bối cảnh hàng hải.',
    title: 'Khóa học an toàn hàng hải',
    metaDescription: 'Khóa học an toàn hàng hải cho thuyền viên và học viên: cứu sinh, phòng cháy chữa cháy, ứng phó sự cố và nền tảng STCW.',
    breadcrumbName: 'An toàn hàng hải',
    keywords: ['khóa học an toàn hàng hải', 'an toàn hàng hải', 'STCW basic safety', 'phòng cháy chữa cháy trên tàu']
  },
  navigation: {
    category: CourseCategory.NAVIGATION,
    path: '/courses/dieu-khien-tau',
    eyebrow: 'Điều khiển tàu',
    heading: 'Khóa học điều khiển tàu',
    description: 'Nâng năng lực trực ca, radar, ECDIS, hành hải ven bờ và xử lý tình huống điều động tàu.',
    title: 'Khóa học điều khiển tàu',
    metaDescription: 'Khóa học điều khiển tàu và hàng hải thực hành: radar, ECDIS, trực ca, hành hải ven bờ và kỹ năng điều động tàu.',
    breadcrumbName: 'Điều khiển tàu',
    keywords: ['khóa học điều khiển tàu', 'ECDIS', 'radar hàng hải', 'hành hải ven bờ']
  },
  engineering: {
    category: CourseCategory.ENGINEERING,
    path: '/courses/ky-thuat-may-tau',
    eyebrow: 'Kỹ thuật máy tàu',
    heading: 'Khóa học kỹ thuật máy tàu',
    description: 'Học vận hành, bảo trì máy chính, máy phụ, hệ thống điện và an toàn buồng máy trên tàu biển.',
    title: 'Khóa học kỹ thuật máy tàu',
    metaDescription: 'Khóa học kỹ thuật máy tàu cho thợ máy và kỹ sư hàng hải: động cơ diesel, hệ thống điện, vận hành và bảo trì buồng máy.',
    breadcrumbName: 'Kỹ thuật máy tàu',
    keywords: ['khóa học kỹ thuật máy tàu', 'máy tàu biển', 'động cơ diesel tàu thủy', 'buồng máy tàu biển']
  },
  logistics: {
    category: CourseCategory.LOGISTICS,
    path: '/courses/logistics-hang-hai',
    eyebrow: 'Logistics hàng hải',
    heading: 'Khóa học logistics hàng hải',
    description: 'Nắm vững vận tải biển, khai thác cảng, container, chứng từ và chuỗi cung ứng trong ngành hàng hải.',
    title: 'Khóa học logistics hàng hải',
    metaDescription: 'Khóa học logistics hàng hải về vận tải biển, khai thác cảng, container, chứng từ và quản trị chuỗi cung ứng.',
    breadcrumbName: 'Logistics hàng hải',
    keywords: ['khóa học logistics hàng hải', 'vận tải biển', 'khai thác cảng', 'chuỗi cung ứng hàng hải']
  },
  law: {
    category: CourseCategory.LAW,
    path: '/courses/luat-hang-hai',
    eyebrow: 'Luật hàng hải',
    heading: 'Khóa học luật hàng hải',
    description: 'Tìm hiểu luật biển, hợp đồng vận chuyển, bảo hiểm hàng hải, trách nhiệm pháp lý và tuân thủ quốc tế.',
    title: 'Khóa học luật hàng hải',
    metaDescription: 'Khóa học luật hàng hải về luật biển, hợp đồng vận chuyển, bảo hiểm hàng hải, trách nhiệm pháp lý và tuân thủ quốc tế.',
    breadcrumbName: 'Luật hàng hải',
    keywords: ['khóa học luật hàng hải', 'luật biển', 'bảo hiểm hàng hải', 'hợp đồng vận chuyển biển']
  },
  certificates: {
    category: CourseCategory.CERTIFICATES,
    path: '/courses/stcw',
    eyebrow: 'Chứng chỉ STCW',
    heading: 'Khóa học chứng chỉ STCW',
    description: 'Tổng hợp khóa học chứng chỉ STCW, GMDSS, Radar, ECDIS và các năng lực nghề nghiệp cho thuyền viên.',
    title: 'Khóa học chứng chỉ STCW',
    metaDescription: 'Khóa học chứng chỉ STCW, GMDSS, Radar, ECDIS và các chứng chỉ nghề nghiệp hàng hải dành cho thuyền viên.',
    breadcrumbName: 'Chứng chỉ STCW',
    keywords: ['khóa học STCW', 'chứng chỉ STCW', 'GMDSS', 'ECDIS certificate']
  }
};

const COURSE_CATEGORY_LINKS: Array<{ category: CourseCategory; label: string; path: string }> = [
  { category: CourseCategory.SAFETY, label: 'An toàn hàng hải', path: '/courses/an-toan-hang-hai' },
  { category: CourseCategory.NAVIGATION, label: 'Điều khiển tàu', path: '/courses/dieu-khien-tau' },
  { category: CourseCategory.ENGINEERING, label: 'Kỹ thuật máy tàu', path: '/courses/ky-thuat-may-tau' },
  { category: CourseCategory.LOGISTICS, label: 'Logistics hàng hải', path: '/courses/logistics-hang-hai' },
  { category: CourseCategory.LAW, label: 'Luật hàng hải', path: '/courses/luat-hang-hai' },
  { category: CourseCategory.CERTIFICATES, label: 'Chứng chỉ STCW', path: '/courses/stcw' }
];

const CATEGORY_PATH_BY_VALUE: Record<CourseCategory, string> = {
  [CourseCategory.SAFETY]: '/courses/an-toan-hang-hai',
  [CourseCategory.NAVIGATION]: '/courses/dieu-khien-tau',
  [CourseCategory.ENGINEERING]: '/courses/ky-thuat-may-tau',
  [CourseCategory.LOGISTICS]: '/courses/logistics-hang-hai',
  [CourseCategory.LAW]: '/courses/luat-hang-hai',
  [CourseCategory.CERTIFICATES]: '/courses/stcw'
};

@Component({
  selector: 'app-courses',
  imports: [RouterModule, FormsModule, CourseCardComponent, PaginationComponent],
  template: `
    <div class="min-h-screen bg-slate-50">
      <!-- Page Header — maritime mini-hero -->
      <div class="relative overflow-hidden bg-[#0a1628]">
        <div class="absolute inset-0 bg-gradient-to-r from-[#0a1628] to-[#0d2847]"></div>
        <div class="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p class="mb-1 text-xs font-medium uppercase tracking-widest text-blue-300/60">{{ currentLanding().eyebrow }}</p>
          <h1 class="text-2xl font-bold text-white sm:text-3xl">{{ currentLanding().heading }}</h1>
          <p class="mt-2 max-w-xl text-sm text-blue-100/50">{{ currentLanding().description }}</p>
          <nav class="mt-5 flex max-w-3xl flex-wrap gap-2" aria-label="Chủ đề khóa học hàng hải">
            @for (link of categoryLinks; track link.path) {
              <a
                [routerLink]="link.path"
                [attr.aria-current]="link.path === currentLanding().path ? 'page' : null"
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-blue-50 transition-colors hover:border-white/35 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40">
                {{ link.label }}
              </a>
            }
          </nav>
        </div>
      </div>

      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-8 lg:flex-row">
          <!-- Filters Sidebar -->
          <div class="lg:w-1/4" role="region" aria-label="Bộ lọc khóa học">
            <button
              type="button"
              (click)="toggleMobileFilters()"
              class="mb-3 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm lg:hidden"
              aria-controls="courses-filter-panel"
              [attr.aria-expanded]="showMobileFilters()">
              <span>
                <span class="block text-sm font-semibold text-gray-900">Lọc và sắp xếp</span>
                <span class="block text-xs text-gray-500">
                  {{ paginationInfo().totalItems }} khóa học
                  @if (activeFilterCount() > 0) {
                    · {{ activeFilterCount() }} bộ lọc đang dùng
                  }
                </span>
              </span>
              <svg
                class="h-5 w-5 text-gray-400 transition-transform"
                [class.rotate-180]="showMobileFilters()"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            <div
              id="courses-filter-panel"
              class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:block"
              [class.hidden]="!showMobileFilters()">
              <h3 class="mb-5 text-sm font-bold uppercase tracking-wide text-gray-900">Bộ lọc</h3>

              <!-- Search -->
              <div class="mb-5">
                <label class="mb-1.5 block text-xs font-medium text-gray-600">Tìm kiếm</label>
                <div class="relative">
                  <input type="text"
                         [ngModel]="filters.search"
                         (ngModelChange)="onSearchChange($event)"
                         placeholder="VD: An toàn, ECDIS, Diesel..."
                         class="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-3.5 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0056D2] focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 transition-colors">
                  @if (filters.search) {
                    <button (click)="filters.search = ''; applyFilters()"
                            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  }
                </div>
                <p class="mt-1 text-[10px] text-gray-400">Hỗ trợ tìm kiếm không dấu</p>
              </div>

              <!-- Category -->
              <div class="mb-5">
                <label class="mb-1.5 block text-xs font-medium text-gray-600">Danh mục</label>
                <select [ngModel]="filters.category"
                        (ngModelChange)="onCategoryChange($event)"
                        class="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#0056D2] focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 transition-colors"
                        [class]="filters.category ? 'text-gray-900' : 'text-gray-400'">
                  <option [ngValue]="undefined" class="text-gray-400">Tất cả danh mục</option>
                  <option [ngValue]="CourseCategory.NAVIGATION" class="text-gray-900">Hàng hải</option>
                  <option [ngValue]="CourseCategory.ENGINEERING" class="text-gray-900">Kỹ thuật tàu biển</option>
                  <option [ngValue]="CourseCategory.SAFETY" class="text-gray-900">An toàn hàng hải</option>
                  <option [ngValue]="CourseCategory.LOGISTICS" class="text-gray-900">Logistics & Cảng</option>
                  <option [ngValue]="CourseCategory.LAW" class="text-gray-900">Luật hàng hải</option>
                  <option [ngValue]="CourseCategory.CERTIFICATES" class="text-gray-900">Chứng chỉ STCW</option>
                </select>
              </div>

              <!-- Level -->
              <div class="mb-5">
                <label class="mb-1.5 block text-xs font-medium text-gray-600">Cấp độ</label>
                <select [(ngModel)]="filters.level"
                        (ngModelChange)="applyFilters()"
                        class="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#0056D2] focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 transition-colors"
                        [class]="filters.level ? 'text-gray-900' : 'text-gray-400'">
                  <option [ngValue]="undefined" class="text-gray-400">Tất cả cấp độ</option>
                  <option [ngValue]="'beginner'" class="text-gray-900">Cơ bản</option>
                  <option [ngValue]="'intermediate'" class="text-gray-900">Trung cấp</option>
                  <option [ngValue]="'advanced'" class="text-gray-900">Nâng cao</option>
                </select>
              </div>

              <!-- Price Range -->
              <div class="mb-5">
                <label class="mb-1.5 block text-xs font-medium text-gray-600">Khoảng giá (VND)</label>
                <div class="flex gap-2">
                  <input type="number"
                         [ngModel]="priceMin"
                         (ngModelChange)="onPriceMinChange($event)"
                         placeholder="Từ"
                         class="w-1/2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0056D2] focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 transition-colors">
                  <input type="number"
                         [ngModel]="priceMax"
                         (ngModelChange)="onPriceMaxChange($event)"
                         placeholder="Đến"
                         class="w-1/2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0056D2] focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 transition-colors">
                </div>
              </div>

              <!-- Rating -->
              <div class="mb-5">
                <label class="mb-1.5 block text-xs font-medium text-gray-600">Đánh giá tối thiểu</label>
                <select [ngModel]="filters.rating"
                        (ngModelChange)="onRatingChange($event)"
                        class="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#0056D2] focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 transition-colors"
                        [class]="filters.rating ? 'text-gray-900' : 'text-gray-400'">
                  <option [ngValue]="undefined" class="text-gray-400">Tất cả</option>
                  <option [ngValue]="3.5" class="text-gray-900">Từ 3.5 sao</option>
                  <option [ngValue]="4" class="text-gray-900">Từ 4.0 sao</option>
                  <option [ngValue]="4.5" class="text-gray-900">Từ 4.5 sao</option>
                </select>
              </div>

              <!-- Sort -->
              <div class="mb-5">
                <label class="mb-1.5 block text-xs font-medium text-gray-600">Sắp xếp</label>
                <select [(ngModel)]="filters.sortBy"
                        (ngModelChange)="applyFilters()"
                        class="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#0056D2] focus:outline-none focus:ring-2 focus:ring-[#0056D2]/20 transition-colors">
                  <option [ngValue]="'rating'">Đánh giá cao</option>
                  <option [ngValue]="'title'">Tên A-Z</option>
                  <option [ngValue]="'price'">Giá thấp đến cao</option>
                </select>
              </div>

              <button (click)="clearFilters()"
                      class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700">
                Xóa bộ lọc
              </button>

              <button
                type="button"
                (click)="showMobileFilters.set(false)"
                class="mt-3 w-full rounded-lg bg-[#0056D2] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#004BB5] lg:hidden">
                Xem {{ paginationInfo().totalItems }} khóa học
              </button>
            </div>
          </div>

          <!-- Courses Grid -->
          <div class="lg:w-3/4" role="region" aria-label="Kết quả khóa học">
            <div class="mb-6 flex items-center justify-between">
              <p class="text-sm text-gray-500">
                {{ paginationInfo().totalItems }} khóa học
                @if (paginationInfo().totalPages > 1) {
                  · trang {{ paginationInfo().currentPage }}/{{ paginationInfo().totalPages }}
                }
              </p>
            </div>

            @if (isLoading()) {
              <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                @for (item of [1,2,3,4,5,6]; track item) {
                  <div class="animate-pulse overflow-hidden rounded-xl border border-gray-100 bg-white">
                    <div class="h-44 bg-gray-100"></div>
                    <div class="space-y-3 p-4">
                      <div class="h-4 w-3/4 rounded bg-gray-100"></div>
                      <div class="h-3 w-1/2 rounded bg-gray-100"></div>
                      <div class="h-3 w-1/3 rounded bg-gray-100"></div>
                    </div>
                  </div>
                }
              </div>
            } @else if (courses().length === 0) {
              <div class="py-16 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
                <h3 class="mt-3 text-sm font-semibold text-gray-900">Không tìm thấy khóa học</h3>
                <p class="mt-1 text-sm text-gray-500">Thử thay đổi bộ lọc để tìm khóa học phù hợp</p>
              </div>
            } @else {
              <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                @for (course of courses(); track course.id) {
                  <app-course-card [course]="course"></app-course-card>
                }
              </div>

              @if (paginationInfo().totalPages > 1) {
                <app-pagination
                  [currentPage]="paginationInfo().currentPage"
                  [totalPages]="paginationInfo().totalPages"
                  [totalItems]="paginationInfo().totalItems"
                  [itemsPerPage]="paginationInfo().itemsPerPage"
                  (pageChange)="onPageChange($event)">
                </app-pagination>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoursesComponent implements OnInit {
  private seo = inject(SeoService);
  private document = inject<Document>(DOCUMENT);

  protected getCoursesUseCase = inject(GetCoursesUseCase);
  protected authService = inject(AuthService);
  protected enrollmentService = inject(StudentEnrollmentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  courses = signal<ExtendedCourse[]>([]);
  isLoading = signal<boolean>(false);
  showMobileFilters = signal(false);
  paginationInfo = signal<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
    hasNext: false,
    hasPrevious: false
  });
  currentLanding = signal<CourseLandingContent>(COURSE_LANDING_CONTENT['all']);

  // Make CourseCategory and LEVEL_LABELS available in template
  CourseCategory = CourseCategory;
  LEVEL_LABELS = LEVEL_LABELS;
  readonly categoryLinks = COURSE_CATEGORY_LINKS;
  filters: FilterOptions = {
    search: '',
    category: undefined,
    level: undefined,
    sortBy: 'rating' as keyof Course,
    sortOrder: 'desc'
  };

  // Local UI state for range inputs
  priceMin: number | null = null;
  priceMax: number | null = null;
  private searchDebounce: any;



  ngOnInit(): void {
    // Preload enrolled courses for logged-in students to enable isEnrolled check
    if (this.authService.isAuthenticated() && this.authService.userRole() === 'student') {
      this.enrollmentService.loadEnrolledCourses(0, 100); // Load enough courses for cache
    }

    combineLatest([this.route.data, this.route.queryParamMap]).subscribe(([data, params]) => {
      const landing = this.resolveLanding(data['categoryLanding'] as string | undefined);
      this.currentLanding.set(landing);
      this.applyLandingSeo(landing);

      const q = params.get('q') || '';
      const queryCategory = params.get('category') as CourseCategory | null;
      const level = params.get('level') as CourseLevel | null;
      const sort = params.get('sort') as keyof Course | null;
      const order = (params.get('order') as 'asc' | 'desc' | null) || 'desc';
      const priceMin = params.get('priceMin');
      const priceMax = params.get('priceMax');
      const rating = params.get('rating');
      const page = Number(params.get('page')) || 1;

      this.filters = {
        search: q,
        category: landing.category ?? (queryCategory ? (queryCategory as CourseCategory) : undefined),
        level: level ? (level as CourseLevel) : undefined,
        sortBy: (sort as keyof Course) || ('rating' as keyof Course),
        sortOrder: order,
        priceRange: priceMin && priceMax ? { min: Number(priceMin), max: Number(priceMax) } : undefined,
        rating: rating ? Number(rating) : undefined
      };

      this.priceMin = priceMin ? Number(priceMin) : null;
      this.priceMax = priceMax ? Number(priceMax) : null;

      this.loadCourses(page);
    });
  }

  private resolveLanding(key?: string): CourseLandingContent {
    if (!key) return COURSE_LANDING_CONTENT['all'];
    return COURSE_LANDING_CONTENT[key] ?? COURSE_LANDING_CONTENT['all'];
  }

  private applyLandingSeo(landing: CourseLandingContent): void {
    const canonicalUrl = `https://holilihu.online${landing.path}`;

    this.seo.setPageMeta(
      landing.title,
      landing.metaDescription,
      undefined,
      canonicalUrl
    );
    this.seo.setCanonical(canonicalUrl);
    this.seo.setKeywords(landing.keywords);
    this.seo.setBreadcrumb([
      { name: 'Trang chủ', url: 'https://holilihu.online/' },
      landing.path === '/courses'
        ? { name: landing.breadcrumbName }
        : { name: 'Khóa học', url: 'https://holilihu.online/courses' },
      ...(landing.path === '/courses' ? [] : [{ name: landing.breadcrumbName }])
    ]);
    this.seo.setWebPageJsonLd({
      id: 'jsonld-courses-page',
      name: landing.heading,
      description: landing.metaDescription,
      url: canonicalUrl,
      about: landing.breadcrumbName
    });
    this.setCategoryNavigationJsonLd();
  }

  private setCategoryNavigationJsonLd(): void {
    this.seo.setJsonLd('jsonld-course-category-list', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Danh mục khóa học hàng hải',
      itemListElement: COURSE_CATEGORY_LINKS.map((link, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'CollectionPage',
          name: link.label,
          url: `https://holilihu.online${link.path}`
        }
      }))
    });
  }

  private loadCourses(page: number = 1): void {
    this.isLoading.set(true);

    // Convert FilterOptions to CourseFilters
    const courseFilters: CourseFilters = {
      searchQuery: this.filters.search,
      category: this.filters.category ? [this.filters.category] : undefined,
      level: this.filters.level ? [this.mapToDomainLevel(this.filters.level)] : undefined,
      priceRange: this.filters.priceRange,
      rating: this.filters.rating
    };

    const sortOptions: CourseSortOptions = {
      field: this.filters.sortBy as any || 'rating',
      direction: this.filters.sortOrder || 'desc'
    };

    const paginationOptions: PaginationOptions = {
      page,
      limit: 12
    };

    this.getCoursesUseCase.execute(courseFilters, sortOptions, paginationOptions)
      .pipe(
        finalize(() => {
          // Ensure loading state is always reset, even if component is destroyed
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (response: PaginatedResult<DomainCourse>) => {
          // Log API sample for debugging

          // Convert domain courses to UI courses using dedicated mapper
          const uiCourses = response.items.map(domainCourse =>
            this.mapDomainToExtendedCourse(domainCourse)
          );


          // Log UI sample for debugging

          // Set courses data to signal with new reference for OnPush
          this.courses.set([...uiCourses]);
          this.injectItemListJsonLd();

          // Update pagination info
          this.paginationInfo.set({
            currentPage: response.page,
            totalPages: response.totalPages,
            totalItems: response.total,
            itemsPerPage: response.limit,
            hasNext: response.hasNext,
            hasPrevious: response.hasPrev
          });
        },
        error: () => {
          this.toast.error('Không thể tải danh sách khóa học. Vui lòng thử lại.');
        }
      });
  }

  private injectItemListJsonLd(): void {
    const courseList = this.courses();
    if (courseList.length === 0) return;
    const items = courseList.slice(0, 12).map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Course',
        name: c.title,
        description: (c.shortDescription || c.description || '').slice(0, 200),
        url: `https://holilihu.online/courses/${c.id}`,
        provider: { '@type': 'Organization', name: 'LMS Maritime' }
      }
    }));
    this.seo.setJsonLd('jsonld-courses-itemlist', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items
    });
  }

  private buildFilterQueryParams(includeCategory: boolean): Record<string, any> {
    return {
      q: this.filters.search || undefined,
      category: includeCategory ? this.filters.category || undefined : undefined,
      level: this.filters.level || undefined,
      sort: this.filters.sortBy || undefined,
      order: this.filters.sortOrder || undefined,
      priceMin: this.filters.priceRange?.min ?? undefined,
      priceMax: this.filters.priceRange?.max ?? undefined,
      rating: this.filters.rating ?? undefined,
      page: 1 // Reset to first page when filters change
    };
  }

  applyFilters(): void {
    const queryParams = this.buildFilterQueryParams(!this.currentLanding().category);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  onCategoryChange(category: CourseCategory | undefined): void {
    this.filters.category = category;
    const targetPath = category ? CATEGORY_PATH_BY_VALUE[category] : '/courses';

    this.router.navigate([targetPath], {
      queryParams: this.buildFilterQueryParams(false)
    });
  }

  onPageChange(page: number): void {
    const queryParams: Record<string, any> = {
      page: page
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  clearFilters(): void {
    const landingCategory = this.currentLanding().category;
    this.filters = {
      search: '',
      category: landingCategory,
      level: undefined,
      sortBy: 'rating' as keyof Course,
      sortOrder: 'desc'
    };
    this.priceMin = null;
    this.priceMax = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: undefined,
        category: undefined,
        level: undefined,
        sort: 'rating',
        order: 'desc',
        page: 1,
        priceMin: undefined,
        priceMax: undefined,
        rating: undefined
      },
      queryParamsHandling: 'merge'
    });
    this.showMobileFilters.set(false);
  }

  activeFilterCount(): number {
    let count = 0;
    if (this.filters.search?.trim()) count++;
    if (this.filters.category && !this.currentLanding().category) count++;
    if (this.filters.level) count++;
    if (this.filters.priceRange) count++;
    if (this.filters.rating) count++;
    return count;
  }

  toggleMobileFilters(): void {
    this.showMobileFilters.update(open => !open);
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }

  onPriceMinChange(value: string | number | null): void {
    this.priceMin = value !== null ? Number(value) : null;
    this.updatePriceRangeAndApply();
  }

  onPriceMaxChange(value: string | number | null): void {
    this.priceMax = value !== null ? Number(value) : null;
    this.updatePriceRangeAndApply();
  }

  onRatingChange(value: number | undefined): void {
    this.filters.rating = value;
    this.applyFilters();
  }

  private updatePriceRangeAndApply(): void {
    if (this.priceMin !== null && this.priceMax !== null && this.priceMax >= this.priceMin) {
      this.filters.priceRange = { min: this.priceMin, max: this.priceMax };
    } else {
      this.filters.priceRange = undefined;
    }
    this.applyFilters();
  }

  getCategoryName(category: string): string {
    const categoryNames: Record<string, string> = {
      'engineering': 'Kỹ thuật tàu biển',
      'logistics': 'Quản lý cảng',
      'safety': 'An toàn hàng hải',
      'navigation': 'Hàng hải',
      'law': 'Luật hàng hải'
    };
    return categoryNames[category] || category;
  }

  private mapToDomainLevel(sharedLevel: string): CourseLevel {
    switch (sharedLevel) {
      case 'beginner': return CourseLevel.BEGINNER;
      case 'intermediate': return CourseLevel.INTERMEDIATE;
      case 'advanced': return CourseLevel.ADVANCED;
      default: return CourseLevel.BEGINNER;
    }
  }

  private getTeacherName(teacherId: string): string {
    // For now, return a generic name based on teacher ID
    // In production, this would fetch from a teacher/user service
    const teacherNames: Record<string, string> = {
      'teacher1': 'ThS. Nguyễn Văn An',
      'teacher2': 'PGS. Trần Thị Bình',
      'teacher3': 'TS. Lê Văn Cường',
      'teacher4': 'ThS. Phạm Thị Dung',
      'teacher5': 'TS. Hoàng Văn Em'
    };

    return teacherNames[teacherId] || 'Giảng viên';
  }

  /**
   * Map Domain Course to ExtendedCourse for UI
   * IMPORTANT: This method MUST NOT call any class methods like .getRating(), .isPublished(), etc.
   * It should only access raw JSON properties directly.
   * This version is defensive and handles null/undefined values safely.
   */
  private mapDomainToExtendedCourse(domainCourse: DomainCourse): ExtendedCourse {
    const raw = domainCourse as any;
    const meta = raw?.metadata ?? {};
    const specs = raw?.specifications ?? {};
    const price = specs?.price ?? 0;
    const studentsCount = meta?.studentsCount ?? 0;
    // instructorId field stores teacherName (from mapSummaryToDomain)
    const teacherName = raw?.instructorId ?? 'Giảng viên';
    const lessonsCount = specs?.lessonsCount ?? 0;

    return {
      id: raw?.id ?? '',
      title: raw?.title ?? '',
      description: raw?.description ?? '',
      shortDescription: raw?.shortDescription ?? raw?.description?.slice(0, 120) ?? '',
      level: specs?.level ?? 'beginner',
      duration: `${specs?.durationHours ?? 10} giờ`,
      students: studentsCount,
      rating: Math.round((meta?.rating ?? 5) * 10) / 10,
      reviews: meta?.reviewsCount ?? 0,
      price: price,
      originalPrice: undefined,
      instructor: {
        id: '',
        name: teacherName,
        title: 'Giảng viên',
        avatar: '',
        credentials: [],
        experience: 0,
        rating: 5,
        studentsCount: studentsCount
      },
      // Use real thumbnail; empty string triggers gradient fallback in card
      thumbnail: raw?.thumbnail || '',
      // category field stores categoryName (from mapSummaryToDomain)
      category: raw?.category ?? 'engineering',
      tags: raw?.tags ?? [],
      skills: raw?.skills ?? [],
      prerequisites: [],
      certificate: { type: 'Completion', description: '' },
      curriculum: { modules: specs?.modulesCount ?? 0, lessons: lessonsCount, duration: '' },
      isPopular: studentsCount > 50,
      isNew: true,
      isFree: price === 0,
      studentsCount: studentsCount,
      lessonsCount: lessonsCount,
      isPublished: true,
      isEnrolled: meta?.isEnrolled ?? this.enrollmentService.isEnrolledInCourse(raw?.id) ?? false
    };
  }


}
