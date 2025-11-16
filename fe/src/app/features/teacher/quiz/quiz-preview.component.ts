import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { QuizApi } from '../../../api/endpoints/quiz.api';

interface QuizPreviewQuestion {
  id: string;
  content: string;
  questionNumber: number;
  options: {
    key: string;
    content: string;
  }[];
  selectedAnswer?: string;
}

interface QuizPreviewData {
  id: string;
  title: string;
  description?: string;
  timeLimitMinutes?: number;
  totalQuestions: number;
  questions: QuizPreviewQuestion[];
}

@Component({
  selector: 'app-quiz-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-4xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button (click)="goBack()" 
                      class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </button>
              <div>
                <h1 class="text-xl font-semibold text-gray-900">{{ quizData()?.title || 'Bài kiểm tra' }}</h1>
                <p class="text-sm text-gray-600">Xem trước giao diện học sinh</p>
              </div>
            </div>
            
            @if (quizData()?.timeLimitMinutes) {
              <div class="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-sm font-medium">{{ quizData()?.timeLimitMinutes }} phút</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Quiz Content -->
      @if (quizData()) {
        <div class="max-w-4xl mx-auto px-4 py-6">
          <!-- Quiz Info -->
          <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">Thông tin bài kiểm tra</h2>
              <span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                {{ quizData()?.totalQuestions }} câu hỏi
              </span>
            </div>
            
            @if (quizData()?.description) {
              <p class="text-gray-600 mb-4">{{ quizData()?.description }}</p>
            }
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-gray-600">Trắc nghiệm</span>
              </div>
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-600">
                  {{ quizData()?.timeLimitMinutes ? quizData()?.timeLimitMinutes + ' phút' : 'Không giới hạn thời gian' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 002 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 2a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-600">{{ quizData()?.totalQuestions }} câu hỏi</span>
              </div>
            </div>
          </div>

          <!-- Questions -->
          <div class="space-y-6">
            @for (question of quizData()?.questions || []; track question.id) {
              <div class="bg-white rounded-lg shadow-sm border p-6">
                <!-- Question Header -->
                <div class="flex items-start gap-4 mb-6">
                  <div class="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                    {{ question.questionNumber }}
                  </div>
                  <div class="flex-1">
                    <h3 class="text-lg font-medium text-gray-900 leading-relaxed">{{ question.content }}</h3>
                  </div>
                </div>

                <!-- Options -->
                <div class="ml-12 space-y-3">
                  @for (option of question.options; track option.key) {
                    <label class="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group"
                           [class.border-blue-500]="question.selectedAnswer === option.key"
                           [class.bg-blue-50]="question.selectedAnswer === option.key">
                      <input type="radio" 
                             [name]="'question-' + question.id"
                             [value]="option.key"
                             [checked]="question.selectedAnswer === option.key"
                             (change)="selectAnswer(question.id, option.key)"
                             class="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                      <div class="flex-1">
                        <div class="flex items-center gap-3">
                          <span class="font-medium text-gray-900 bg-gray-100 group-hover:bg-gray-200 px-2 py-1 rounded text-sm">
                            {{ option.key }}
                          </span>
                          <span class="text-gray-700">{{ option.content }}</span>
                        </div>
                      </div>
                    </label>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Bottom Actions -->
          <div class="bg-white rounded-lg shadow-sm border p-6 mt-8">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-600">
                <span class="font-medium">{{ getAnsweredCount() }}/{{ quizData()?.totalQuestions }}</span> câu đã trả lời
              </div>
              <div class="flex gap-3">
                <button (click)="goBack()" 
                        class="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Quay lại
                </button>
                <button (click)="submitPreview()" 
                        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Xem kết quả (Demo)
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (!quizData()) {
        <div class="max-w-4xl mx-auto px-4 py-12">
          <div class="text-center">
            <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không tìm thấy bài kiểm tra</h3>
            <p class="text-gray-600 mb-4">Bài kiểm tra này có thể đã bị xóa hoặc bạn không có quyền truy cập.</p>
            <button (click)="goBack()" 
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Quay lại
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Custom scrollbar */
    :host {
      display: block;
    }
    
    /* Radio button styling */
    input[type="radio"]:checked + div .bg-gray-100 {
      @apply bg-blue-100 text-blue-700;
    }
  `]
})
export class QuizPreviewComponent implements OnInit {
  quizData = signal<QuizPreviewData | null>(null);
  isLoading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizApi: QuizApi
  ) {}

  ngOnInit() {
    this.loadQuizPreview();
  }

  private async loadQuizPreview() {
    try {
      const lessonId = this.route.snapshot.paramMap.get('lessonId');
      if (!lessonId) {
        this.router.navigate(['/teacher/courses']);
        return;
      }

      // Load quiz data
      const [quizResponse, questionsResponse] = await Promise.all([
        firstValueFrom(this.quizApi.getQuizByLessonId(lessonId)),
        firstValueFrom(this.quizApi.getQuizQuestions(lessonId))
      ]);

      const quiz = quizResponse as any;
      const questions = Array.isArray(questionsResponse) ? questionsResponse : (questionsResponse as any).data || [];

      // Transform questions for preview (no correct answers)
      const previewQuestions: QuizPreviewQuestion[] = questions.map((q: any, index: number) => ({
        id: q.id,
        content: q.content,
        questionNumber: index + 1,
        options: q.options
          ?.sort((a: any, b: any) => a.displayOrder - b.displayOrder)
          ?.map((opt: any) => ({
            key: opt.optionKey,
            content: opt.content
          })) || [],
        selectedAnswer: undefined
      }));

      this.quizData.set({
        id: quiz.id,
        title: quiz.lesson?.title || 'Bài kiểm tra',
        description: quiz.description,
        timeLimitMinutes: quiz.timeLimitMinutes,
        totalQuestions: previewQuestions.length,
        questions: previewQuestions
      });

    } catch (error) {
      console.error('Error loading quiz preview:', error);
      this.quizData.set(null);
    }
  }

  selectAnswer(questionId: string, optionKey: string) {
    const currentData = this.quizData();
    if (!currentData) return;

    const updatedQuestions = currentData.questions.map(q => 
      q.id === questionId ? { ...q, selectedAnswer: optionKey } : q
    );

    this.quizData.set({
      ...currentData,
      questions: updatedQuestions
    });
  }

  getAnsweredCount(): number {
    return this.quizData()?.questions?.filter(q => q.selectedAnswer)?.length || 0;
  }

  submitPreview() {
    const answeredCount = this.getAnsweredCount();
    const totalCount = this.quizData()?.totalQuestions || 0;
    
    alert(`Demo: Đã trả lời ${answeredCount}/${totalCount} câu hỏi.\n\nTrong thực tế, đây sẽ là màn hình kết quả bài kiểm tra.`);
  }

  goBack() {
    this.router.navigate(['/teacher/courses']);
  }
}