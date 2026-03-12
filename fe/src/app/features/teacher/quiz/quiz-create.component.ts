import { Component, signal, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { QuizApi, CreateAssignmentQuizRequest } from '../../../api/endpoints/quiz.api';
import { CourseApi } from '../../../api/client/course.api';
import { CourseContentChapter, CourseSummary } from '../../../api/types/course.types';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quiz-create',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './quiz-create.component.html',
})
export class QuizCreateComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private questionApi = inject(QuestionApi);
  private quizApi = inject(QuizApi);
  private courseApi = inject(CourseApi);
  private toast = inject(ToastService);

  currentStep = signal<number>(1);
  courses = signal<CourseSummary[]>([]); // Updated type
  sections = signal<Array<{ id: string; title: string }>>([]);
  questions = signal<Question[]>([]);
  filteredQuestions = signal<Question[]>([]);
  searchTerm = '';
  showErrors = false;
  isPublishing = false;

  quizForm = {
    courseId: '',
    sectionId: '',
    title: '',
    description: '',
    timeLimit: 60,
    passingScore: 60,
    maxAttempts: 3,
    shuffleQuestions: true,
    shuffleOptions: false,
    showResultsImmediately: true,
    showCorrectAnswers: false,
    selectedQuestions: [] as string[]
  };

  async ngOnInit() {
    await this.loadCourses();
    await this.loadQuestions();
  }

  async loadCourses() {
    try {
      // Load all teacher's courses
      this.courseApi.myCourses().subscribe({
        next: (res: any) => {
          const courseList = Array.isArray(res) ? res : (res.data || []);
          this.courses.set(courseList);
        },
        error: () => { this.toast.error('Không thể tải danh sách khóa học. Vui lòng thử lại.'); }
      });
    } catch {
    }
  }

  onCourseChange(courseId: string) {
    this.quizForm.sectionId = '';
    this.sections.set([]);
    if (!courseId) {
      return;
    }
    this.courseApi.getCourseContent(courseId).subscribe({
      next: (response: any) => {
        const chapters: CourseContentChapter[] = response?.data ?? response ?? [];
        this.sections.set(chapters.map(chapter => ({
          id: chapter.id,
          title: chapter.title
        })));
      },
      error: () => {
        this.sections.set([]);
        this.toast.error('Không thể tải danh sách chương của khóa học.');
      }
    });
  }

  async loadQuestions() {
    try {
      const questionsRes = await firstValueFrom(this.questionApi.getMyQuestions());
      if (questionsRes) {
        this.questions.set(questionsRes);
        this.filteredQuestions.set(questionsRes);
      }
    } catch {
      this.toast.error('Không thể tải danh sách câu hỏi. Vui lòng thử lại sau.');
    }
  }

  filterQuestions() {
    if (!this.searchTerm) {
      this.filteredQuestions.set(this.questions());
      return;
    }
    const term = this.searchTerm.toLowerCase();
    const filtered = this.questions().filter(q =>
      q.content.toLowerCase().includes(term) ||
      (q.tags && q.tags.toLowerCase().includes(term))
    );
    this.filteredQuestions.set(filtered);
  }

  toggleQuestion(questionId: string) {
    const index = this.quizForm.selectedQuestions.indexOf(questionId);
    if (index > -1) {
      this.quizForm.selectedQuestions.splice(index, 1);
    } else {
      this.quizForm.selectedQuestions.push(questionId);
    }
  }

  isQuestionSelected(questionId: string): boolean {
    return this.quizForm.selectedQuestions.includes(questionId);
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return difficulty;
    }
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1: return 'Thông tin chung';
      case 2: return 'Chọn câu hỏi';
      case 3: return 'Xem lại và xuất bản';
      default: return '';
    }
  }

  getSelectedCourseTitle(): string {
    const c = this.courses().find(c => c.id === this.quizForm.courseId);
    return c ? c.title : 'Chưa chọn';
  }

  getSelectedSectionTitle(): string {
    const section = this.sections().find(item => item.id === this.quizForm.sectionId);
    return section ? section.title : 'Chưa chọn';
  }

  handleNext() {
    // Validate Step 1
    if (this.currentStep() === 1) {
      this.showErrors = true;
      if (!this.quizForm.courseId || !this.quizForm.sectionId || !this.quizForm.title) {
        return;
      }
    }

    // Validate Step 2
    if (this.currentStep() === 2) {
      if (this.quizForm.selectedQuestions.length === 0) {
        this.toast.warning('Vui lòng chọn ít nhất 1 câu hỏi.');
        return;
      }
    }

    if (this.currentStep() < 3) {
      this.currentStep.set(this.currentStep() + 1);
      this.showErrors = false;
    } else {
      // Publish quiz
      this.publishQuiz();
    }
  }

  handleCancel() {
    if (this.currentStep() === 1) {
      this.router.navigate(['/teacher/assessments/classes/quizzes']);
    } else {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  async publishQuiz() {
    if (this.isPublishing) return;
    this.isPublishing = true;

    try {
      const request: CreateAssignmentQuizRequest = {
        title: this.quizForm.title,
        description: this.quizForm.description,
        timeLimitMinutes: this.quizForm.timeLimit,
        maxAttempts: this.quizForm.maxAttempts,
        passingScore: this.quizForm.passingScore,
        shuffleQuestions: this.quizForm.shuffleQuestions,
        shuffleOptions: this.quizForm.shuffleOptions,
        showResultsImmediately: this.quizForm.showResultsImmediately,
        showCorrectAnswers: this.quizForm.showCorrectAnswers,
        chapterId: this.quizForm.sectionId,
        questionIds: this.quizForm.selectedQuestions,
        publishImmediately: true
      };

      await firstValueFrom(this.quizApi.createCourseQuizV3(this.quizForm.courseId, request));

      this.toast.success('Tạo bài kiểm tra thành công!');
      // Navigate to assessment list
      this.router.navigate(['/teacher/assessments/classes/quizzes']);
    } catch (error: any) {
      this.toast.error('Lỗi khi tạo bài kiểm tra: ' + (error?.message || 'Không xác định'));
    } finally {
      this.isPublishing = false;
    }
  }
}
