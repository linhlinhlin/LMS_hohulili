import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
// CommonModule removed — [ngClass] replaced by SCSS class bindings
import { forkJoin } from 'rxjs';
import { CourseApi } from '../../../../api/client/course.api';
import { AdminService } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { CourseDetail, CourseContentChapter, LessonSummary, SectionSummary } from '../../../../api/types/course.types';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-course-content-preview',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-content-preview.component.html',
  styleUrl: './course-content-preview.component.scss'
})
export class CourseContentPreviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseApi = inject(CourseApi);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private sanitizer = inject(DomSanitizer);
  private location = inject(Location);

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

    forkJoin({
      course: this.courseApi.getCourseById(courseId),
      content: this.courseApi.getCourseContent(courseId)
    }).subscribe({
      next: ({ course, content }) => {
        this.course.set(course.data);
        const chs = content.data || [];
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
        this.toast.error('Không thể tải thông tin khóa học');
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

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'badge-approved';
      case 'PENDING': return 'badge-pending';
      case 'REJECTED': return 'badge-rejected';
      default: return 'badge-draft';
    }
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
    this.location.back();
  }
}
