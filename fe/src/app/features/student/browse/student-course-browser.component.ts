import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { CourseApi } from '../../../api/client/course.api';
import { CourseSummary, CourseCategoryDTO } from '../../../api/types/course.types';
import { StudentEnrollmentService } from '../services/enrollment.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-student-course-browser',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-4 sm:px-6 py-6 max-w-[1400px] mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Khám phá khóa học</h1>
        <p class="text-sm text-gray-500 mt-1">Tìm kiếm và đăng ký các khóa học hàng hải</p>
      </div>

      <!-- Search Bar -->
      <div class="mb-5">
        <div class="relative max-w-xl">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            placeholder="Tìm kiếm khóa học, giảng viên..."
            class="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-shadow" />
        </div>
      </div>

      <!-- Category Filter Tabs -->
      <div class="flex items-center gap-2 mb-2 overflow-x-auto pb-1 scrollbar-thin">
        <button (click)="selectRootCategory(null)"
          class="px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors"
          [class]="!selectedRootCategory()
            ? 'bg-[#0056D2] text-white border-[#0056D2]'
            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'">
          Tất cả
        </button>
        @for (root of categoryTree(); track root.id) {
          <button (click)="selectRootCategory(root)"
            class="px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors"
            [class]="selectedRootCategory()?.id === root.id
              ? 'bg-[#0056D2] text-white border-[#0056D2]'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'">
            {{ root.name }}
          </button>
        }
      </div>

      <!-- Subcategory Chips -->
      @if (selectedRootCategory()?.children?.length) {
        <div class="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
          <button (click)="selectedSubId.set(null)"
            class="px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
            [class]="!selectedSubId()
              ? 'bg-[#0056D2]/10 text-[#0056D2]'
              : 'text-gray-500 hover:text-gray-700'">
            Tất cả
          </button>
          @for (sub of selectedRootCategory()!.children; track sub.id) {
            <button (click)="selectedSubId.set(sub.id)"
              class="px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
              [class]="selectedSubId() === sub.id
                ? 'bg-[#0056D2]/10 text-[#0056D2]'
                : 'text-gray-500 hover:text-gray-700'">
              {{ sub.name }}
            </button>
          }
        </div>
      } @else {
        <div class="mb-4"></div>
      }

      <!-- Filter Row: Level + Mode + Sort -->
      <div class="flex items-center gap-4 mb-5 flex-wrap">
        <!-- Mode Filter -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-slate-500">Hình thức:</span>
          <button (click)="modeFilter.set('')"
            class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
            [class]="!modeFilter()
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'">
            Tất cả
          </button>
          <button (click)="modeFilter.set('SELF_PACED')"
            class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
            [class]="modeFilter() === 'SELF_PACED'
              ? 'bg-[#0056D2] text-white border-[#0056D2]'
              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'">
            Tự học
          </button>
          <button (click)="modeFilter.set('INSTRUCTOR_LED')"
            class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
            [class]="modeFilter() === 'INSTRUCTOR_LED'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'">
            Lớp học
          </button>
        </div>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Sort -->
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-500">Sắp xếp:</label>
          <select
            [value]="sortMode()"
            (change)="onSortChange($event)"
            class="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-[#0056D2] focus:border-[#0056D2] outline-none">
            <option value="newest">Mới nhất</option>
            <option value="popular">Nhiều học viên</option>
            <option value="az">Tên A-Z</option>
          </select>
        </div>
      </div>

      <!-- Results Bar -->
      <div class="flex items-center justify-between mb-4">
        <span class="text-sm text-gray-600">
          @if (!isLoading()) {
            Tìm thấy <strong class="text-gray-900">{{ filteredCourses().length }}</strong> khóa học
          }
        </span>
        <!-- "Đang học" quick toggle -->
        <button
          (click)="toggleEnrolledFilter()"
          class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
          [class]="showEnrolledOnly()
            ? 'bg-green-50 text-green-700 border-green-300'
            : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'">
          @if (showEnrolledOnly()) {
            <svg class="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          }
          Đã đăng ký
        </button>
      </div>

      <!-- Loading Skeleton -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          @for (i of [1,2,3,4,5,6,7,8]; track i) {
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
              <div class="h-40 bg-gray-200"></div>
              <div class="p-4 space-y-3">
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                <div class="h-3 bg-gray-200 rounded w-full"></div>
                <div class="flex justify-between pt-2">
                  <div class="h-3 bg-gray-200 rounded w-16"></div>
                  <div class="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Error State -->
      @if (errorMsg() && !isLoading()) {
        <div class="text-center py-16">
          <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-gray-600 mb-4">{{ errorMsg() }}</p>
          <button (click)="loadCourses()" class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] text-sm font-medium">
            Thử lại
          </button>
        </div>
      }

      <!-- Course Grid -->
      @if (!isLoading() && !errorMsg()) {
        @if (filteredCourses().length === 0) {
          <div class="text-center py-20">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <h3 class="text-lg font-medium text-gray-700 mb-1">Không tìm thấy khóa học</h3>
            <p class="text-sm text-gray-500 mb-4">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            @if (searchQuery() || selectedRootCategory() || modeFilter() || levelFilter()) {
              <button (click)="clearAllFilters()" class="px-4 py-2 text-sm font-medium text-[#0056D2] border border-[#0056D2] rounded-lg hover:bg-[#0056D2]/5 transition-colors">
                Xóa bộ lọc
              </button>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            @for (course of filteredCourses(); track course.id) {
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 group cursor-pointer flex flex-col"
                   (click)="viewDetail(course.id)">
                <!-- Thumbnail -->
                <div class="relative h-40 overflow-hidden flex-shrink-0">
                  @if (course.thumbnailUrl) {
                    <img [src]="course.thumbnailUrl" [alt]="course.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  } @else {
                    <div class="w-full h-full flex items-center justify-center"
                         [style.background]="getThumbnailGradient(course.title)">
                      <span class="text-4xl font-bold text-white/80">{{ course.title.charAt(0).toUpperCase() }}</span>
                    </div>
                  }
                  <!-- Category chip -->
                  @if (course.categoryName) {
                    <span class="absolute top-2 left-2 px-2 py-0.5 text-[11px] font-medium bg-white/90 backdrop-blur-sm text-gray-700 rounded-md shadow-sm">
                      {{ course.categoryName }}
                    </span>
                  }
                  <!-- Mode badge -->
                  @if (course.deliveryMode === 'INSTRUCTOR_LED') {
                    <span class="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/90 text-white rounded-md backdrop-blur-sm">
                      Lớp học
                    </span>
                  }
                  <!-- Capacity badge -->
                  @if (isClassFull(course)) {
                    <span class="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-semibold bg-red-500/90 text-white rounded-md backdrop-blur-sm">
                      Đã hết chỗ
                    </span>
                  }
                  <!-- Enrolled badge -->
                  @if (isEnrolled(course.id)) {
                    <span class="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold bg-green-500 text-white rounded-full shadow-sm">
                      Đã đăng ký
                    </span>
                  }
                </div>

                <!-- Content -->
                <div class="p-4 flex-1 flex flex-col">
                  <h3 class="font-semibold text-gray-900 line-clamp-2 mb-1.5 text-[15px] leading-snug group-hover:text-[#0056D2] transition-colors">{{ course.title }}</h3>
                  @if (course.teacherName) {
                    <p class="text-xs text-gray-500 mb-2">{{ course.teacherName }}</p>
                  }

                  <!-- Meta Row -->
                  <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    @if (course.enrolledCount) {
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                        {{ course.enrolledCount | number }} học viên
                      </span>
                    }
                    @if (course.deliveryMode === 'SELF_PACED') {
                      <span class="text-[#0056D2]">Tự học</span>
                    }
                  </div>

                  <!-- Enrolled Progress Bar -->
                  @if (isEnrolled(course.id) && course.progress != null && course.progress > 0) {
                    <div class="mb-3">
                      <div class="flex items-center justify-between text-xs mb-1">
                        <span class="text-gray-500">Tiến độ</span>
                        <span class="font-medium text-[#0056D2]">{{ course.progress }}%</span>
                      </div>
                      <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-[#0056D2] rounded-full transition-all duration-300"
                             [style.width.%]="course.progress"></div>
                      </div>
                    </div>
                  }

                  <!-- Spacer -->
                  <div class="flex-1"></div>

                  <!-- Footer: Price + CTA -->
                  <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      @if (course.priceType === 'FREE' || !course.price) {
                        <span class="text-sm font-medium text-green-600">Miễn phí</span>
                      } @else if (course.salePrice && course.salePrice < course.price) {
                        <div class="flex items-center gap-1.5">
                          <span class="text-sm font-semibold text-gray-900">{{ formatPrice(course.salePrice) }}</span>
                          <span class="text-xs text-gray-400 line-through">{{ formatPrice(course.price) }}</span>
                        </div>
                      } @else {
                        <span class="text-sm font-semibold text-gray-900">{{ formatPrice(course.price) }}</span>
                      }
                    </div>

                    <!-- Context-aware CTA -->
                    @if (isEnrolled(course.id)) {
                      <button (click)="continueLearning(course.id); $event.stopPropagation()"
                        class="px-3.5 py-1.5 text-sm font-medium text-white bg-[#0056D2] rounded-lg hover:bg-[#004BB5] transition-colors">
                        Tiếp tục học
                      </button>
                    } @else if (isClassFull(course)) {
                      <span class="px-3.5 py-1.5 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed">
                        Đã hết chỗ
                      </span>
                    } @else {
                      <button (click)="viewDetail(course.id); $event.stopPropagation()"
                        class="px-3.5 py-1.5 text-sm font-medium text-[#0056D2] border border-[#0056D2] rounded-lg hover:bg-[#0056D2]/5 transition-colors">
                        Xem chi tiết
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-center gap-1.5 mt-8">
              <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 0"
                class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              @for (p of paginationPages(); track p) {
                @if (p === -1) {
                  <span class="px-2 py-2 text-sm text-gray-400">...</span>
                } @else {
                  <button (click)="goToPage(p)"
                    class="w-9 h-9 text-sm rounded-lg border transition-colors"
                    [class]="currentPage() === p
                      ? 'bg-[#0056D2] text-white border-[#0056D2]'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'">
                    {{ p + 1 }}
                  </button>
                }
              }
              <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() >= totalPages() - 1"
                class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          }
        }
      }
    </div>
  `
})
export class StudentCourseBrowserComponent implements OnInit {
  private courseApi = inject(CourseApi);
  private enrollmentService = inject(StudentEnrollmentService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  // Raw courses from API
  private rawCourses = signal<CourseSummary[]>([]);
  isLoading = signal(false);
  errorMsg = signal<string | null>(null);
  searchQuery = signal('');
  currentPage = signal(0);
  totalPages = signal(1);

  // Category tree from API
  categoryTree = signal<CourseCategoryDTO[]>([]);
  selectedRootCategory = signal<CourseCategoryDTO | null>(null);
  selectedSubId = signal<string | null>(null);

  // Filter/sort state
  sortMode = signal<string>('newest');
  showEnrolledOnly = signal(false);
  modeFilter = signal<'' | 'SELF_PACED' | 'INSTRUCTOR_LED'>('');

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly PAGE_SIZE = 12;

  private enrolledIds = computed(() => this.enrollmentService.enrolledCourseIds());

  // Client-side filtered + sorted courses
  filteredCourses = computed(() => {
    let result = this.rawCourses();

    // Category filter — match by categoryName (root or sub)
    const root = this.selectedRootCategory();
    if (root) {
      const subId = this.selectedSubId();
      if (subId) {
        const sub = root.children?.find(c => c.id === subId);
        if (sub) result = result.filter(c => c.categoryName === sub.name);
      } else {
        const names = new Set([root.name, ...(root.children?.map(c => c.name) || [])]);
        result = result.filter(c => c.categoryName && names.has(c.categoryName));
      }
    }

    // Mode filter
    const mode = this.modeFilter();
    if (mode) {
      result = result.filter(c => c.deliveryMode === mode);
    }

    // Enrolled-only filter
    if (this.showEnrolledOnly()) {
      const ids = this.enrolledIds();
      result = result.filter(c => ids.has(c.id));
    }

    // Sort
    const sort = this.sortMode();
    if (sort === 'az') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    } else if (sort === 'popular') {
      result = [...result].sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0));
    }
    // 'newest' = API default order

    return result;
  });

  // Pagination pages for numbered pagination
  paginationPages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);

    const pages: number[] = [0];
    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);
    if (start > 1) pages.push(-1); // ellipsis
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 2) pages.push(-1); // ellipsis
    pages.push(total - 1);
    return pages;
  });

  private readonly GRADIENTS = [
    'linear-gradient(135deg, #0056D2 0%, #4A90D9 100%)',
    'linear-gradient(135deg, #059669 0%, #34D399 100%)',
    'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
    'linear-gradient(135deg, #DC2626 0%, #F87171 100%)',
    'linear-gradient(135deg, #D97706 0%, #FCD34D 100%)',
    'linear-gradient(135deg, #0891B2 0%, #67E8F9 100%)',
  ];

  ngOnInit(): void {
    this.loadCourses();
    this.enrollmentService.loadEnrolledCourses(0);
    this.loadCategoryTree();
  }

  private loadCategoryTree(): void {
    this.http.get<{ data: CourseCategoryDTO[] }>(`${environment.apiUrl}/api/v3/course-categories`).subscribe({
      next: (res) => this.categoryTree.set(res.data || []),
      error: () => {} // Silent — categories are optional
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage.set(0);
      this.loadCourses();
    }, 300);
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);

    const params: any = { page: this.currentPage(), size: this.PAGE_SIZE };
    const q = this.searchQuery().trim();
    if (q) params.search = q;

    this.courseApi.publicCourses(params).subscribe({
      next: (res) => {
        this.rawCourses.set(res.data ?? []);
        const pagination = res.pagination as any;
        if (pagination?.totalPages) {
          this.totalPages.set(pagination.totalPages);
        } else {
          this.totalPages.set((res.data?.length ?? 0) >= this.PAGE_SIZE ? this.currentPage() + 2 : this.currentPage() + 1);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('Không thể tải danh sách khóa học');
        this.isLoading.set(false);
        this.toast.error('Không thể tải danh sách khóa học');
      }
    });
  }

  selectRootCategory(root: CourseCategoryDTO | null): void {
    this.selectedRootCategory.set(root);
    this.selectedSubId.set(null);
  }

  onSortChange(event: Event): void {
    this.sortMode.set((event.target as HTMLSelectElement).value);
  }

  toggleEnrolledFilter(): void {
    this.showEnrolledOnly.update(v => !v);
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedRootCategory.set(null);
    this.selectedSubId.set(null);
    this.modeFilter.set('');
    this.levelFilter.set('');
    this.showEnrolledOnly.set(false);
    this.sortMode.set('newest');
    this.currentPage.set(0);
    this.loadCourses();
  }

  isEnrolled(courseId: string): boolean {
    return this.enrolledIds().has(courseId);
  }

  isClassFull(course: CourseSummary): boolean {
    return course.deliveryMode === 'INSTRUCTOR_LED'
      && !!course.maxStudents
      && course.enrolledCount >= course.maxStudents;
  }

  continueLearning(courseId: string): void {
    this.router.navigate(['/student/learn/course', courseId]);
  }

  viewDetail(courseId: string): void {
    this.router.navigate(['/courses', courseId]);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.loadCourses();
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatPrice(price: number | undefined): string {
    if (!price) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  getThumbnailGradient(title: string): string {
    const hash = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return this.GRADIENTS[hash % this.GRADIENTS.length];
  }
}
