import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuizApi, QuizResponse } from '../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../api/endpoints/question.api';

@Component({
  selector: 'app-quiz-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Chỉnh sửa Quiz</h1>
          <p class="text-gray-600">Cập nhật thông tin và câu hỏi của quiz</p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600">Đang tải...</span>
        </div>

        <!-- Quiz Edit Form -->
        <form *ngIf="!isLoading" [formGroup]="quizForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <!-- Current Quiz Information -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Thông tin quiz hiện tại</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">ID Quiz</label>
                <p class="text-sm text-gray-900 bg-gray-50 p-2 rounded">{{ quiz?.id }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Tổng số câu hỏi</label>
                <p class="text-sm text-gray-900 bg-gray-50 p-2 rounded">{{ selectedQuestionIds.size }} câu hỏi</p>
              </div>
            </div>
          </div>

          <!-- Update Quiz Settings -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Cài đặt quiz</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Time Limit -->
              <div>
                <label for="timeLimitMinutes" class="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian làm bài (phút)
                </label>
                <input
                  id="timeLimitMinutes"
                  type="number"
                  formControlName="timeLimitMinutes"
                  min="5"
                  max="120"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>

              <!-- Max Attempts -->
              <div>
                <label for="maxAttempts" class="block text-sm font-medium text-gray-700 mb-2">
                  Số lần làm tối đa
                </label>
                <input
                  id="maxAttempts"
                  type="number"
                  formControlName="maxAttempts"
                  min="1"
                  max="10"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>

              <!-- Passing Score -->
              <div>
                <label for="passingScore" class="block text-sm font-medium text-gray-700 mb-2">
                  Điểm đỗ (%)
                </label>
                <input
                  id="passingScore"
                  type="number"
                  formControlName="passingScore"
                  min="0"
                  max="100"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
            </div>

            <!-- Quiz Settings -->
            <div class="space-y-4 mt-4">
              <div class="flex items-center">
                <input
                  id="showCorrectAnswers"
                  type="checkbox"
                  formControlName="showCorrectAnswers"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                >
                <label for="showCorrectAnswers" class="ml-2 block text-sm text-gray-700">
                  Hiển thị đáp án đúng sau khi làm xong
                </label>
              </div>

              <div class="flex items-center">
                <input
                  id="shuffleQuestions"
                  type="checkbox"
                  formControlName="shuffleQuestions"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                >
                <label for="shuffleQuestions" class="ml-2 block text-sm text-gray-700">
                  Xáo trộn thứ tự câu hỏi
                </label>
              </div>

              <div class="flex items-center">
                <input
                  id="shuffleOptions"
                  type="checkbox"
                  formControlName="shuffleOptions"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                >
                <label for="shuffleOptions" class="ml-2 block text-sm text-gray-700">
                  Xáo trộn thứ tự đáp án
                </label>
              </div>

              <div class="flex items-center">
                <input
                  id="showResultsImmediately"
                  type="checkbox"
                  formControlName="showResultsImmediately"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                >
                <label for="showResultsImmediately" class="ml-2 block text-sm text-gray-700">
                  Hiển thị kết quả ngay lập tức
                </label>
              </div>
            </div>
          </div>

          <!-- Current Questions -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Câu hỏi hiện tại</h2>
            
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div *ngFor="let question of quizQuestions" 
                   class="flex items-center p-3 border rounded-lg bg-blue-50"
                   [class.border-blue-500]="selectedQuestionIds.has(question.id)">
                <input
                  type="checkbox"
                  [checked]="selectedQuestionIds.has(question.id)"
                  (change)="onQuestionToggle(question.id, $event)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                >
                <div class="flex-1">
                  <div class="font-medium text-gray-800">{{ question.content }}</div>
                  <div class="text-sm text-gray-500">
                    {{ question.tags }} - {{ getDifficultyText(question.difficulty) }}
                  </div>
                </div>
                <div class="text-xs text-gray-400">
                  {{ question.usageCount }} lần sử dụng
                </div>
              </div>
            </div>
          </div>

          <!-- Available Questions -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Thêm câu hỏi</h2>
            
            <!-- Search Questions -->
            <div class="mb-4">
              <input
                type="text"
                [(ngModel)]="questionSearchTerm"
                (ngModelChange)="onQuestionSearch()"
                placeholder="Tìm kiếm câu hỏi..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>

            <!-- Questions List -->
            <div class="space-y-2 max-h-96 overflow-y-auto">
              <div *ngFor="let question of filteredQuestions" 
                   class="flex items-center p-3 border rounded-lg hover:bg-gray-50"
                   [class.border-blue-500]="selectedQuestionIds.has(question.id)">
                <input
                  type="checkbox"
                  [checked]="selectedQuestionIds.has(question.id)"
                  (change)="onQuestionToggle(question.id, $event)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                >
                <div class="flex-1">
                  <div class="font-medium text-gray-800">{{ question.content }}</div>
                  <div class="text-sm text-gray-500">
                    {{ question.tags }} - {{ getDifficultyText(question.difficulty) }}
                  </div>
                </div>
                <div class="text-xs text-gray-400">
                  {{ question.usageCount }} lần sử dụng
                </div>
              </div>
            </div>
          </div>

          <!-- Selected Questions Summary -->
          <div class="bg-blue-50 rounded-lg p-4">
            <div class="text-sm text-blue-800">
              Đã chọn <span class="font-semibold">{{ selectedQuestionIds.size }}</span> câu hỏi
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-4">
            <button
              type="button"
              (click)="onCancel()"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Hủy
            </button>
            <button
              type="submit"
              [disabled]="quizForm.invalid || selectedQuestionIds.size === 0"
              class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cập nhật Quiz
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class QuizEditComponent implements OnInit {
  quizForm: FormGroup;
  isLoading = false;
  quiz: QuizResponse | null = null;
  quizQuestions: Question[] = [];
  allQuestions: Question[] = [];
  filteredQuestions: Question[] = [];
  selectedQuestionIds: Set<string> = new Set();
  questionSearchTerm = '';
  quizId: string | null = null;
  lessonId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private quizApi: QuizApi,
    private questionApi: QuestionApi
  ) {
    this.quizForm = this.fb.group({
      timeLimitMinutes: [30, [Validators.min(5), Validators.max(120)]],
      maxAttempts: [1, [Validators.min(1), Validators.max(10)]],
      passingScore: [70, [Validators.min(0), Validators.max(100)]],
      shuffleQuestions: [false],
      shuffleOptions: [false],
      showCorrectAnswers: [true],
      showResultsImmediately: [true]
    });
  }

  ngOnInit(): void {
    this.quizId = this.route.snapshot.paramMap.get('quizId');
    this.lessonId = this.route.snapshot.paramMap.get('lessonId');
    
    if (this.lessonId) {
      this.loadQuizData();
      this.loadAllQuestions();
    }
  }

  loadQuizData(): void {
    if (!this.lessonId) return;

    this.isLoading = true;
    this.quizApi.getQuizByLessonId(this.lessonId).subscribe({
      next: (quiz) => {
        this.quiz = quiz;
        this.selectedQuestionIds = new Set(quiz.questionIds.split(','));
        this.updateFormWithQuiz();
        this.loadCurrentQuestions();
      },
      error: (error) => {
        console.error('Failed to load quiz:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loadAllQuestions(): void {
    this.questionApi.getQuestions().subscribe({
      next: (questions) => {
        this.allQuestions = questions;
        this.filteredQuestions = [...questions];
      },
      error: (error) => {
        console.error('Failed to load questions:', error);
      }
    });
  }

  loadCurrentQuestions(): void {
    if (!this.lessonId) return;

    this.quizApi.getQuizQuestions(this.lessonId).subscribe({
      next: (questions) => {
        this.quizQuestions = questions;
      },
      error: (error) => {
        console.error('Failed to load quiz questions:', error);
      }
    });
  }

  updateFormWithQuiz(): void {
    if (this.quiz) {
      this.quizForm.patchValue({
        timeLimitMinutes: this.quiz.timeLimitMinutes,
        maxAttempts: this.quiz.maxAttempts,
        passingScore: this.quiz.passingScore,
        shuffleQuestions: this.quiz.shuffleQuestions,
        shuffleOptions: this.quiz.shuffleOptions,
        showCorrectAnswers: this.quiz.showCorrectAnswers,
        showResultsImmediately: this.quiz.showResultsImmediately
      });
    }
  }

  onQuestionSearch(): void {
    if (!this.questionSearchTerm.trim()) {
      this.filteredQuestions = [...this.allQuestions];
    } else {
      const term = this.questionSearchTerm.toLowerCase();
      this.filteredQuestions = this.allQuestions.filter(q => 
        q.content.toLowerCase().includes(term) ||
        q.tags.toLowerCase().includes(term)
      );
    }
  }

  isQuestionSelected(questionId: string): boolean {
    return this.selectedQuestionIds.has(questionId);
  }

  onQuestionToggle(questionId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedQuestionIds.add(questionId);
    } else {
      this.selectedQuestionIds.delete(questionId);
    }
  }

  getDifficultyText(difficulty: string): string {
    const map: { [key: string]: string } = {
      'EASY': 'Dễ',
      'MEDIUM': 'Trung bình', 
      'HARD': 'Khó'
    };
    return map[difficulty] || difficulty;
  }

  onSubmit(): void {
    if (this.quizForm.invalid || this.selectedQuestionIds.size === 0 || !this.lessonId) {
      return;
    }

    this.isLoading = true;
    const formValue = this.quizForm.value;

    // Update quiz settings
    // Note: This would require additional API endpoints to update quiz settings
    // For now, we'll focus on updating questions
    
    this.quizApi.updateQuizQuestions(this.lessonId, {
      questionIds: Array.from(this.selectedQuestionIds)
    }).subscribe({
      next: () => {
        console.log('🔍 DEBUG: Quiz updated successfully - navigation disabled for debugging');
        // DEBUG MODE: this.router.navigate(['../../quiz-bank'], { relativeTo: this.route });
      },
      error: (error) => {
        console.error('Failed to update quiz:', error);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    console.log('🔍 DEBUG: Quiz edit cancelled - navigation disabled for debugging');
    // DEBUG MODE: this.router.navigate(['../../quiz-bank'], { relativeTo: this.route });
  }
}