import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { QuizApi } from '../../../../api/endpoints/quiz.api';

type OperationalBucket = 'CLASSROOM' | 'COURSE' | 'UNASSIGNED';

interface TeacherQuiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  assignmentScope?: 'LESSON' | 'COURSE' | 'CLASS';
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED' | string;
  courseId?: string;
  courseTitle?: string;
  classId?: string;
  className?: string;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  passingScore?: number;
  questionCount: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CourseQuizClassGroup {
  key: string;
  label: string;
  quizzes: TeacherQuiz[];
}

interface CourseQuizGroup {
  key: string;
  courseId?: string;
  courseTitle: string;
  classroomGroups: CourseQuizClassGroup[];
  coursewideQuizzes: TeacherQuiz[];
  unassignedQuizzes: TeacherQuiz[];
  totalCount: number;
}

@Component({
  selector: 'app-quiz-list',
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './quiz-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  private readonly quizApi = inject(QuizApi);

  readonly quizzes = signal<TeacherQuiz[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly expandedCourseKey = signal<string | null>(null);

  readonly classroomQuizzes = computed(() =>
    this.quizzes().filter(quiz => this.getOperationalBucket(quiz) === 'CLASSROOM')
  );

  readonly coursewideQuizzes = computed(() =>
    this.quizzes().filter(quiz => this.getOperationalBucket(quiz) === 'COURSE')
  );

  readonly unassignedQuizzes = computed(() =>
    this.quizzes().filter(quiz => this.getOperationalBucket(quiz) === 'UNASSIGNED')
  );

  readonly courseGroups = computed<CourseQuizGroup[]>(() => {
    const groups = new Map<string, {
      key: string;
      courseId?: string;
      courseTitle: string;
      classroomMap: Map<string, CourseQuizClassGroup>;
      coursewideQuizzes: TeacherQuiz[];
      unassignedQuizzes: TeacherQuiz[];
    }>();

    for (const quiz of this.sortQuizzes(this.quizzes())) {
      const key = quiz.courseId || quiz.courseTitle || `unknown-${quiz.id}`;
      const group = groups.get(key) ?? {
        key,
        courseId: quiz.courseId,
        courseTitle: quiz.courseTitle || 'Khóa học chưa rõ',
        classroomMap: new Map<string, CourseQuizClassGroup>(),
        coursewideQuizzes: [],
        unassignedQuizzes: [],
      };

      const bucket = this.getOperationalBucket(quiz);
      if (bucket === 'CLASSROOM') {
        const classKey = quiz.classId || quiz.className || `class-${quiz.id}`;
        const classGroup = group.classroomMap.get(classKey) ?? {
          key: classKey,
          label: quiz.className || 'Lớp chưa rõ',
          quizzes: [],
        };
        classGroup.quizzes.push(quiz);
        group.classroomMap.set(classKey, classGroup);
      } else if (bucket === 'COURSE') {
        group.coursewideQuizzes.push(quiz);
      } else {
        group.unassignedQuizzes.push(quiz);
      }

      groups.set(key, group);
    }

    return Array.from(groups.values())
      .map(group => ({
        key: group.key,
        courseId: group.courseId,
        courseTitle: group.courseTitle,
        classroomGroups: Array.from(group.classroomMap.values())
          .map(classGroup => ({
            ...classGroup,
            quizzes: this.sortQuizzes(classGroup.quizzes),
          }))
          .sort((left, right) => left.label.localeCompare(right.label, 'vi')),
        coursewideQuizzes: this.sortQuizzes(group.coursewideQuizzes),
        unassignedQuizzes: this.sortQuizzes(group.unassignedQuizzes),
        totalCount:
          Array.from(group.classroomMap.values()).reduce((sum, item) => sum + item.quizzes.length, 0) +
          group.coursewideQuizzes.length +
          group.unassignedQuizzes.length,
      }))
      .sort((left, right) => left.courseTitle.localeCompare(right.courseTitle, 'vi'));
  });

  readonly courseCount = computed(() => this.courseGroups().length);

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.quizApi.getTeacherQuizzes().subscribe({
      next: (response: any) => {
        const data: TeacherQuiz[] = response?.data ?? response ?? [];
        this.quizzes.set(data);
      },
      error: () => {
        this.error.set('Không thể tải danh sách bài kiểm tra. Vui lòng thử lại.');
        this.quizzes.set([]);
      },
      complete: () => this.loading.set(false)
    });
  }

  toggleCourseGroup(courseKey: string): void {
    this.expandedCourseKey.update(current => current === courseKey ? null : courseKey);
  }

  isCourseExpanded(courseKey: string): boolean {
    return this.expandedCourseKey() === courseKey;
  }

  getStatusClass(status: string): string {
    const normalized = status?.toUpperCase() || '';
    const classes: Record<string, string> = {
      PUBLISHED: 'bg-blue-50 text-blue-700 border-blue-100',
      DRAFT: 'bg-slate-50 text-slate-600 border-slate-200'
    };
    return classes[normalized] || 'bg-slate-50 text-slate-600 border-slate-200';
  }

  getStatusText(status: string): string {
    const normalized = status?.toUpperCase() || '';
    const texts: Record<string, string> = {
      PUBLISHED: 'Đã xuất bản',
      DRAFT: 'Bản nháp'
    };
    return texts[normalized] || status;
  }

  getQuizAudienceLabel(quiz: TeacherQuiz): string {
    if (quiz.assignmentScope === 'CLASS' && quiz.className) {
      return quiz.className;
    }

    if (quiz.deliveryMode === 'SELF_PACED' || quiz.assignmentScope === 'COURSE') {
      return 'Toàn khóa học';
    }

    return 'Chưa gắn lớp';
  }

  getCreateQuizLink(courseId?: string): string[] {
    return courseId
      ? ['/teacher/assessments/classes/quizzes/create', courseId]
      : ['/teacher/assessments/classes/quizzes/create'];
  }

  getCourseEditorLink(courseId: string): string[] {
    return ['/teacher/courses', courseId, 'editor', 'curriculum'];
  }

  private getOperationalBucket(quiz: TeacherQuiz): OperationalBucket {
    if (quiz.deliveryMode === 'SELF_PACED' || quiz.assignmentScope === 'COURSE') {
      return 'COURSE';
    }

    if (quiz.assignmentScope === 'CLASS') {
      return 'CLASSROOM';
    }

    return 'UNASSIGNED';
  }

  private sortQuizzes(quizzes: TeacherQuiz[]): TeacherQuiz[] {
    return [...quizzes].sort((left, right) => {
      const rightTime = Date.parse(right.updatedAt || right.createdAt || '') || 0;
      const leftTime = Date.parse(left.updatedAt || left.createdAt || '') || 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return (left.title || '').localeCompare(right.title || '', 'vi');
    });
  }
}
