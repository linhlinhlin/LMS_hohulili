import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizApi, CreateAssignmentQuizRequest } from '../../../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../../../api/endpoints/question.api';
import { CourseApi } from '../../../../../api/client/course.api';
import { QuizFormComponent, QuizFormConfig, QuizFormData } from '../../components/quiz-form/quiz-form.component';

@Component({
    selector: 'app-assignment-quiz-create',
    standalone: true,
    imports: [CommonModule, QuizFormComponent],
    template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Tạo bài tập về nhà</h2>
        <p class="text-gray-600" *ngIf="courseTitle()">Khóa học: {{ courseTitle() }}</p>
      </div>
      
      <div *ngIf="isLoading()" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>

      <app-quiz-form
        *ngIf="!isLoading()"
        [config]="formConfig"
        [questions]="questions()"
        (onSubmit)="handleSubmit($event)"
        (onCancel)="handleCancel()">
      </app-quiz-form>
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

        // 1. Get Course Details
        this.courseApi.getCourseById(courseId).subscribe({
            next: (response: any) => {
                if (response.success && response.data) {
                    this.courseTitle.set(response.data.title);
                }
            },
            error: (err: any) => console.error('Failed to load course:', err)
        });

        // 2. Load Questions (My Questions)
        // Ideally we should filter by course, but for now load all teacher's questions
        // Ideally we should filter by course, but for now load all teacher's questions
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
            publishImmediately: formData.publishImmediately
        };

        this.quizApi.createAssignmentQuizV2(this.courseId(), request)
            .subscribe({
                next: (response: any) => {
                    // Prompt to assign now
                    if (confirm('Bài tập đã được tạo thành công! Bạn có muốn giao bài cho học viên ngay bây giờ không?')) {
                        // Navigate to assign page (we need to implement this route/component later)
                        // For now, let's assume the route is /teacher/quiz/assignments/:quizId/assign
                        this.router.navigate(['/teacher/quiz/assignments', response.data.id, 'assign']);
                    } else {
                        // Navigate back to course
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

