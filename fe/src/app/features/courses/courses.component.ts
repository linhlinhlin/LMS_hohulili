import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation, Inject } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CourseCardComponent } from './shared/course-card.component';
import { PaginationComponent, PaginationInfo } from '../../shared/components/pagination/pagination.component';
import { Course, CourseCategory, FilterOptions, ExtendedCourse, LEVEL_LABELS } from '../../shared/types/course.types';
import { Course as DomainCourse, CourseFilters, CourseSortOptions, PaginationOptions, PaginatedResult } from './domain'; // Import domain types
import { CourseLevel } from './domain/types'; // Import enum as value
import { Meta, Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { StudentEnrollmentService } from '../student/services/enrollment.service';
import { AuthService } from '../../core/services/auth.service';
import { GetCoursesUseCase } from './application/use-cases/get-courses.use-case';

@Component({
  selector: 'app-courses',
  imports: [CommonModule, RouterModule, FormsModule, CourseCardComponent, PaginationComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 class="text-3xl font-bold text-gray-900">Khóa học Hàng hải</h1>
          <p class="text-lg text-gray-600 mt-2">Khám phá các khóa học chuyên nghiệp dành cho ngành hàng hải</p>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col lg:flex-row gap-8">
          <!-- Filters Sidebar -->
          <div class="lg:w-1/4" role="region" aria-label="Bộ lọc khóa học">
            <div class="bg-white rounded-lg shadow-sm p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Bộ lọc</h3>
              
              <!-- Search -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
                <input type="text" 
                       [ngModel]="filters.search"
                       (ngModelChange)="onSearchChange($event)"
                       placeholder="Nhập từ khóa..."
                       aria-label="Tìm kiếm khóa học theo từ khóa"
                       class="w-full px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>

              <!-- Category -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                <select [(ngModel)]="filters.category"
                        (ngModelChange)="applyFilters()"
                        aria-label="Lọc theo danh mục"
                        class="w-full px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option [ngValue]="undefined">Tất cả danh mục</option>
                  <option [ngValue]="CourseCategory.MARINE_ENGINEERING">Kỹ thuật tàu biển</option>
                  <option [ngValue]="CourseCategory.PORT_MANAGEMENT">Quản lý cảng</option>
                  <option [ngValue]="CourseCategory.MARITIME_SAFETY">An toàn hàng hải</option>
                  <option [ngValue]="CourseCategory.NAVIGATION">Hàng hải</option>
                  <option [ngValue]="CourseCategory.CARGO_HANDLING">Xếp dỡ hàng hóa</option>
                  <option [ngValue]="CourseCategory.MARITIME_LAW">Luật hàng hải</option>
                </select>
              </div>

              <!-- Level -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Cấp độ</label>
                <select [(ngModel)]="filters.level"
                        (ngModelChange)="applyFilters()"
                        aria-label="Lọc theo cấp độ"
                        class="w-full px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option [ngValue]="undefined">Tất cả cấp độ</option>
                  <option [ngValue]="'beginner'">Cơ bản</option>
                  <option [ngValue]="'intermediate'">Trung cấp</option>
                  <option [ngValue]="'advanced'">Nâng cao</option>
                </select>
              </div>

              <!-- Price Range -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Khoảng giá (VND)</label>
                <div class="flex gap-3">
                  <input type="number"
                         [ngModel]="priceMin"
                         (ngModelChange)="onPriceMinChange($event)"
                         placeholder="Từ"
                         aria-label="Giá tối thiểu"
                         class="w-1/2 px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <input type="number"
                         [ngModel]="priceMax"
                         (ngModelChange)="onPriceMaxChange($event)"
                         placeholder="Đến"
                         aria-label="Giá tối đa"
                         class="w-1/2 px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
              </div>

              <!-- Rating -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Đánh giá tối thiểu</label>
                <select [ngModel]="filters.rating"
                        (ngModelChange)="onRatingChange($event)"
                        aria-label="Lọc theo đánh giá tối thiểu"
                        class="w-full px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option [ngValue]="undefined">Tất cả</option>
                  <option [ngValue]="3.5">Từ 3.5</option>
                  <option [ngValue]="4">Từ 4.0</option>
                  <option [ngValue]="4.5">Từ 4.5</option>
                </select>
              </div>

              <!-- Sort -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Sắp xếp</label>
                <select [(ngModel)]="filters.sortBy"
                        (ngModelChange)="applyFilters()"
                        aria-label="Sắp xếp khóa học"
                        class="w-full px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option [ngValue]="'rating'">Đánh giá cao</option>
                  <option [ngValue]="'title'">Tên A-Z</option>
                  <option [ngValue]="'price'">Giá thấp đến cao</option>
                </select>
              </div>

              <!-- Clear Filters -->
              <button (click)="clearFilters()"
                      aria-label="Xóa tất cả bộ lọc"
                      class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Xóa bộ lọc
              </button>
            </div>
          </div>

          <!-- Courses Grid -->
          <div class="lg:w-3/4" role="region" aria-label="Kết quả khóa học">
            <!-- Results Header -->
            <div class="flex justify-between items-center mb-6">
              <div>
                <p class="text-gray-600">
                  Hiển thị {{ paginationInfo().totalItems }} khóa học
                  @if (paginationInfo().totalPages > 1) {
                    (trang {{ paginationInfo().currentPage }}/{{ paginationInfo().totalPages }})
                  }
                </p>
              </div>
            </div>

            <!-- Loading State -->
            @if (isLoading()) {
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                @for (item of [1,2,3,4,5,6]; track item) {
                  <div class="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                    <div class="h-48 bg-gray-300"></div>
                    <div class="p-6">
                      <div class="h-4 bg-gray-300 rounded mb-2"></div>
                      <div class="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                      <div class="h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                }
              </div>
            } @else if (courses().length === 0) {
              <!-- Empty State -->
              <div class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Không tìm thấy khóa học</h3>
                <p class="mt-1 text-sm text-gray-500">Thử thay đổi bộ lọc để tìm khóa học phù hợp</p>
              </div>
            } @else {
              <!-- Courses Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                @for (course of courses(); track course.id) {
                  <app-course-card [course]="course"></app-course-card>
                }
              </div>

              <!-- Pagination -->
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
  protected getCoursesUseCase = inject(GetCoursesUseCase);
  protected authService = inject(AuthService);
  protected enrollmentService = inject(StudentEnrollmentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

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

  // Enrollment tracking for efficient lookup
  private enrolledCourseIds = new Set<string>();


  ngOnInit(): void {
    // Static SEO for listing page
    const pageTitle = 'Khóa học - LMS Maritime';
    const description = 'Danh sách khóa học hàng hải với bộ lọc nâng cao theo danh mục, cấp độ, giá, đánh giá.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });

    // Make this component accessible globally for course cards (only in browser)
    if (isPlatformBrowser(this.platformId)) {
      (window as any).coursesComponent = this;
    }

    // Load enrolled courses for authenticated students to check enrollment status
    if (this.authService.isAuthenticated() && this.authService.userRole() === 'student') {
      console.log('[COURSES COMPONENT] Loading enrolled courses for student');
      // Load enrolled courses and update the Set for efficient lookup
      this.enrollmentService.loadEnrolledCourses().then(() => {
        console.log('[COURSES COMPONENT] Enrolled courses loaded successfully');
        // Update the enrolledCourseIds Set for fast lookup
        const enrolledIds = this.enrollmentService.enrolledCourses().map(course => course.id);
        this.enrolledCourseIds = new Set(enrolledIds);
        console.log('[COURSES COMPONENT] Enrolled course IDs updated:', enrolledIds);
      }).catch(error => {
        console.error('[COURSES COMPONENT] Failed to load enrolled courses:', error);
      });
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
      // Inject ItemList JSON-LD for current list
      this.injectItemListJsonLd();
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
            // Convert domain courses to UI courses using dedicated mapper
            const uiCourses = response.items.map(domainCourse =>
              this.mapDomainToExtendedCourse(domainCourse)
            );

            // Set courses data to signal
            this.courses.set(uiCourses);

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
        error: (error: any) => {
          console.error('Error loading courses:', error);
          // Loading state is handled by finalize operator
          // TODO: Add proper error handling
        }
      });
  }

  private injectItemListJsonLd(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const items = this.courses().slice(0, 12).map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Course',
        name: c.title,
        description: c.shortDescription || c.description,
        url: `${this.document.location.origin}/courses/${c.id}`,
        provider: { '@type': 'Organization', name: 'LMS Maritime' }
      }
    }));
    const data = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items
    };
    const id = 'jsonld-courses-itemlist';
    let scriptEl = this.document.getElementById(id) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = this.document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.id = id;
      this.document.head.appendChild(scriptEl);
    }
    scriptEl.text = JSON.stringify(data);
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
    // Cast to any to access raw properties without calling methods
    const rawCourse = domainCourse as any;

    // Safely extract nested objects with null checks
    const metadata = rawCourse?.metadata ?? {};
    const specifications = rawCourse?.specifications ?? {};
    const teacherName = rawCourse?.teacherName ?? this.getTeacherName(rawCourse?.instructorId);

    // Calculate formatted duration directly (avoid calling .getFormattedDuration())
    const durationHours = specifications?.durationHours ?? 10;
    const formattedDuration = durationHours < 1
      ? `${Math.round(durationHours * 60)} phút`
      : `${durationHours} giờ`;

    // Calculate rating directly (avoid calling .getRating())
    const rawRating = metadata?.rating ?? 5;
    const rating = Math.round(rawRating * 10) / 10;

    // Determine if published directly (avoid calling .isPublished())
    const status = rawCourse?.status;
    const isPublished = status === 'published';

    // Determine if free directly (avoid calling .isFree())
    const price = specifications?.price ?? 0;
    const isFree = price === 0;

    // Determine if popular directly (avoid calling .isPopular())
    const studentsCount = metadata?.studentsCount ?? 0;
    const isPopular = studentsCount > 50;

    // Determine if new directly (avoid calling .isNew())
    const createdAt = metadata?.createdAt ? new Date(metadata.createdAt) : new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isNew = createdAt >= thirtyDaysAgo;

    return {
      id: rawCourse?.id ?? '',
      title: rawCourse?.title ?? '',
      description: rawCourse?.description ?? '',
      shortDescription: rawCourse?.shortDescription ?? rawCourse?.description?.slice(0, 120) ?? '',
      level: specifications?.level ?? 'beginner',
      duration: formattedDuration,
      students: studentsCount,
      rating: rating,
      reviews: metadata?.reviewsCount ?? 0,
      price: price,
      originalPrice: undefined,
      instructor: {
        id: rawCourse?.instructorId ?? '',
        name: teacherName,
        title: 'Giảng viên',
        avatar: 'assets/avatar-default.png',
        credentials: [],
        experience: 0,
        rating: rating,
        studentsCount: studentsCount
      },
      thumbnail: rawCourse?.thumbnail ?? 'assets/images/courses/placeholder.png',
      category: rawCourse?.category ?? 'engineering',
      tags: rawCourse?.tags ?? [],
      skills: rawCourse?.skills ?? [],
      prerequisites: [],
      certificate: { type: 'Completion', description: '' },
      curriculum: {
        modules: specifications?.modulesCount ?? 0,
        lessons: specifications?.lessonsCount ?? 0,
        duration: formattedDuration
      },
      isPopular: isPopular,
      isNew: isNew,
      isFree: isFree,
      studentsCount: studentsCount,
      lessonsCount: specifications?.lessonsCount ?? 0,
      isPublished: isPublished,
      isEnrolled: this.isEnrolled(rawCourse?.id ?? '')
    };
  }

  /**
   * Check if a course is enrolled by the current student
   * Uses the enrolledCourseIds Set for O(1) lookup performance
   */
  public isEnrolled(courseId: string): boolean {
    return this.enrolledCourseIds.has(courseId);
  }

}
