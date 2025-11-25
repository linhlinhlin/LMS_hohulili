import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizApi, CreateLessonQuizRequest } from '../../../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../../../api/endpoints/question.api';
import { LessonApi } from '../../../../../api/client/lesson.api';
import { QuizFormComponent, QuizFormConfig, QuizFormData } from '../../components/quiz-form/quiz-form.component';

@Component({
    selector: 'app-lesson-quiz-create',
    standalone: true,
    imports: [CommonModule, QuizFormComponent],
    template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Tạo bài trắc nghiệm cho bài học</h2>
        <p class="text-gray-600" *ngIf="lessonTitle()">Bài học: {{ lessonTitle() }}</p>
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
export class LessonQuizCreateComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private quizApi = inject(QuizApi);
    private questionApi = inject(QuestionApi);
    private lessonApi = inject(LessonApi);

    lessonId = signal<string>('');
    lessonTitle = signal<string>('');
    questions = signal<Question[]>([]);
    isLoading = signal<boolean>(true);

    formConfig: QuizFormConfig = {
        showDates: false, // Lesson quiz doesn't need dates
        defaults: {
            maxAttempts: 1,
            passingScore: 60,
            shuffleQuestions: false,
            shuffleOptions: false,
            showResultsImmediately: true,
            showCorrectAnswers: false,
            publishImmediately: false
        }
    };

    ngOnInit() {
        this.route.params.subscribe(params => {
            const id = params['lessonId'];
            if (id) {
                this.lessonId.set(id);
                this.loadData(id);
            }
        });
    }

    private loadData(lessonId: string) {
        this.isLoading.set(true);

        // 1. Get Lesson Details
        this.lessonApi.getLessonById(lessonId).subscribe({
            next: (response: any) => {
                if (response.success && response.data) {
                    this.lessonTitle.set(response.data.title);
                }
            },
            error: (err: any) => console.error('Failed to load lesson:', err)
        });

        // 2. Load Questions (My Questions)
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
        const request: CreateLessonQuizRequest = {
            title: formData.title,
            description: formData.description,
            timeLimitMinutes: formData.timeLimitMinutes,
            maxAttempts: formData.maxAttempts,
            passingScore: formData.passingScore,
            shuffleQuestions: formData.shuffleQuestions,
            shuffleOptions: formData.shuffleOptions,
            showResultsImmediately: formData.showResultsImmediately,
            showCorrectAnswers: formData.showCorrectAnswers,
            questionIds: formData.questionIds,
            publishImmediately: formData.publishImmediately
        };

        this.quizApi.createLessonQuizV2(this.lessonId(), request)
            .subscribe({
                next: (response: any) => {
                    // Success - redirect to lesson detail or quiz preview
                    // Assuming we go back to lesson detail for now
                    // We might need to navigate to course content page
                    // For now, let's navigate back
                    this.handleCancel();
                },
                error: (error: any) => {
                    console.error('Failed to create lesson quiz:', error);
                    alert('Có lỗi xảy ra khi tạo bài kiểm tra. Vui lòng thử lại.');
                }
            });
    }

    handleCancel() {
        // Navigate back to previous page or lesson detail
        // Since we don't have exact previous URL, we can use Location.back() or navigate to a known route
        // For safety, let's try to navigate to course/lesson context if possible, 
        // but simply history.back() is often best for "Cancel"
        window.history.back();
    }
}
