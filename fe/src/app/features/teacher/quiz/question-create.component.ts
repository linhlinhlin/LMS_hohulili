import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionApi, CreateQuestionRequest } from '../../../api/endpoints/question.api';

@Component({
  selector: 'app-question-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Tạo Câu Hỏi Mới</h1>
          <p class="text-gray-600">Tạo câu hỏi trắc nghiệm mới cho ngân hàng câu hỏi</p>
        </div>

        <!-- Question Creation Form -->
        <form [formGroup]="questionForm" (ngSubmit)="onSubmit()" class="space-y-6">
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
              Tạo Câu Hỏi
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class QuestionCreateComponent implements OnInit {
  questionForm: FormGroup;
  isLoading = false;
  courseId: string | null = null;
  packageId: string | null = null;

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
      options: this.fb.array([
        this.createOptionGroup('A'),
        this.createOptionGroup('B'),
        this.createOptionGroup('C'),
        this.createOptionGroup('D')
      ]),
      correctOption: ['A', Validators.required]
    });
  }

  ngOnInit(): void {
    // Get packageId from query parameters (priority)
    this.packageId = this.route.snapshot.queryParamMap.get('packageId');
    
    // Get courseId from route parameters (fallback for backward compatibility)
    this.courseId = this.route.snapshot.paramMap.get('courseId') || 
                    this.route.snapshot.queryParamMap.get('courseId');
    
    console.log('🔍 Question Create - packageId:', this.packageId, 'courseId:', this.courseId);
    
    // Auto-set correct option to 'A' initially
    this.setCorrectOption('A');
  }

  get options(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  createOptionGroup(optionKey: string): FormGroup {
    return this.fb.group({
      optionKey: [optionKey],
      content: ['', Validators.required]
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
    this.options.push(this.createOptionGroup(nextKey));
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

  onSubmit(): void {
    if (this.questionForm.invalid || !this.getCorrectOptionKey() || this.options.length < 2) {
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

    const request: CreateQuestionRequest = {
      content: formValue.content,
      correctOption: formValue.correctOption,
      options: optionsList,
      difficulty: formValue.difficulty,
      tags: formValue.tags,
      courseId: this.courseId || undefined,  // Add courseId if available
      packageId: this.packageId || undefined  // Add packageId if available
    };

    console.log('🔍 Creating question with request:', request);

    this.questionApi.createQuestion(request).subscribe({
      next: (question) => {
        console.log('✅ Question created successfully:', question);
        // Navigate back to quiz bank
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.router.navigate(['/teacher/quiz/quiz-bank']);
        }
      },
      error: (error) => {
        console.error('Failed to create question:', error);
        // You might want to show a user-friendly error message here
        alert('Lỗi khi tạo câu hỏi: ' + (error?.error?.message || error?.message || 'Lỗi không xác định'));
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    console.log('❌ Question creation cancelled');
    // Navigate back to quiz bank
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/teacher/quiz/quiz-bank']);
    }
  }
}
