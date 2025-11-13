import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { CreateQuizRequest } from '../../../api/endpoints/quiz.api';

@Component({
  selector: 'app-quiz-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Tạo Quiz Mới</h1>
          <p class="text-gray-600">Tạo một bài quiz trắc nghiệm cho học sinh</p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600">Đang tải...</span>
        </div>

        <!-- Quiz Creation Form -->
        <form *ngIf="!isLoading" [formGroup]="quizForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <!-- Basic Information -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Thông tin cơ bản</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Title -->
              <div>
                <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                  Tiêu đề quiz *
                </label>
                <input
                  id="title"
                  type="text"
                  formControlName="title"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tiêu đề quiz"
                >
                <div *ngIf="quizForm.get('title')?.invalid && quizForm.get('title')?.touched"
                     class="text-red-500 text-sm mt-1">
                  Tiêu đề là bắt buộc
                </div>
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
                  placeholder="70"
                >
              </div>
            </div>
  
            <!-- Description -->
            <div class="mt-4">
              <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                id="description"
                formControlName="description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả chi tiết về quiz này"
              ></textarea>
            </div>
  
            <!-- Time Limit -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                  placeholder="30"
                >
              </div>
  
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
                  placeholder="1"
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

          <!-- Question Selection -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Chọn câu hỏi</h2>
            
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
                   [class.border-blue-500]="isQuestionSelected(question.id)">
                <input
                  type="checkbox"
                  [checked]="isQuestionSelected(question.id)"
                  (change)="onQuestionToggle(question.id, $event)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                >
                <div class="flex-1">
                  <div class="font-medium text-gray-800">{{ question.content }}</div>
                  <div class="text-sm text-gray-500">
                    {{ question.tags || 'No tags' }} - {{ getDifficultyText(question.difficulty) }}
                  </div>
                </div>
                <div class="text-xs text-gray-400">
                  {{ question.usageCount || 0 }} lần sử dụng
                </div>
              </div>
            </div>

            <!-- Selected Questions Summary -->
            <div class="mt-4 p-3 bg-blue-50 rounded-lg">
              <div class="text-sm text-blue-800">
                Đã chọn <span class="font-semibold">{{ selectedQuestionIds.size }}</span> câu hỏi
                <span class="ml-2">Tổng điểm: {{ getTotalPoints() }} điểm</span>
              </div>
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
              Tạo Quiz
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class QuizCreateComponent implements OnInit {
  quizForm: FormGroup;
  isLoading = false;
  questions: Question[] = [];
  filteredQuestions: Question[] = [];
  selectedQuestionIds: Set<string> = new Set();
  questionSearchTerm = '';
  lessonId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private quizApi: QuizApi,
    private questionApi: QuestionApi
  ) {
    this.quizForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
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
    this.lessonId = this.route.snapshot.paramMap.get('lessonId');
    this.loadQuestions();
  }

  loadQuestions(): void {
    this.isLoading = true;
    this.questionApi.getQuestions().subscribe({
      next: (questions) => {
        this.questions = questions;
        this.filteredQuestions = [...this.questions];
      },
      error: (error) => {
        console.error('Failed to load questions:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  onQuestionSearch(): void {
    if (!this.questionSearchTerm.trim()) {
      this.filteredQuestions = [...this.questions];
    } else {
      const term = this.questionSearchTerm.toLowerCase();
      this.filteredQuestions = this.questions.filter(q =>
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

  getTotalPoints(): number {
    return this.selectedQuestionIds.size;
  }

  onSubmit(): void {
    if (this.quizForm.invalid || this.selectedQuestionIds.size === 0) {
      console.log('❌ Form validation failed:', {
        formInvalid: this.quizForm.invalid,
        noQuestions: this.selectedQuestionIds.size === 0,
        lessonId: this.lessonId
      });
      return;
    }

    // For now, create a demo lessonId if none provided
    const targetLessonId = this.lessonId || 'demo-lesson-001';
    console.log('🎯 Creating quiz with lessonId:', targetLessonId);

    this.isLoading = true;
    const formValue = this.quizForm.value;
    const request: CreateQuizRequest = {
      questionIds: Array.from(this.selectedQuestionIds),
      timeLimitMinutes: formValue.timeLimitMinutes,
      maxAttempts: formValue.maxAttempts,
      passingScore: formValue.passingScore,
      shuffleQuestions: formValue.shuffleQuestions,
      shuffleOptions: formValue.shuffleOptions,
      showCorrectAnswers: formValue.showCorrectAnswers,
      showResultsImmediately: formValue.showResultsImmediately
    };

    this.quizApi.createQuiz(targetLessonId, request).subscribe({
      next: () => {
        console.log('✅ Quiz created successfully');
        // Navigate back to quiz bank
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.router.navigate(['/teacher/quiz/quiz-bank']);
        }
      },
      error: (error) => {
        console.error('Failed to create quiz:', error);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    console.log('❌ Quiz creation cancelled');
    // Navigate back to quiz bank
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/teacher/quiz/quiz-bank']);
    }
  }
}