import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-courses',
  imports: [RouterModule, FormsModule, CourseCardComponent, PaginationComponent],
  template: `
    <div class="min-h-screen bg-slate-50">
      <!-- Page Header — maritime mini-hero -->
      <div class="relative overflow-hidden bg-[#0a1628]">
        <div class="absolute inset-0 bg-gradient-to-r from-[#0a1628] to-[#0d2847]"></div>
        <div class="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p class="mb-1 text-xs font-medium uppercase tracking-widest text-blue-300/60">Danh mục khóa học</p>
          <h1 class="text-2xl font-bold text-white sm:text-3xl">Khóa học Hàng hải</h1>
          <p class="mt-2 max-w-xl text-sm text-blue-100/50">Khám phá các khóa học chuyên nghiệp dành cho ngành hàng hải</p>
        </div>
      </div>

      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-8 lg:flex-row">
          <!-- Filters Sidebar -->
          <div class="lg:w-1/4" role="region" aria-label="Bộ lọc khóa học">
            <div class="sticky top-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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
                <select [(ngModel)]="filters.category"
                        (ngModelChange)="applyFilters()"
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
  paginationInfo = signal<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
    hasNext: false,
    hasPrevious: false
  });

  // Make CourseCategory and LEVEL_LABELS available in template
  CourseCategory = CourseCategory;
  LEVEL_LABELS = LEVEL_LABELS;
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
    // Static SEO for listing page
    this.seo.setPageMeta(
      'Khóa học',
      'Danh sách khóa học hàng hải chuyên nghiệp — an toàn hàng hải, điều khiển tàu, kỹ thuật máy tàu, logistics, luật hàng hải.',
      undefined,
      'https://holilihu.online/courses'
    );
    this.seo.setCanonical('https://holilihu.online/courses');

    // Preload enrolled courses for logged-in students to enable isEnrolled check
    if (this.authService.isAuthenticated() && this.authService.userRole() === 'student') {
      this.enrollmentService.loadEnrolledCourses(0, 100); // Load enough courses for cache
    }


    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q') || '';
      const category = params.get('category') as CourseCategory | null;
      const level = params.get('level') as CourseLevel | null;
      const sort = params.get('sort') as keyof Course | null;
      const order = (params.get('order') as 'asc' | 'desc' | null) || 'desc';
      const priceMin = params.get('priceMin');
      const priceMax = params.get('priceMax');
      const rating = params.get('rating');
      const page = Number(params.get('page')) || 1;

      this.filters = {
        search: q,
        category: category ? (category as CourseCategory) : undefined,
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

  applyFilters(): void {
    const queryParams: Record<string, any> = {
      q: this.filters.search || undefined,
      category: this.filters.category || undefined,
      level: this.filters.level || undefined,
      sort: this.filters.sortBy || undefined,
      order: this.filters.sortOrder || undefined,
      priceMin: this.filters.priceRange?.min ?? undefined,
      priceMax: this.filters.priceRange?.max ?? undefined,
      rating: this.filters.rating ?? undefined,
      page: 1 // Reset to first page when filters change
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
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
    this.filters = {
      search: '',
      category: undefined,
      level: undefined,
      sortBy: 'rating' as keyof Course,
      sortOrder: 'desc'
    };
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
