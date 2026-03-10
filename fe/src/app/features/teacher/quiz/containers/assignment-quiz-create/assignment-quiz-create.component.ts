import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { QuizApi, CreateAssignmentQuizRequest } from '../../../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../../../api/endpoints/question.api';
import { CourseApi } from '../../../../../api/client/course.api';
import { CourseContentChapter } from '../../../../../api/types/course.types';
import { QuizFormComponent, QuizFormConfig, QuizFormData } from '../../components/quiz-form/quiz-form.component';
import { ToastService } from '../../../../../core/services/toast.service';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { ClassSummary } from '../../../../../shared/types/course.types';
import { ClassService } from '../../../../../state/class.service';

type DeliveryMode = 'SELF_PACED' | 'INSTRUCTOR_LED';
type QuizScope = 'COURSE' | 'CLASS';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-assignment-quiz-create',
  imports: [FormsModule, QuizFormComponent, IconComponent],
  templateUrl: './assignment-quiz-create.component.html'
})
export class AssignmentQuizCreateComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizApi = inject(QuizApi);
  private questionApi = inject(QuestionApi);
  private courseApi = inject(CourseApi);
  private classService = inject(ClassService);
  private toast = inject(ToastService);

  courseId = signal<string>('');
  courseTitle = signal<string>('');
  deliveryMode = signal<DeliveryMode>('SELF_PACED');
  chapters = signal<Array<{ id: string; title: string }>>([]);
  selectedChapterId = signal<string>('');
  questions = signal<Question[]>([]);
  isLoading = signal<boolean>(true);

  scope = signal<QuizScope>('COURSE');
  classes = signal<ClassSummary[]>([]);
  selectedClassId = signal<string>('');

  readonly supportsClassScope = computed(() => this.deliveryMode() === 'INSTRUCTOR_LED');

  private prefilledChapterId: string | null = null;
  private prefilledClassId: string | null = null;

  formConfig: QuizFormConfig = {
    showDates: true,
    defaults: {
      maxAttempts: 3,
      passingScore: 70,
      shuffleQuestions: true,
      shuffleOptions: false,
      showResultsImmediately: true,
      showCorrectAnswers: true,
      publishImmediately: true
    }
  };

  ngOnInit() {
    const queryParams = this.route.snapshot.queryParamMap;
    this.prefilledChapterId = queryParams.get('chapterId') || queryParams.get('sectionId');
    this.prefilledClassId = queryParams.get('classId');

    this.route.params.pipe(take(1)).subscribe(params => {
      const id = params['courseId'];
      if (!id) {
        this.toast.error('Không tìm thấy khóa học để tạo quiz');
        return;
      }

      this.courseId.set(id);
      this.loadData(id);
    });
  }

  setScope(scope: QuizScope): void {
    if (scope === 'CLASS' && !this.supportsClassScope()) {
      return;
    }

    this.scope.set(scope);
    if (scope === 'COURSE') {
      this.selectedClassId.set('');
    }
  }

  private loadData(courseId: string) {
    this.isLoading.set(true);

    this.courseApi.getCourseById(courseId).subscribe({
      next: (response: any) => {
        const course = response?.data ?? response;
        this.courseTitle.set(course?.title || '');

        const mode = (course?.deliveryMode as DeliveryMode) || 'SELF_PACED';
        this.deliveryMode.set(mode);

        if (mode !== 'INSTRUCTOR_LED') {
          this.scope.set('COURSE');
          this.selectedClassId.set('');
        }

        this.restoreClassSelection();
      },
      error: () => {
        this.toast.error('Không thể tải thông tin khóa học');
      }
    });

    this.courseApi.getCourseContent(courseId).subscribe({
      next: (response: any) => {
        const chapters: CourseContentChapter[] = response?.data ?? response ?? [];
        this.chapters.set(chapters.map(chapter => ({
          id: chapter.id,
          title: chapter.title
        })));
        this.restoreChapterSelection();
      },
      error: () => {
        this.chapters.set([]);
      }
    });

    this.classService.getClassesByCourse(courseId).subscribe({
      next: (classes) => {
        this.classes.set(classes);
        this.restoreClassSelection();
      },
      error: () => {
        this.classes.set([]);
        this.selectedClassId.set('');
      }
    });

    this.questionApi.getMyQuestions().subscribe({
      next: (questions: Question[]) => {
        this.questions.set(questions);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  private restoreChapterSelection(): void {
    const chapters = this.chapters();
    if (chapters.length === 0) {
      this.selectedChapterId.set('');
      return;
    }

    if (this.prefilledChapterId && chapters.some(chapter => chapter.id === this.prefilledChapterId)) {
      this.selectedChapterId.set(this.prefilledChapterId);
      return;
    }

    if (this.selectedChapterId() && chapters.some(chapter => chapter.id === this.selectedChapterId())) {
      return;
    }

    if (chapters.length === 1) {
      this.selectedChapterId.set(chapters[0].id);
    } else {
      this.selectedChapterId.set('');
    }
  }

  private restoreClassSelection(): void {
    if (!this.supportsClassScope()) {
      this.scope.set('COURSE');
      this.selectedClassId.set('');
      return;
    }

    const classes = this.classes();
    if (this.prefilledClassId && classes.some(cls => cls.id === this.prefilledClassId)) {
      this.scope.set('CLASS');
      this.selectedClassId.set(this.prefilledClassId);
      return;
    }

    if (this.selectedClassId() && classes.some(cls => cls.id === this.selectedClassId())) {
      return;
    }

    this.selectedClassId.set('');
  }

  handleSubmit(formData: QuizFormData) {
    if (!this.selectedChapterId()) {
      this.toast.warning('Vui lòng chọn chương để đặt quiz vào cấu trúc khóa học.');
      return;
    }

    if (this.scope() === 'CLASS' && !this.selectedClassId()) {
      this.toast.warning('Vui lòng chọn lớp học.');
      return;
    }

    const request: CreateAssignmentQuizRequest = {
      title: formData.title,
      description: formData.description,
      timeLimitMinutes: formData.timeLimitMinutes,
      maxAttempts: formData.maxAttempts,
      passingScore: formData.passingScore,
      shuffleQuestions: formData.shuffleQuestions,
      shuffleOptions: formData.shuffleOptions,
      showResultsImmediately: formData.showResultsImmediately,
      showCorrectAnswers: formData.showCorrectAnswers,
      startDate: formData.startDate,
      endDate: formData.endDate,
      chapterId: this.selectedChapterId(),
      questionIds: formData.questionIds,
      publishImmediately: formData.publishImmediately,
      classId: this.scope() === 'CLASS' ? this.selectedClassId() : undefined
    };

    this.quizApi.createCourseQuizV3(this.courseId(), request).subscribe({
      next: () => {
        const message = this.scope() === 'CLASS'
          ? 'Đã tạo quiz cho lớp học thành công.'
          : 'Đã tạo quiz cho toàn bộ khóa học thành công.';
        this.toast.success(message);
        this.router.navigate(['/teacher/assessments/quizzes']);
      },
      error: () => {
        this.toast.error('Có lỗi xảy ra khi tạo quiz. Vui lòng thử lại.');
      }
    });
  }

  handleCancel() {
    this.router.navigate(['/teacher/courses', this.courseId()]);
  }
}
