import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { QuizApi, CreateAssignmentQuizRequest } from '../../../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../../../api/endpoints/question.api';
import { CourseApi, ClassSummary } from '../../../../../api/client/course.api';
import { QuizFormComponent, QuizFormConfig, QuizFormData } from '../../components/quiz-form/quiz-form.component';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-assignment-quiz-create',
    imports: [FormsModule, QuizFormComponent, IconComponent],
    template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Tạo bài tập về nhà</h2>
        @if (courseTitle()) {
          <p class="text-gray-600">Khóa học: {{ courseTitle() }}</p>
        }
      </div>
    
      @if (isLoading()) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }
    
      @if (!isLoading()) {
        <!-- Scope Selection -->
        <div class="bg-white p-6 rounded-lg shadow-sm mb-6 border border-gray-100">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Phạm vi giao bài</h3>
          <div class="flex gap-6 mb-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="scope" [value]="'COURSE'" [checked]="scope() === 'COURSE'" (change)="scope.set('COURSE')" class="w-4 h-4 text-[#0056D2]">
              <span>Toàn bộ khóa học</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="scope" [value]="'CLASS'" [checked]="scope() === 'CLASS'" (change)="scope.set('CLASS')" class="w-4 h-4 text-[#0056D2]">
              <span>Lớp học cụ thể</span>
            </label>
          </div>
          <!-- Class Selector -->
          @if (scope() === 'CLASS') {
            <div class="animate-fade-in">
              <label class="block text-sm font-medium text-gray-700 mb-1">Chọn lớp học</label>
              <select
                [value]="selectedClassId()"
                (change)="selectedClassId.set($any($event.target).value)"
                class="w-full md:w-1/2 px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-[#0056D2] focus:ring-[#0056D2] bg-white"
                >
                <option value="" disabled>-- Chọn lớp --</option>
                @for (cls of classes(); track cls) {
                  <option [value]="cls.id">
                    {{ cls.name }} (Code: {{ cls.code }})
                  </option>
                }
              </select>
              @if (classes().length === 0) {
                <p class="text-orange-500 text-sm mt-2">
                  <app-icon name="alert" size="sm" class="text-yellow-500"/> Khóa học này chưa có lớp nào đang hoạt động.
                </p>
              }
            </div>
          }
        </div>
        <app-quiz-form
          [config]="formConfig"
          [questions]="questions()"
          (onSubmit)="handleSubmit($event)"
          (onCancel)="handleCancel()">
        </app-quiz-form>
      }
    </div>
    `
})
export class AssignmentQuizCreateComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private quizApi = inject(QuizApi);
    private questionApi = inject(QuestionApi);
    private courseApi = inject(CourseApi);
    private toast = inject(ToastService);
    private confirmDialog = inject(ConfirmDialogService);

    courseId = signal<string>('');
    courseTitle = signal<string>('');
    questions = signal<Question[]>([]);
    isLoading = signal<boolean>(true);

    // Scope Logic
    scope = signal<'COURSE' | 'CLASS'>('COURSE');
    classes = signal<ClassSummary[]>([]);
    selectedClassId = signal<string>('');

    formConfig: QuizFormConfig = {
        showDates: true, // Assignment needs dates
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
        this.route.params.pipe(take(1)).subscribe(params => {
            const id = params['courseId'];
            if (id) {
                this.courseId.set(id);
                this.loadData(id);
            }
        });
    }

    private loadData(courseId: string) {
        this.isLoading.set(true);

        // Parallel Loading
        // 1. Course Details for Title
        // 2. Questions
        // 3. Classes (for Scope)

        // 1. Get Course & Classes
        this.courseApi.getCourseById(courseId).subscribe({
            next: (response: any) => {
                if (response.success && response.data) {
                    this.courseTitle.set(response.data.title);
                }
            },
            error: () => { /* Course title is supplementary */ }
        });

        // Load Classes
        this.courseApi.getAvailableClasses(courseId).subscribe({
            next: (res: any) => {
                this.classes.set(res.data || []);
            },
            error: () => { /* Classes are optional for quiz scope */ }
        });

        // 2. Load Questions (My Questions)
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

    async handleSubmit(formData: QuizFormData) {
        // Validation
        if (this.scope() === 'CLASS' && !this.selectedClassId()) {
            this.toast.warning('Vui lòng chọn lớp học!');
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
            questionIds: formData.questionIds,
            publishImmediately: formData.publishImmediately,
            // Class ID (Optional)
            classId: this.scope() === 'CLASS' ? this.selectedClassId() : undefined
        };

        this.quizApi.createAssignmentQuizV3(this.courseId(), request)
            .subscribe({
                next: async (response: any) => {
                    const msg = this.scope() === 'CLASS'
                        ? 'Bài tập cho lớp đã được tạo thành công!'
                        : 'Bài tập khóa học đã được tạo thành công!';

                    const confirmed = await this.confirmDialog.confirm({
                        title: 'Tạo bài tập thành công',
                        message: msg + ' Bạn có muốn giao bài ngay bây giờ không?',
                        variant: 'info',
                        confirmText: 'Giao bài ngay',
                        cancelText: 'Để sau'
                    });
                    if (confirmed) {
                        this.router.navigate(['/teacher/quiz/assignments', response.data.id, 'assign']);
                    } else {
                        this.handleCancel();
                    }
                },
                error: () => {
                    this.toast.error('Có lỗi xảy ra khi tạo bài tập. Vui lòng thử lại.');
                }
            });
    }

    handleCancel() {
        this.router.navigate(['/teacher/courses', this.courseId()]);
    }
}
