import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionApi, Question, UpdateQuestionRequest } from '../../../api/endpoints/question.api';

@Component({
  selector: 'app-question-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Chỉnh sửa Câu Hỏi</h1>
          <p class="text-gray-600">Cập nhật câu hỏi trắc nghiệm</p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600">Đang tải...</span>
        </div>

        <!-- Question Edit Form -->
        <form *ngIf="!isLoading" [formGroup]="questionForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <!-- Question Info -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Thông tin câu hỏi</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">ID Câu hỏi</label>
                <p class="text-sm text-gray-900 bg-gray-50 p-2 rounded">{{ question?.id }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Trạng thái</label>
                <p class="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {{ getStatusText(question?.status) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Basic Information -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Thông tin cơ bản</h2>
            
            <!-- Question Content -->
            <div class="mb-4">
              <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
                Nội dung câu hỏi *
              </label>
              <textarea
                id="content"
                formControlName="content"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập nội dung câu hỏi..."
              ></textarea>
              <div *ngIf="questionForm.get('content')?.invalid && questionForm.get('content')?.touched" 
                   class="text-red-500 text-sm mt-1">
                Nội dung câu hỏi là bắt buộc
              </div>
            </div>

            <!-- Difficulty and Tags -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Difficulty -->
              <div>
                <label for="difficulty" class="block text-sm font-medium text-gray-700 mb-2">
                  Độ khó
                </label>
                <select
                  id="difficulty"
                  formControlName="difficulty"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EASY">Dễ</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HARD">Khó</option>
                </select>
              </div>

              <!-- Tags -->
              <div>
                <label for="tags" class="block text-sm font-medium text-gray-700 mb-2">
                  Thẻ (tags)
                </label>
                <input
                  id="tags"
                  type="text"
                  formControlName="tags"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ví dụ: toán học, đại số"
                >
                <div class="text-xs text-gray-500 mt-1">
                  Phân cách bằng dấu phẩy
                </div>
              </div>
            </div>

            <!-- Status -->
            <div class="mt-4">
              <label for="status" class="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                id="status"
                formControlName="status"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DRAFT">Bản nháp</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
              </select>
            </div>
          </div>

          <!-- Options -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-800">Đáp án</h2>
              <button
                type="button"
                (click)="addOption()"
                class="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Thêm đáp án
              </button>
            </div>

            <!-- Options List -->
            <div formArrayName="options" class="space-y-3">
              <div *ngFor="let option of options.controls; let i = index" 
                   [formGroupName]="i"
                   class="flex items-center space-x-3 p-3 border rounded-lg"
                   [class.border-green-500]="i === getCorrectOptionIndex()"
                   [class.bg-green-50]="i === getCorrectOptionIndex()">
                
                <!-- Option Key -->
                <div class="flex-shrink-0">
                  <span class="inline-flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full text-sm font-medium">
                    {{ getOptionKey(i) }}
                  </span>
                </div>

                <!-- Option Content -->
                <div class="flex-1">
                  <input
                    type="text"
                    formControlName="content"
                    placeholder="Nội dung đáp án..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                </div>

                <!-- Correct Option Radio -->
                <div class="flex-shrink-0">
                  <input
                    type="radio"
                    [value]="getOptionKey(i)"
                    [checked]="getCorrectOptionKey() === getOptionKey(i)"
                    (change)="setCorrectOption(getOptionKey(i))"
                    class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                  >
                  <label class="ml-1 text-xs text-gray-600">Đúng</label>
                </div>

                <!-- Remove Option -->
                <div class="flex-shrink-0" *ngIf="options.length > 2">
                  <button
                    type="button"
                    (click)="removeOption(i)"
                    class="text-red-500 hover:text-red-700 focus:outline-none"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Warning if no correct option selected -->
            <div *ngIf="!getCorrectOptionKey()" 
                 class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div class="text-sm text-yellow-800">
                <strong>Lưu ý:</strong> Bạn cần chọn ít nhất một đáp án đúng.
              </div>
            </div>

            <!-- Minimum options warning -->
            <div *ngIf="options.length < 2" 
                 class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div class="text-sm text-yellow-800">
                Câu hỏi cần ít nhất 2 đáp án.
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div class="bg-white rounded-lg shadow p-6" *ngIf="questionForm.get('content')?.value">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Xem trước</h2>
            
            <div class="border rounded-lg p-4 bg-gray-50">
              <div class="font-medium text-gray-800 mb-3">
                {{ questionForm.get('content')?.value }}
              </div>
              
              <div class="space-y-2">
                <div *ngFor="let option of options.controls; let i = index"
                     [formGroupName]="i"
                     class="flex items-center space-x-2">
                  <div class="w-6 h-6 border border-gray-300 rounded flex items-center justify-center text-xs">
                    {{ getOptionKey(i) }}
                  </div>
                  <span>{{ option.get('content')?.value }}</span>
                  <span *ngIf="i === getCorrectOptionIndex()" 
                        class="text-green-600 text-xs">
                    ✓ Đáp án đúng
                  </span>
                </div>
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
              [disabled]="questionForm.invalid || !getCorrectOptionKey() || options.length < 2"
              class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cập nhật Câu Hỏi
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class QuestionEditComponent implements OnInit {
  questionForm: FormGroup;
  isLoading = false;
  question: Question | null = null;
  questionId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private questionApi: QuestionApi
  ) {
    this.questionForm = this.fb.group({
      content: ['', Validators.required],
      difficulty: ['MEDIUM', Validators.required],
      tags: [''],
      status: ['ACTIVE', Validators.required],
      options: this.fb.array([]),
      correctOption: ['A', Validators.required]
    });
  }

  ngOnInit(): void {
    this.questionId = this.route.snapshot.paramMap.get('questionId');
    if (this.questionId) {
      this.loadQuestion();
    }
  }

  get options(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  loadQuestion(): void {
    if (!this.questionId) return;

    this.isLoading = true;
    this.questionApi.getQuestionById(this.questionId).subscribe({
      next: (question) => {
        this.question = question;
        this.populateFormWithQuestion(question);
      },
      error: (error) => {
        console.error('Failed to load question:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  populateFormWithQuestion(question: Question): void {
    // Clear existing options
    while (this.options.length !== 0) {
      this.options.removeAt(0);
    }

    // Add options from question
    question.options.forEach(option => {
      this.options.push(this.createOptionGroup(option.optionKey, option.content));
    });

    // Update form values
    this.questionForm.patchValue({
      content: question.content,
      difficulty: question.difficulty,
      tags: question.tags,
      status: question.status,
      correctOption: question.correctOption
    });
  }

  createOptionGroup(optionKey: string, content: string): FormGroup {
    return this.fb.group({
      optionKey: [optionKey],
      content: [content, Validators.required]
    });
  }

  getOptionKey(index: number): string {
    return this.options.at(index).get('optionKey')?.value;
  }

  getCorrectOptionKey(): string | null {
    return this.questionForm.get('correctOption')?.value;
  }

  getCorrectOptionIndex(): number {
    const correctKey = this.getCorrectOptionKey();
    if (!correctKey) return -1;
    
    for (let i = 0; i < this.options.length; i++) {
      if (this.getOptionKey(i) === correctKey) {
        return i;
      }
    }
    return -1;
  }

  addOption(): void {
    const nextKey = String.fromCharCode(65 + this.options.length); // A, B, C, D, E...
    this.options.push(this.createOptionGroup(nextKey, ''));
  }

  removeOption(index: number): void {
    if (this.options.length > 2) {
      const removedKey = this.getOptionKey(index);
      this.options.removeAt(index);
      
      // If we removed the correct option, reset it
      if (this.getCorrectOptionKey() === removedKey) {
        this.questionForm.patchValue({ correctOption: this.getOptionKey(0) });
      }
    }
  }

  setCorrectOption(optionKey: string): void {
    this.questionForm.patchValue({ correctOption: optionKey });
  }

  getStatusText(status: string | undefined): string {
    const map: { [key: string]: string } = {
      'DRAFT': 'Bản nháp',
      'ACTIVE': 'Hoạt động',
      'INACTIVE': 'Không hoạt động'
    };
    return map[status || ''] || status || '';
  }

  onSubmit(): void {
    if (this.questionForm.invalid || !this.getCorrectOptionKey() || this.options.length < 2 || !this.questionId) {
      return;
    }

    this.isLoading = true;
    const formValue = this.questionForm.value;
    
    // Convert FormArray to string array
    const optionsList: string[] = [];
    for (let i = 0; i < this.options.length; i++) {
      const content = this.options.at(i).get('content')?.value;
      if (content) {
        optionsList.push(content);
      }
    }

    const request: UpdateQuestionRequest = {
      content: formValue.content,
      correctOption: formValue.correctOption,
      options: optionsList,
      difficulty: formValue.difficulty,
      tags: formValue.tags,
      status: formValue.status
    };

    this.questionApi.updateQuestion(this.questionId, request).subscribe({
      next: () => {
        this.router.navigate(['../quiz-bank'], { relativeTo: this.route });
      },
      error: (error) => {
        console.error('Failed to update question:', error);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['../quiz-bank'], { relativeTo: this.route });
  }
}