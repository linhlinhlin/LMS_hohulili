import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { CourseApi } from '../../../../api/client/course.api';
import { AdminService } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { CourseDetail, CourseContentChapter, LessonSummary, SectionSummary } from '../../../../api/types/course.types';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-content-preview',
  imports: [FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="min-h-screen bg-slate-50 flex items-center justify-center">
        <div class="text-center">
          <div class="w-12 h-12 border-4 border-gray-200 border-t-[#0056D2] rounded-full animate-spin mx-auto"></div>
          <p class="mt-4 text-sm text-gray-600">Đang tải nội dung khóa học...</p>
        </div>
      </div>
    } @else if (course()) {
      <div class="min-h-screen bg-slate-50 flex flex-col">
        <!-- Top bar -->
        <div class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div class="flex items-center gap-4 min-w-0">
            <button (click)="goBack()"
              class="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Quay lại
            </button>
            <div class="h-5 w-px bg-gray-300 flex-shrink-0"></div>
            <div class="min-w-0">
              <h1 class="text-sm font-semibold text-gray-900 truncate">{{ course()!.title }}</h1>
              <p class="text-xs text-gray-500 truncate">{{ course()!.teacherName }}</p>
            </div>
          </div>
          <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
            [ngClass]="{
              'bg-green-100 text-green-700': course()!.status === 'APPROVED',
              'bg-amber-100 text-amber-700': course()!.status === 'PENDING',
              'bg-red-100 text-red-700': course()!.status === 'REJECTED',
              'bg-gray-100 text-gray-600': course()!.status === 'DRAFT'
            }">
            {{ getStatusText(course()!.status) }}
          </span>
        </div>

        <!-- Split pane -->
        <div class="flex flex-1 overflow-hidden" [style.height]="isPending() ? 'calc(100vh - 52px - 72px)' : 'calc(100vh - 52px)'">
          <!-- Left sidebar: Chapter tree -->
          <aside class="w-80 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
            <div class="p-4">
              <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Nội dung khóa học</h2>
              @if (chapters().length === 0) {
                <p class="text-sm text-gray-400 italic">Chưa có nội dung</p>
              }
              @for (chapter of chapters(); track chapter.id; let ci = $index) {
                <div class="mb-1">
                  <!-- Chapter node -->
                  <button (click)="toggleChapter(ci)"
                    class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-gray-50"
                    [class.bg-[#0056D2]/5]="selectedChapterIndex() === ci">
                    <svg class="w-4 h-4 text-gray-400 transition-transform flex-shrink-0"
                      [class.rotate-90]="expandedChapters().has(ci)"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                    <svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                    </svg>
                    <span class="text-sm font-medium text-gray-800 truncate">{{ chapter.title }}</span>
                  </button>

                  <!-- Lessons under chapter -->
                  @if (expandedChapters().has(ci)) {
                    <div class="ml-5 mt-0.5">
                      @for (lesson of chapter.lessons; track lesson.id; let li = $index) {
                        <div class="mb-0.5">
                          <!-- Lesson with sections -->
                          @if (lesson.sections && lesson.sections.length > 0) {
                            <button (click)="toggleLesson(ci, li)"
                              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-gray-50"
                              [class.bg-[#0056D2]/10]="selectedChapterIndex() === ci && selectedLessonIndex() === li && selectedSectionIndex() === -1">
                              <svg class="w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0"
                                [class.rotate-90]="expandedLessons().has(ci + '-' + li)"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                              </svg>
                              <svg class="w-3.5 h-3.5 text-[#0056D2] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                              </svg>
                              <span class="text-xs font-medium text-gray-700 truncate">{{ lesson.title }}</span>
                            </button>

                            <!-- Sections under lesson -->
                            @if (expandedLessons().has(ci + '-' + li)) {
                              <div class="ml-5 mt-0.5">
                                @for (section of lesson.sections; track section.id; let si = $index) {
                                  <button (click)="selectSection(ci, li, si)"
                                    class="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors hover:bg-gray-50"
                                    [class.bg-[#0056D2]/10]="selectedChapterIndex() === ci && selectedLessonIndex() === li && selectedSectionIndex() === si"
                                    [class.text-[#0056D2]]="selectedChapterIndex() === ci && selectedLessonIndex() === li && selectedSectionIndex() === si">
                                    <span class="flex-shrink-0">{{ getSectionIcon(section.type) }}</span>
                                    <span class="text-xs truncate"
                                      [class.font-medium]="selectedChapterIndex() === ci && selectedLessonIndex() === li && selectedSectionIndex() === si">
                                      {{ section.title }}
                                    </span>
                                  </button>
                                }
                              </div>
                            }
                          } @else {
                            <!-- Lesson without sections -->
                            <button (click)="selectLesson(ci, li)"
                              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-gray-50"
                              [class.bg-[#0056D2]/10]="selectedChapterIndex() === ci && selectedLessonIndex() === li">
                              <svg class="w-3.5 h-3.5 text-[#0056D2] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                              </svg>
                              <span class="text-xs text-gray-700 truncate"
                                [class.font-medium]="selectedChapterIndex() === ci && selectedLessonIndex() === li">
                                {{ lesson.title }}
                              </span>
                            </button>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </aside>

          <!-- Right content area -->
          <main class="flex-1 overflow-y-auto">
            @if (currentSection(); as section) {
              <!-- Section content -->
              <div class="max-w-4xl mx-auto p-8">
                <div class="mb-6">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-lg">{{ getSectionIcon(section.type) }}</span>
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">{{ section.type }}</span>
                  </div>
                  <h2 class="text-2xl font-bold text-gray-900">{{ section.title }}</h2>
                  @if (currentLesson()) {
                    <p class="text-sm text-gray-500 mt-1">{{ currentLesson()!.title }}</p>
                  }
                </div>

                <!-- VIDEO -->
                @if (section.type === 'VIDEO' && section.videoUrl) {
                  <div class="rounded-xl overflow-hidden bg-black aspect-video mb-6">
                    @if (isYouTubeUrl(section.videoUrl)) {
                      <iframe [src]="getYouTubeEmbedUrl(section.videoUrl)"
                        class="w-full h-full" frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen></iframe>
                    } @else {
                      <video [src]="section.videoUrl" controls controlsList="nodownload" class="w-full h-full">
                        Trình duyệt không hỗ trợ video.
                      </video>
                    }
                  </div>
                }

                <!-- TEXT -->
                @if (section.type === 'TEXT' && section.content) {
                  <div class="prose prose-sm max-w-none bg-white rounded-xl border border-gray-200 p-6"
                    [innerHTML]="getSanitizedHtml(section.content)"></div>
                }

                <!-- FILE -->
                @if (section.type === 'FILE') {
                  <div class="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-lg bg-[#0056D2]/10 flex items-center justify-center flex-shrink-0">
                      <svg class="w-6 h-6 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <div class="flex-1">
                      <h3 class="text-sm font-semibold text-gray-900">{{ section.title }}</h3>
                      <p class="text-xs text-gray-500 mt-0.5">Tài liệu đính kèm</p>
                    </div>
                    @if (section.fileUrl) {
                      <a [href]="section.fileUrl" target="_blank" rel="noopener noreferrer"
                        class="px-4 py-2 bg-[#0056D2] text-white text-sm font-medium rounded-lg hover:bg-[#004BB5] transition-colors">
                        Tải xuống
                      </a>
                    }
                  </div>
                }

                <!-- QUIZ -->
                @if (section.type === 'QUIZ') {
                  <div class="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <div class="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                      <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h6"/>
                      </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ section.title }}</h3>
                    <p class="text-sm text-gray-500">Phần trắc nghiệm - Học viên sẽ làm bài tại đây</p>
                  </div>
                }

                <!-- Empty section content -->
                @if (!section.content && !section.videoUrl && !section.fileUrl && section.type !== 'QUIZ') {
                  <div class="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <p class="text-sm text-gray-400 italic">Phần này chưa có nội dung</p>
                  </div>
                }
              </div>
            } @else if (currentLesson(); as lesson) {
              <!-- Lesson-level content (no sections) -->
              <div class="max-w-4xl mx-auto p-8">
                <div class="mb-6">
                  <h2 class="text-2xl font-bold text-gray-900">{{ lesson.title }}</h2>
                  @if (lesson.description) {
                    <p class="text-sm text-gray-500 mt-2">{{ lesson.description }}</p>
                  }
                </div>

                @if (lesson.videoUrl) {
                  <div class="rounded-xl overflow-hidden bg-black aspect-video mb-6">
                    @if (isYouTubeUrl(lesson.videoUrl)) {
                      <iframe [src]="getYouTubeEmbedUrl(lesson.videoUrl)"
                        class="w-full h-full" frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen></iframe>
                    } @else {
                      <video [src]="lesson.videoUrl" controls controlsList="nodownload" class="w-full h-full">
                        Trình duyệt không hỗ trợ video.
                      </video>
                    }
                  </div>
                }

                @if (lesson.content) {
                  <div class="prose prose-sm max-w-none bg-white rounded-xl border border-gray-200 p-6"
                    [innerHTML]="getSanitizedHtml(lesson.content)"></div>
                }

                @if (!lesson.content && !lesson.videoUrl) {
                  <div class="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <p class="text-sm text-gray-400 italic">Bài học này chưa có nội dung chi tiết</p>
                  </div>
                }
              </div>
            } @else {
              <!-- Course overview (nothing selected) -->
              <div class="max-w-4xl mx-auto p-8">
                <div class="bg-white rounded-xl border border-gray-200 p-8">
                  <h2 class="text-2xl font-bold text-gray-900 mb-4">{{ course()!.title }}</h2>
                  @if (course()!.description) {
                    <p class="text-gray-600 mb-6">{{ course()!.description }}</p>
                  }
                  <div class="grid grid-cols-3 gap-4">
                    <div class="bg-[#0056D2]/5 rounded-lg p-4 text-center">
                      <div class="text-2xl font-bold text-[#0056D2]">{{ chapters().length }}</div>
                      <div class="text-xs text-gray-600 mt-1">Chương</div>
                    </div>
                    <div class="bg-green-50 rounded-lg p-4 text-center">
                      <div class="text-2xl font-bold text-green-600">{{ totalLessons() }}</div>
                      <div class="text-xs text-gray-600 mt-1">Bài học</div>
                    </div>
                    <div class="bg-purple-50 rounded-lg p-4 text-center">
                      <div class="text-2xl font-bold text-purple-600">{{ totalSections() }}</div>
                      <div class="text-xs text-gray-600 mt-1">Nội dung</div>
                    </div>
                  </div>
                  <p class="text-sm text-gray-500 mt-6 text-center">Chọn một chương hoặc bài học ở thanh bên trái để xem nội dung</p>
                </div>
              </div>
            }
          </main>
        </div>

        <!-- Bottom action bar (only for PENDING) -->
        @if (isPending()) {
          <div class="bg-white border-t border-gray-200 px-6 py-4 flex items-center gap-4 sticky bottom-0 z-30">
            <input type="text"
              [(ngModel)]="feedbackText"
              placeholder="Nhập lý do từ chối (nếu có)..."
              class="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]" />
            <button (click)="rejectCourse()"
              [disabled]="rejecting() || !feedbackText.trim()"
              class="px-5 py-2.5 border-2 border-red-500 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              Từ chối & Yêu cầu chỉnh sửa
            </button>
            <button (click)="approveCourse()"
              [disabled]="approving()"
              class="px-5 py-2.5 bg-[#0056D2] text-white rounded-lg text-sm font-medium hover:bg-[#004BB5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              Duyệt khóa học
            </button>
          </div>
        }
      </div>
    } @else {
      <div class="min-h-screen bg-slate-50 flex items-center justify-center">
        <div class="text-center">
          <p class="text-gray-500">Không tìm thấy khóa học</p>
          <button (click)="goBack()" class="mt-4 text-[#0056D2] hover:underline text-sm">Quay lại</button>
        </div>
      </div>
    }
  `
})
export class CourseContentPreviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseApi = inject(CourseApi);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private sanitizer = inject(DomSanitizer);

  course = signal<CourseDetail | null>(null);
  chapters = signal<CourseContentChapter[]>([]);
  loading = signal(true);
  approving = signal(false);
  rejecting = signal(false);
  feedbackText = '';

  selectedChapterIndex = signal(-1);
  selectedLessonIndex = signal(-1);
  selectedSectionIndex = signal(-1);

  expandedChapters = signal<Set<number>>(new Set());
  expandedLessons = signal<Set<string>>(new Set());

  isPending = computed(() => this.course()?.status === 'PENDING');

  totalLessons = computed(() =>
    this.chapters().reduce((sum, ch) => sum + ch.lessons.length, 0)
  );

  totalSections = computed(() =>
    this.chapters().reduce((sum, ch) =>
      sum + ch.lessons.reduce((ls, l) => ls + (l.sections?.length || 0), 0), 0)
  );

  currentLesson = computed((): LessonSummary | null => {
    const ci = this.selectedChapterIndex();
    const li = this.selectedLessonIndex();
    const chs = this.chapters();
    if (ci < 0 || ci >= chs.length) return null;
    const lessons = chs[ci].lessons;
    if (li < 0 || li >= lessons.length) return null;
    return lessons[li];
  });

  currentSection = computed((): SectionSummary | null => {
    const lesson = this.currentLesson();
    const si = this.selectedSectionIndex();
    if (!lesson?.sections || si < 0 || si >= lesson.sections.length) return null;
    return lesson.sections[si];
  });

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    if (courseId) {
      this.loadCourseData(courseId);
    }
  }

  private loadCourseData(courseId: string): void {
    this.loading.set(true);

    this.courseApi.getCourseById(courseId).subscribe({
      next: (res) => {
        this.course.set(res.data);
      },
      error: () => {
        this.toast.error('Không thể tải thông tin khóa học');
        this.loading.set(false);
      }
    });

    this.courseApi.getCourseContent(courseId).subscribe({
      next: (res) => {
        const chs = res.data || [];
        this.chapters.set(chs);
        this.loading.set(false);

        // Auto-expand first chapter and select first lesson
        if (chs.length > 0) {
          this.expandedChapters.set(new Set([0]));
          if (chs[0].lessons.length > 0) {
            this.selectedChapterIndex.set(0);
            this.selectedLessonIndex.set(0);
            const firstLesson = chs[0].lessons[0];
            if (firstLesson.sections && firstLesson.sections.length > 0) {
              this.expandedLessons.set(new Set(['0-0']));
              this.selectedSectionIndex.set(0);
            }
          }
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  toggleChapter(ci: number): void {
    const expanded = new Set(this.expandedChapters());
    if (expanded.has(ci)) {
      expanded.delete(ci);
    } else {
      expanded.add(ci);
    }
    this.expandedChapters.set(expanded);
    this.selectedChapterIndex.set(ci);
  }

  toggleLesson(ci: number, li: number): void {
    const key = ci + '-' + li;
    const expanded = new Set(this.expandedLessons());
    if (expanded.has(key)) {
      expanded.delete(key);
    } else {
      expanded.add(key);
    }
    this.expandedLessons.set(expanded);
    this.selectedChapterIndex.set(ci);
    this.selectedLessonIndex.set(li);
    this.selectedSectionIndex.set(-1);
  }

  selectLesson(ci: number, li: number): void {
    this.selectedChapterIndex.set(ci);
    this.selectedLessonIndex.set(li);
    this.selectedSectionIndex.set(-1);
  }

  selectSection(ci: number, li: number, si: number): void {
    this.selectedChapterIndex.set(ci);
    this.selectedLessonIndex.set(li);
    this.selectedSectionIndex.set(si);
  }

  getSectionIcon(type: string): string {
    switch (type?.toUpperCase()) {
      case 'VIDEO': return '\u25B6\uFE0F';
      case 'TEXT': return '\uD83D\uDCC4';
      case 'FILE': return '\uD83D\uDCCE';
      case 'QUIZ': return '\u2753';
      default: return '\uD83D\uDCC4';
    }
  }

  isYouTubeUrl(url: string): boolean {
    return url?.includes('youtube.com') || url?.includes('youtu.be');
  }

  getYouTubeEmbedUrl(url: string): any {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0];
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}`
    );
  }

  getSanitizedHtml(content: string | undefined | null): any {
    if (!content) return '';
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      'DRAFT': 'Nháp',
      'PENDING': 'Chờ duyệt',
      'APPROVED': 'Đã duyệt',
      'REJECTED': 'Bị từ chối'
    };
    return map[status] || status;
  }

  async approveCourse(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Duyệt khóa học',
      message: `Bạn có chắc chắn muốn duyệt khóa học "${this.course()!.title}"?`,
      confirmText: 'Duyệt',
      variant: 'warning'
    });
    if (!confirmed) return;

    this.approving.set(true);
    this.adminService.approveCourse(this.course()!.id).subscribe({
      next: (response) => {
        this.toast.success(response.message || 'Đã duyệt khóa học thành công');
        this.approving.set(false);
        this.goBack();
      },
      error: (err) => {
        this.toast.error('Không thể duyệt: ' + (err.error?.message || 'Vui lòng thử lại'));
        this.approving.set(false);
      }
    });
  }

  rejectCourse(): void {
    if (!this.feedbackText.trim()) {
      this.toast.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    this.rejecting.set(true);
    this.adminService.rejectCourse(this.course()!.id, this.feedbackText.trim()).subscribe({
      next: (response) => {
        this.toast.success(response.message || 'Đã từ chối khóa học');
        this.rejecting.set(false);
        this.goBack();
      },
      error: (err) => {
        this.toast.error('Không thể từ chối: ' + (err.error?.message || 'Vui lòng thử lại'));
        this.rejecting.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/courses/review']);
  }
}
