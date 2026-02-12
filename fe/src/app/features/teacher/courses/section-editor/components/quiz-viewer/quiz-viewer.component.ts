import { Component, inject, output , ChangeDetectionStrategy } from '@angular/core';

import { SectionEditorState, LessonItem, QuizQuestion } from '../../state/section-editor.state';

@Component({
  selector: 'app-quiz-viewer',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="space-y-6">
      <!-- Quiz Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Thông tin bài trắc nghiệm</h3>
        <button (click)="previewQuiz.emit()"
                class="px-4 py-2 bg-[#0056D2] text-white text-sm rounded hover:bg-[#004BB5] transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Xem trước Quiz
        </button>
      </div>

      <!-- Quiz Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Thời gian</p>
              <p class="text-2xl font-bold text-[#0056D2] mt-1">{{ lesson()?.quizTimeLimit || 30 }}</p>
              <p class="text-xs text-gray-400">phút</p>
            </div>
            <div class="w-10 h-10 bg-[#0056D2]/5 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-[#0056D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Điểm đạt</p>
              <p class="text-2xl font-bold text-green-600 mt-1">{{ lesson()?.quizMaxScore || 60 }}%</p>
              <p class="text-xs text-gray-400">tối thiểu</p>
            </div>
            <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Số lần làm</p>
              <p class="text-2xl font-bold text-orange-600 mt-1">{{ lesson()?.quizMaxAttempts || 1 }}</p>
              <p class="text-xs text-gray-400">lần tối đa</p>
            </div>
            <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">Câu hỏi</p>
              <p class="text-2xl font-bold text-purple-600 mt-1">{{ state.quizQuestions().length }}</p>
              <p class="text-xs text-gray-400">câu</p>
            </div>
            <div class="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Questions Section -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <span class="font-medium text-gray-900">Danh sách câu hỏi</span>
            <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{{ state.quizQuestions().length }} câu</span>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="refreshQuestions.emit()"
                    class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Làm mới">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
            <button (click)="addQuestions.emit()"
                    class="px-4 py-2 bg-[#0056D2] text-white text-sm rounded hover:bg-[#004BB5] transition-colors flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Thêm câu hỏi
            </button>
          </div>
        </div>

        <!-- Loading -->
        @if (state.quizQuestionsLoading()) {
          <div class="p-8 text-center">
            <div class="animate-spin w-8 h-8 border-4 border-[#0056D2] border-t-transparent rounded-full mx-auto mb-3"></div>
            <p class="text-gray-500">Đang tải câu hỏi...</p>
          </div>
        }

        <!-- Empty State -->
        @if (!state.quizQuestionsLoading() && state.quizQuestions().length === 0) {
          <div class="p-8">
            <div class="text-center">
              <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h4 class="text-lg font-medium text-gray-900 mb-1">Chưa có câu hỏi</h4>
              <p class="text-gray-500 text-sm mb-4">Thêm câu hỏi từ ngân hàng câu hỏi để bắt đầu</p>
              <button (click)="addQuestions.emit()"
                      class="px-4 py-2 bg-[#0056D2] text-white text-sm rounded-lg hover:bg-[#004BB5] transition-colors inline-flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Thêm câu hỏi
              </button>
            </div>
          </div>
        }

        <!-- Questions List -->
        @if (!state.quizQuestionsLoading() && state.quizQuestions().length > 0) {
          <div class="divide-y divide-gray-100">
            @for (q of state.quizQuestions(); track q.id; let i = $index) {
              <div class="p-4 hover:bg-gray-50 transition-colors">
                <div class="flex items-start gap-4">
                  <!-- Number Badge -->
                  <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0056D2]/10 text-[#004BB5] flex items-center justify-center font-semibold text-sm">
                    {{ i + 1 }}
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <p class="text-gray-900 mb-3">{{ q.content }}</p>

                    <!-- Options Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                      @for (opt of q.options; track opt.key || opt.optionKey) {
                        <div class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                             [class.bg-green-50]="(opt.key || opt.optionKey) === q.correctOption"
                             [class.border-green-200]="(opt.key || opt.optionKey) === q.correctOption"
                             [class.border]="(opt.key || opt.optionKey) === q.correctOption"
                             [class.text-green-800]="(opt.key || opt.optionKey) === q.correctOption"
                             [class.bg-gray-50]="(opt.key || opt.optionKey) !== q.correctOption"
                             [class.text-gray-700]="(opt.key || opt.optionKey) !== q.correctOption">
                          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                                [class.bg-green-200]="(opt.key || opt.optionKey) === q.correctOption"
                                [class.text-green-800]="(opt.key || opt.optionKey) === q.correctOption"
                                [class.bg-gray-200]="(opt.key || opt.optionKey) !== q.correctOption"
                                [class.text-gray-600]="(opt.key || opt.optionKey) !== q.correctOption">
                            {{ opt.key || opt.optionKey }}
                          </span>
                          <span class="flex-1">{{ opt.content }}</span>
                          @if ((opt.key || opt.optionKey) === q.correctOption) {
                            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                          }
                        </div>
                      }
                    </div>

                    <!-- Meta Tags -->
                    <div class="flex items-center gap-3 mt-3">
                      <span class="px-2 py-1 rounded-full text-xs font-medium"
                            [class.bg-green-100]="q.difficulty === 'EASY'"
                            [class.text-green-700]="q.difficulty === 'EASY'"
                            [class.bg-yellow-100]="q.difficulty === 'MEDIUM'"
                            [class.text-yellow-700]="q.difficulty === 'MEDIUM'"
                            [class.bg-red-100]="q.difficulty === 'HARD'"
                            [class.text-red-700]="q.difficulty === 'HARD'">
                        {{ getDifficultyLabel(q.difficulty) }}
                      </span>
                      @if (q.tags) {
                        <span class="text-xs text-gray-500">{{ q.tags }}</span>
                      }
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex-shrink-0 flex items-center gap-1">
                    <button (click)="removeQuestion.emit(q.id)"
                            class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa khỏi quiz">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class QuizViewerComponent {
  readonly state = inject(SectionEditorState);

  previewQuiz = output<void>();
  refreshQuestions = output<void>();
  addQuestions = output<void>();
  removeQuestion = output<string>();

  lesson = () => this.state.selected();

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return difficulty;
    }
  }
}
