import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizApi, CreateAssignmentQuizRequest } from '../../../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../../../api/endpoints/question.api';
import { CourseApi, ClassSummary } from '../../../../../api/client/course.api';
import { QuizFormComponent, QuizFormConfig, QuizFormData } from '../../components/quiz-form/quiz-form.component';

@Component({
    selector: 'app-assignment-quiz-create',
    standalone: true,
    imports: [CommonModule, FormsModule, QuizFormComponent],
    template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Tạo bài tập về nhà</h2>
        <p class="text-gray-600" *ngIf="courseTitle()">Khóa học: {{ courseTitle() }}</p>
      </div>
      
      <div *ngIf="isLoading()" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>

      <ng-container *ngIf="!isLoading()">
          <!-- Scope Selection -->
          <div class="bg-white p-6 rounded-lg shadow-sm mb-6 border border-gray-100">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Phạm vi giao bài</h3>
            
            <div class="flex gap-6 mb-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="scope" [value]="'COURSE'" [checked]="scope() === 'COURSE'" (change)="scope.set('COURSE')" class="w-4 h-4 text-blue-600">
                <span>Toàn bộ khóa học</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="scope" [value]="'CLASS'" [checked]="scope() === 'CLASS'" (change)="scope.set('CLASS')" class="w-4 h-4 text-blue-600">
                <span>Lớp học cụ thể</span>
              </label>
            </div>

            <!-- Class Selector -->
            <div *ngIf="scope() === 'CLASS'" class="animate-fade-in">
               <label class="block text-sm font-medium text-gray-700 mb-1">Chọn lớp học</label>
               <select 
                 [value]="selectedClassId()"
                 (change)="selectedClassId.set($any($event.target).value)" 
                 class="w-full md:w-1/2 px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                >
                 <option value="" disabled>-- Chọn lớp --</option>
                 <option *ngFor="let cls of classes()" [value]="cls.id">
                   {{ cls.name }} (Code: {{ cls.code }})
                 </option>
               </select>
               <p *ngIf="classes().length === 0" class="text-orange-500 text-sm mt-2">
                 ⚠️ Khóa học này chưa có lớp nào đang hoạt động.
               </p>
            </div>
          </div>

          <app-quiz-form
            [config]="formConfig"
            [questions]="questions()"
            (onSubmit)="handleSubmit($event)"
            (onCancel)="handleCancel()">
          </app-quiz-form>
      </ng-container>
    </div>
  `
})
export class AssignmentQuizCreateComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private quizApi = inject(QuizApi);
    private questionApi = inject(QuestionApi);
    private courseApi = inject(CourseApi);

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
        this.route.params.subscribe(params => {
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
            error: (err: any) => console.error('Failed to load course:', err)
        });

        // Load Classes
        this.courseApi.getAvailableClasses(courseId).subscribe({
            next: (res: any) => {
                this.classes.set(res.data || []);
            },
            error: (err) => console.error('Failed to load classes', err)
        });

        // 2. Load Questions (My Questions)
        this.questionApi.getMyQuestions().subscribe({
            next: (questions: Question[]) => {
                this.questions.set(questions);
                this.isLoading.set(false);
            },
            error: (err: any) => {
                console.error('Failed to load questions:', err);
                this.isLoading.set(false);
            }
        });
    }

    handleSubmit(formData: QuizFormData) {
        // Validation
        if (this.scope() === 'CLASS' && !this.selectedClassId()) {
            alert('Vui lòng chọn lớp học!');
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

        this.quizApi.createAssignmentQuizV2(this.courseId(), request)
            .subscribe({
                next: (response: any) => {
                    const msg = this.scope() === 'CLASS'
                        ? 'Bài tập cho lớp đã được tạo thành công!'
                        : 'Bài tập khóa học đã được tạo thành công!';

                    if (confirm(msg + ' Bạn có muốn giao bài ngay bây giờ không?')) {
                        this.router.navigate(['/teacher/quiz/assignments', response.data.id, 'assign']);
                    } else {
                        this.handleCancel();
                    }
                },
                error: (error: any) => {
                    console.error('Failed to create assignment quiz:', error);
                    alert('Có lỗi xảy ra khi tạo bài tập. Vui lòng thử lại.');
                }
            });
    }

    handleCancel() {
        this.router.navigate(['/teacher/courses', this.courseId()]);
    }
}
