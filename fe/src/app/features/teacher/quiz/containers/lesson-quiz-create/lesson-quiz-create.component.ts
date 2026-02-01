import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizApi, CreateLessonQuizRequest } from '../../../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../../../api/endpoints/question.api';
import { LessonApi } from '../../../../../api/client/lesson.api';
import { PackageApi } from '../../../../../api/endpoints/package.api';
import { QuizFormComponent, QuizFormConfig, QuizFormData } from '../../components/quiz-form/quiz-form.component';
import { QuestionCreateComponent } from '../../question-create.component';

@Component({
    selector: 'app-lesson-quiz-create',
    standalone: true,
    imports: [CommonModule, QuizFormComponent, QuestionCreateComponent],
    template: `
    <div class="w-full h-full px-2 py-2 custom-scrollbar overflow-y-auto relative">
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
        [packages]="packages()"
        (onSubmit)="handleSubmit($event)"
        (onCancel)="handleCancel()"
        (onPackageSelect)="handlePackageSelected($event)"
        (onUseMyQuestions)="handleUseMyQuestions()"
        (onRequestCreateQuestion)="handleRequestCreateQuestion()">
      </app-quiz-form>

      <!-- Create Question Modal Overlay -->
      <div *ngIf="showCreateQuestionModal()" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <!-- Background overlay -->
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
               <app-question-create 
                  [isDialog]="true"
                  (created)="handleQuestionCreated($event)"
                  (cancel)="handleCreateCancel()">
               </app-question-create>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LessonQuizCreateComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private quizApi = inject(QuizApi);
    private questionApi = inject(QuestionApi);
    private lessonApi = inject(LessonApi);
    private packageApi = inject(PackageApi);

    @ViewChild(QuizFormComponent) quizFormComponent!: QuizFormComponent;

    lessonId = signal<string>('');
    lessonTitle = signal<string>('');

    // Data state
    myQuestions = signal<Question[]>([]); // Cache for "My Questions"
    questions = signal<Question[]>([]);   // Currently displayed questions
    packages = signal<any[]>([]);         // Available packages

    isLoading = signal<boolean>(true);
    showCreateQuestionModal = signal(false);

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

    sectionId = signal<string | null>(null);

    ngOnInit() {
        this.route.params.subscribe(params => {
            console.log('🔍 LessonQuizCreateComponent Params:', params);

            const sectionIdParam = params['sectionId'];
            const lessonIdParam = params['lessonId'];

            if (sectionIdParam) {
                console.log('✅ Found Section ID:', sectionIdParam);
                this.sectionId.set(sectionIdParam);
                // Update: If we have Section ID, we must also stop loading and fetch questions
                // Since we don't have separate loadSectionData yet, we just open the form
                this.isLoading.set(false);
                this.loadQuestionsInBackground();
            }

            if (lessonIdParam) {
                console.log('✅ Found Lesson ID:', lessonIdParam);
                this.lessonId.set(lessonIdParam);
                this.loadData(lessonIdParam);
            }
        });
    }

    private loadData(lessonId: string) {
        this.isLoading.set(true);

        const apiCalls: any = {};

        // Only fetch lesson details if we need them (legacy mode or title display)
        if (lessonId) {
            apiCalls.lesson = this.lessonApi.getLessonById(lessonId);
        }

        // OPTIMIZATION: Do NOT load all questions upfront. 
        // Only load if explicitly needed or paginated. 
        // For now, we'll skip loading questions here to speed up transition.
        // User can click "Add Questions" to load them.

        // Combine calls
        if (Object.keys(apiCalls).length === 0) {
            this.isLoading.set(false);
            // Still try to load questions even if no lesson ID
            this.loadQuestionsInBackground();
            return;
        }

        forkJoin(apiCalls).pipe(
            finalize(() => this.isLoading.set(false))
        ).subscribe({
            next: (results: any) => {
                if (results.lesson && results.lesson.data) {
                    this.lessonTitle.set(results.lesson.data.title);
                }
                // Load questions in background after main content is ready
                this.loadQuestionsInBackground();
            },
            error: (err: any) => console.error('Error loading data:', err)
        });
    }


    private loadQuestionsInBackground() {
        // Load MY questions
        this.questionApi.getMyQuestions().subscribe({
            next: (questions: Question[]) => {
                console.log('Questions loaded in background:', questions.length);
                this.myQuestions.set(questions);
                // Also set as default display
                this.questions.set(questions);
            },
            error: (err: any) => console.error('Failed to load questions:', err)
        });

        // Load PACKAGES
        this.packageApi.getMyPackages().subscribe({
            next: (pkgs: any[]) => {
                console.log('Packages loaded:', pkgs.length);
                this.packages.set(pkgs);
            },
            error: (err: any) => console.error('Failed to load packages:', err)
        });
    }

    handlePackageSelected(packageId: string) {
        this.isLoading.set(true);
        this.packageApi.getQuestionsInPackage(packageId)
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (questions: any[]) => {
                    console.log('Package questions loaded:', questions.length);
                    // Map generic array to Question[] if needed, assuming API returns compatible format
                    this.questions.set(questions);
                },
                error: (err: any) => {
                    console.error('Failed to load package questions:', err);
                    alert('Không thể tải câu hỏi từ gói này');
                }
            });
    }

    handleUseMyQuestions() {
        this.questions.set(this.myQuestions());
    }

    handleSubmit(formData: QuizFormData) {
        console.log('🚀 Submitting Quiz Form...');
        console.log('   Section ID:', this.sectionId());
        console.log('   Lesson ID:', this.lessonId());

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

        // Check if we are creating for a Section or a Lesson
        if (this.sectionId()) {
            console.log('👉 Creating Section Quiz...');
            this.quizApi.createSectionQuiz(this.sectionId()!, request)
                .subscribe({
                    next: (response: any) => {
                        console.log('✅ Section Quiz Created!', response);
                        this.handleCancel();
                    },
                    error: (error: any) => {
                        console.error('❌ Failed to create section quiz:', error);
                        alert('Có lỗi xảy ra khi tạo bài kiểm tra. Vui lòng thử lại.');
                    }
                });
        } else {
            console.log('👉 Creating Lesson Quiz (Legacy)...');
            // Fallback to Lesson (Legacy V2)
            this.quizApi.createLessonQuizV3(this.lessonId(), request)
                .subscribe({
                    next: (response: any) => {
                        console.log('✅ Lesson Quiz Created!', response);
                        this.handleCancel();
                    },
                    error: (error: any) => {
                        console.error('❌ Failed to create lesson quiz:', error);
                        alert('Có lỗi xảy ra khi tạo bài kiểm tra. Vui lòng thử lại.');
                    }
                });
        }
    }

    handleCancel() {
        // Navigate back to previous page or lesson detail
        // Since we don't have exact previous URL, we can use Location.back() or navigate to a known route
        // For safety, let's try to navigate to course/lesson context if possible, 
        // but simply history.back() is often best for "Cancel"
        window.history.back();
    }

    handleRequestCreateQuestion() {
        this.showCreateQuestionModal.set(true);
    }

    handleCreateCancel() {
        this.showCreateQuestionModal.set(false);
    }

    handleQuestionCreated(newQuestion: any) {
        // Assuming newQuestion matches Question interface
        console.log('🎉 New question created:', newQuestion);

        // Add to My Questions
        this.myQuestions.update(current => [newQuestion, ...current]);

        // Update 'questions' list to show the new question
        this.questions.update(current => [newQuestion, ...current]);

        // Auto-select the new question via QuizFormComponent
        if (this.quizFormComponent) {
            this.quizFormComponent.selectQuestion(newQuestion.id);
        }

        this.showCreateQuestionModal.set(false);
    }
}
