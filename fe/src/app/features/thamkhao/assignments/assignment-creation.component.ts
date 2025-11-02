import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormsModule } from '@angular/forms';
import { TeacherService, TeacherAssignment, TeacherCourse } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { UploadedFile } from '../../../shared/models/uploaded-file.model';

interface QuestionType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  type: string;
  question: string;
  options: QuestionOption[];
  correctAnswer: string;
  points: number;
  explanation: string;
}

@Component({
  selector: 'app-assignment-creation',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, LoadingComponent, FileUploadComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isSubmitting()" 
      text="Đang tạo bài tập..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
      <div class="max-w-6xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">📝 Tạo bài tập mới</h1>
              <p class="text-gray-600">Tạo bài tập cho khóa học hàng hải</p>
            </div>
            <button routerLink="/teacher/assignments" 
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              ← Quay lại
            </button>
          </div>
        </div>

        <!-- Assignment Creation Form -->
        <form [formGroup]="assignmentForm" (ngSubmit)="onSubmit()" class="space-y-8">
          <!-- Basic Information -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
              Thông tin cơ bản
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Assignment Title -->
              <div class="md:col-span-2">
                <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                  Tên bài tập *
                </label>
                <input 
                  type="text" 
                  id="title"
                  formControlName="title"
                  placeholder="Ví dụ: Quiz An toàn Hàng hải"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('title')">
                @if (assignmentForm.get('title')?.invalid && assignmentForm.get('title')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Tên bài tập là bắt buộc</p>
                }
              </div>

              <!-- Course Selection -->
              <div>
                <label for="courseId" class="block text-sm font-medium text-gray-700 mb-2">
                  Khóa học *
                </label>
                <select 
                  id="courseId"
                  formControlName="courseId"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('courseId')">
                  <option value="">Chọn khóa học</option>
                  @for (course of availableCourses(); track course.id) {
                    <option [value]="course.id">{{ course.title }}</option>
                  }
                </select>
                @if (assignmentForm.get('courseId')?.invalid && assignmentForm.get('courseId')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Vui lòng chọn khóa học</p>
                }
              </div>

              <!-- Assignment Type -->
              <div>
                <label for="type" class="block text-sm font-medium text-gray-700 mb-2">
                  Loại bài tập *
                </label>
                <select 
                  id="type"
                  formControlName="type"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('type')">
                  <option value="">Chọn loại bài tập</option>
                  @for (questionType of questionTypes(); track questionType.id) {
                    <option [value]="questionType.id">{{ questionType.name }}</option>
                  }
                </select>
                @if (assignmentForm.get('type')?.invalid && assignmentForm.get('type')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Vui lòng chọn loại bài tập</p>
                }
              </div>

              <!-- Due Date -->
              <div>
                <label for="dueDate" class="block text-sm font-medium text-gray-700 mb-2">
                  Hạn nộp bài *
                </label>
                <input 
                  type="datetime-local" 
                  id="dueDate"
                  formControlName="dueDate"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('dueDate')">
                @if (assignmentForm.get('dueDate')?.invalid && assignmentForm.get('dueDate')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Hạn nộp bài là bắt buộc</p>
                }
              </div>

              <!-- Max Score -->
              <div>
                <label for="maxScore" class="block text-sm font-medium text-gray-700 mb-2">
                  Điểm tối đa *
                </label>
                <input 
                  type="number" 
                  id="maxScore"
                  formControlName="maxScore"
                  placeholder="100"
                  min="1"
                  max="1000"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('maxScore')">
                @if (assignmentForm.get('maxScore')?.invalid && assignmentForm.get('maxScore')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Điểm tối đa là bắt buộc</p>
                }
              </div>
            </div>

            <!-- Description -->
            <div class="mt-6">
              <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                Mô tả bài tập *
              </label>
              <textarea 
                id="description"
                formControlName="description"
                rows="4"
                placeholder="Mô tả chi tiết về bài tập, yêu cầu, hướng dẫn..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                [class]="getFieldClass('description')"></textarea>
              @if (assignmentForm.get('description')?.invalid && assignmentForm.get('description')?.touched) {
                <p class="mt-1 text-sm text-red-600">Mô tả bài tập là bắt buộc</p>
              }
            </div>
          </div>

          <!-- Questions Section -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-gray-900 flex items-center">
                <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
                </svg>
                Câu hỏi ({{ questions().length }})
              </h2>
              <button 
                type="button"
                (click)="addQuestion()"
                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <svg class="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                </svg>
                Thêm câu hỏi
              </button>
            </div>

            <!-- Questions List -->
            <div class="space-y-6">
              @for (question of questions(); track question.id; let i = $index) {
                <div class="border border-gray-200 rounded-lg p-6">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Câu hỏi {{ i + 1 }}</h3>
                    <button 
                      type="button"
                      (click)="removeQuestion(i)"
                      class="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <!-- Question Type -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Loại câu hỏi</label>
                      <select 
                        [formControlName]="'questions.' + i + '.type'"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                        @for (questionType of questionTypes(); track questionType.id) {
                          <option [value]="questionType.id">{{ questionType.name }}</option>
                        }
                      </select>
                    </div>

                    <!-- Points -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Điểm</label>
                      <input 
                        type="number" 
                        [formControlName]="'questions.' + i + '.points'"
                        placeholder="10"
                        min="1"
                        max="100"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    </div>
                  </div>

                  <!-- Question Text -->
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nội dung câu hỏi</label>
                    <textarea 
                      [formControlName]="'questions.' + i + '.question'"
                      rows="3"
                      placeholder="Nhập nội dung câu hỏi..."
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"></textarea>
                  </div>

                  <!-- Multiple Choice Options -->
                  @if (question.type === 'multiple-choice') {
                    <div class="mb-4">
                      <label class="block text-sm font-medium text-gray-700 mb-2">Các lựa chọn</label>
                      <div class="space-y-2">
                        @for (option of question.options; track option.id; let j = $index) {
                          <div class="flex items-center space-x-3">
                            <input 
                              type="radio" 
                              [name]="'question_' + i + '_correct'"
                              [value]="option.id"
                              [checked]="option.isCorrect"
                              (change)="setCorrectAnswer(i, option.id)"
                              class="text-purple-600 focus:ring-purple-500">
                            <input 
                              type="text" 
                              [(ngModel)]="option.text"
                              placeholder="Nhập lựa chọn..."
                              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                            <button 
                              type="button"
                              (click)="removeOption(i, j)"
                              class="p-1 text-red-600 hover:text-red-800">
                              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                              </svg>
                            </button>
                          </div>
                        }
                      </div>
                      <button 
                        type="button"
                        (click)="addOption(i)"
                        class="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        + Thêm lựa chọn
                      </button>
                    </div>
                  }

                  <!-- Correct Answer for other types -->
                  @if (question.type !== 'multiple-choice') {
                    <div class="mb-4">
                      <label class="block text-sm font-medium text-gray-700 mb-2">Đáp án đúng</label>
                      <input 
                        type="text" 
                        [formControlName]="'questions.' + i + '.correctAnswer'"
                        placeholder="Nhập đáp án đúng..."
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    </div>
                  }

                  <!-- Explanation -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Giải thích</label>
                    <textarea 
                      [formControlName]="'questions.' + i + '.explanation'"
                      rows="2"
                      placeholder="Giải thích đáp án (tùy chọn)..."
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"></textarea>
                  </div>
                </div>
              }

              <!-- Empty State -->
              @if (questions().length === 0) {
                <div class="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
                  </svg>
                  <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có câu hỏi nào</h3>
                  <p class="text-gray-500 mb-4">Thêm câu hỏi để tạo bài tập</p>
                  <button 
                    type="button"
                    (click)="addQuestion()"
                    class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Thêm câu hỏi đầu tiên
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- File Attachments -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
              </svg>
              Tài liệu đính kèm
            </h2>
            
            <app-file-upload
              title="Tải lên tài liệu bài tập"
              description="Kéo thả file vào đây hoặc click để chọn tài liệu hỗ trợ bài tập"
              [category]="'assignment'"
              [maxFileSize]="50 * 1024 * 1024"
              acceptedTypes=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
              [showRestrictions]="true"
              (filesUploaded)="onFilesUploaded($event)"
              (fileRemoved)="onFileRemoved($event)">
            </app-file-upload>
          </div>

          <!-- Form Actions -->
          <div class="flex items-center justify-end space-x-4">
            <button 
              type="button"
              routerLink="/teacher/assignments"
              class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Hủy
            </button>
            <button 
              type="submit"
              [disabled]="assignmentForm.invalid || isSubmitting() || questions().length === 0"
              class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isSubmitting()) {
                <svg class="w-4 h-4 mr-2 animate-spin inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                </svg>
                Đang tạo...
              } @else {
                Tạo bài tập
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentCreationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private teacherService = inject(TeacherService);
  private router = inject(Router);

  // Form state
  assignmentForm!: FormGroup;
  isSubmitting = signal(false);
  questions = signal<Question[]>([]);
  uploadedFiles = signal<UploadedFile[]>([]);

  // Available courses
  availableCourses = computed(() => this.teacherService.activeCourses());

  // Question types for maritime assignments
  questionTypes = signal<QuestionType[]>([
    {
      id: 'multiple-choice',
      name: 'Trắc nghiệm',
      description: 'Câu hỏi nhiều lựa chọn',
      icon: '📝'
    },
    {
      id: 'true-false',
      name: 'Đúng/Sai',
      description: 'Câu hỏi đúng hoặc sai',
      icon: '✅'
    },
    {
      id: 'short-answer',
      name: 'Trả lời ngắn',
      description: 'Câu trả lời ngắn gọn',
      icon: '✏️'
    },
    {
      id: 'essay',
      name: 'Tự luận',
      description: 'Câu hỏi tự luận dài',
      icon: '📄'
    },
    {
      id: 'file-upload',
      name: 'Nộp file',
      description: 'Nộp file hoặc tài liệu',
      icon: '📎'
    }
  ]);

  ngOnInit(): void {
    this.initializeForm();
    this.loadCourses();
  }

  private initializeForm(): void {
    this.assignmentForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      courseId: ['', Validators.required],
      type: ['', Validators.required],
      dueDate: ['', Validators.required],
      maxScore: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
      questions: this.fb.array([])
    });
  }

  private async loadCourses(): Promise<void> {
    await this.teacherService.getCourses();
  }

  getFieldClass(fieldName: string): string {
    const field = this.assignmentForm.get(fieldName);
    if (field?.invalid && field?.touched) {
      return 'border-red-500 focus:ring-red-500 focus:border-red-500';
    }
    return '';
  }

  addQuestion(): void {
    const newQuestion: Question = {
      id: this.generateId(),
      type: 'multiple-choice',
      question: '',
      options: [
        { id: this.generateId(), text: '', isCorrect: false },
        { id: this.generateId(), text: '', isCorrect: false }
      ],
      correctAnswer: '',
      points: 10,
      explanation: ''
    };

    this.questions.update(questions => [...questions, newQuestion]);
    this.addQuestionFormGroup();
  }

  private addQuestionFormGroup(): void {
    const questionsArray = this.assignmentForm.get('questions') as FormArray;
    const questionGroup = this.fb.group({
      type: ['multiple-choice'],
      question: ['', Validators.required],
      correctAnswer: [''],
      points: [10, [Validators.required, Validators.min(1)]],
      explanation: ['']
    });
    questionsArray.push(questionGroup);
  }

  removeQuestion(index: number): void {
    this.questions.update(questions => questions.filter((_, i) => i !== index));
    const questionsArray = this.assignmentForm.get('questions') as FormArray;
    questionsArray.removeAt(index);
  }

  addOption(questionIndex: number): void {
    const question = this.questions()[questionIndex];
    const newOption: QuestionOption = {
      id: this.generateId(),
      text: '',
      isCorrect: false
    };
    
    this.questions.update(questions => {
      const updatedQuestions = [...questions];
      updatedQuestions[questionIndex] = {
        ...updatedQuestions[questionIndex],
        options: [...updatedQuestions[questionIndex].options, newOption]
      };
      return updatedQuestions;
    });
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    this.questions.update(questions => {
      const updatedQuestions = [...questions];
      updatedQuestions[questionIndex] = {
        ...updatedQuestions[questionIndex],
        options: updatedQuestions[questionIndex].options.filter((_, i) => i !== optionIndex)
      };
      return updatedQuestions;
    });
  }

  setCorrectAnswer(questionIndex: number, optionId: string): void {
    this.questions.update(questions => {
      const updatedQuestions = [...questions];
      updatedQuestions[questionIndex] = {
        ...updatedQuestions[questionIndex],
        options: updatedQuestions[questionIndex].options.map(option => ({
          ...option,
          isCorrect: option.id === optionId
        }))
      };
      return updatedQuestions;
    });
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }

  // File Upload Methods
  onFilesUploaded(files: UploadedFile[]): void {
    this.uploadedFiles.update(current => [...current, ...files]);
  }

  onFileRemoved(fileId: string): void {
    this.uploadedFiles.update(files => files.filter(f => f.id !== fileId));
  }

  async onSubmit(): Promise<void> {
    if (this.assignmentForm.valid && this.questions().length > 0) {
      this.isSubmitting.set(true);
      
      try {
        const formValue = this.assignmentForm.value;
        const selectedCourse = this.availableCourses().find(course => course.id === formValue.courseId);
        
        const assignmentData: Partial<TeacherAssignment> = {
          title: formValue.title,
          description: formValue.description,
          type: formValue.type,
          courseId: formValue.courseId,
          courseTitle: selectedCourse?.title || '',
          dueDate: new Date(formValue.dueDate),
          maxScore: formValue.maxScore,
          totalStudents: selectedCourse?.students || 0,
          submissions: 0,
          status: 'draft'
        };

        await this.teacherService.createAssignment(assignmentData);
        
        // Navigate back to assignments list
        this.router.navigate(['/teacher/assignments']);
        
      } catch (error) {
        console.error('Error creating assignment:', error);
      } finally {
        this.isSubmitting.set(false);
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.assignmentForm.controls).forEach(key => {
        this.assignmentForm.get(key)?.markAsTouched();
      });
    }
  }
}