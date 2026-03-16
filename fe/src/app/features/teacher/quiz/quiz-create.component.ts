import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CourseApi } from '../../../api/client/course.api';
import { CourseContentChapter, CourseSummary } from '../../../api/types/course.types';
import { ToastService } from '../../../core/services/toast.service';

type QuizCreationPath = 'LESSON' | 'ASSIGNMENT';

@Component({
  selector: 'app-quiz-create',
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quiz-create.component.html',
})
export class QuizCreateComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly courseApi = inject(CourseApi);
  private readonly toast = inject(ToastService);

  readonly courses = signal<CourseSummary[]>([]);
  readonly chapters = signal<Array<{ id: string; title: string }>>([]);
  readonly selectedCourseId = signal('');
  readonly selectedChapterId = signal('');
  readonly selectedPath = signal<QuizCreationPath>('LESSON');
  readonly creationPaths: QuizCreationPath[] = ['LESSON', 'ASSIGNMENT'];
  readonly isLoadingCourses = signal(false);
  readonly isLoadingChapters = signal(false);

  readonly canContinue = computed(() =>
    this.selectedCourseId().length > 0 && this.selectedChapterId().length > 0
  );
  readonly selectedCourseTitle = computed(() =>
    this.courses().find((course) => course.id === this.selectedCourseId())?.title || 'Chưa chọn'
  );
  readonly selectedChapterTitle = computed(() =>
    this.chapters().find((chapter) => chapter.id === this.selectedChapterId())?.title || 'Chưa chọn'
  );

  constructor() {
    void this.loadCourses();

    const courseId = this.route.snapshot.queryParamMap.get('courseId') ?? '';
    const chapterId = this.route.snapshot.queryParamMap.get('chapterId')
      ?? this.route.snapshot.queryParamMap.get('sectionId')
      ?? '';
    const path = this.route.snapshot.queryParamMap.get('path');

    if (path === 'assignment') {
      this.selectedPath.set('ASSIGNMENT');
    }

    if (courseId) {
      this.selectedCourseId.set(courseId);
      void this.loadChapters(courseId, chapterId);
    }
  }

  async loadCourses(): Promise<void> {
    this.isLoadingCourses.set(true);

    this.courseApi.myCourses().subscribe({
      next: (response: unknown) => {
        const courseList = Array.isArray(response)
          ? response
          : (((response as { data?: CourseSummary[] } | null)?.data) ?? []);
        this.courses.set(courseList);
        this.isLoadingCourses.set(false);

        if (!this.selectedCourseId() && courseList.length === 1) {
          const courseId = courseList[0]?.id ?? '';
          if (courseId) {
            this.onCourseChange(courseId);
          }
        }
      },
      error: () => {
        this.isLoadingCourses.set(false);
        this.toast.error('Không thể tải danh sách khóa học. Vui lòng thử lại.');
      }
    });
  }

  onCourseChange(courseId: string): void {
    this.selectedCourseId.set(courseId);
    this.selectedChapterId.set('');
    this.chapters.set([]);

    if (!courseId) {
      return;
    }

    void this.loadChapters(courseId);
  }

  onPathChange(path: QuizCreationPath | string): void {
    this.selectedPath.set(path === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'LESSON');
  }

  handleCancel(): void {
    this.router.navigate(['/teacher/quiz/quiz-bank']);
  }

  continueCreation(): void {
    if (!this.selectedCourseId()) {
      this.toast.warning('Vui lòng chọn khóa học trước.');
      return;
    }

    if (!this.selectedChapterId()) {
      this.toast.warning('Vui lòng chọn chương hoặc bài học để neo quiz.');
      return;
    }

    if (this.selectedPath() === 'LESSON') {
      this.router.navigate(['/teacher/quiz/create/chapter', this.selectedChapterId()], {
        queryParams: { courseId: this.selectedCourseId() }
      });
      return;
    }

    this.router.navigate(['/teacher/quiz/create/assignment', this.selectedCourseId()], {
      queryParams: {
        chapterId: this.selectedChapterId(),
        path: 'assignment'
      }
    });
  }

  getPathTitle(path: QuizCreationPath): string {
    return path === 'LESSON' ? 'Quiz trong lesson/chương' : 'Bài kiểm tra được giao';
  }

  getPathDescription(path: QuizCreationPath): string {
    if (path === 'LESSON') {
      return 'Dùng cho quiz học tập nằm cố định trong nội dung khóa học: luyện tập, bài kiểm tra, hoặc bài thi.';
    }
    return 'Dùng cho đánh giá được giao trong workspace vận hành. Flow này luôn online-only và không phải nguồn chân lý của lesson.';
  }

  getContinueLabel(): string {
    return this.selectedPath() === 'LESSON'
      ? 'Tiếp tục tạo quiz trong lesson'
      : 'Tiếp tục sang flow đánh giá được giao';
  }

  private async loadChapters(courseId: string, preferredChapterId?: string): Promise<void> {
    this.isLoadingChapters.set(true);

    this.courseApi.getCourseContent(courseId).subscribe({
      next: (response: unknown) => {
        const chapters = (((response as { data?: CourseContentChapter[] } | null)?.data)
          ?? (response as CourseContentChapter[])
          ?? []);

        const mappedChapters = chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
        }));

        this.chapters.set(mappedChapters);
        this.isLoadingChapters.set(false);

        const targetChapterId = preferredChapterId && mappedChapters.some((chapter) => chapter.id === preferredChapterId)
          ? preferredChapterId
          : '';

        if (targetChapterId) {
          this.selectedChapterId.set(targetChapterId);
          return;
        }

        if (mappedChapters.length === 1) {
          this.selectedChapterId.set(mappedChapters[0].id);
        }
      },
      error: () => {
        this.isLoadingChapters.set(false);
        this.toast.error('Không thể tải cấu trúc khóa học để chọn vị trí neo quiz.');
      }
    });
  }
}
