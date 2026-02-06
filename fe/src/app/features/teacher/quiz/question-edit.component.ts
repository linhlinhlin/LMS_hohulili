
import { Component, OnInit, signal, viewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionApi, Question, UpdateQuestionRequest } from '../../../api/endpoints/question.api';
import { BlockEditorComponent } from '../../../shared/components/block-editor/block-editor.component';
import { EnrichedInputFieldComponent } from '../../../shared/components/enriched-input/enriched-input.component';
import { ContentBlock } from '../../../api/types/content-block.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-question-edit',
  imports: [ReactiveFormsModule, BlockEditorComponent, EnrichedInputFieldComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Chỉnh sửa Câu Hỏi</h1>
          <p class="text-gray-600">Cập nhật câu hỏi trắc nghiệm với nội dung phong phú</p>
        </div>
    
        <!-- Loading State -->
        @if (isLoading) {
          <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-2 text-gray-600">Đang tải...</span>
          </div>
        }
    
        <!-- Question Edit Form -->
        @if (!isLoading) {
          <form [formGroup]="questionForm" (ngSubmit)="onSubmit()" class="space-y-6">
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
              <h2 class="text-xl font-semibold mb-4 text-gray-800">Nội dung câu hỏi</h2>
              <!-- Question Content Block Editor -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung câu hỏi *
                </label>
                <div class="min-h-[150px]">
                  <app-block-editor
                    #blockEditor
                    [initialBlocks]="questionBlocks()"
                    (blocksChange)="onQuestionContentChange($event)">
                  </app-block-editor>
                </div>
                @if (questionBlocks().length === 0 && questionForm.touched) {
                  <div
                    class="text-red-500 text-sm mt-1">
                    Nội dung câu hỏi là bắt buộc
                  </div>
                }
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
                  @for (option of options.controls; track option; let i = $index) {
                    <div
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
                      <!-- Option Content (Enriched Input) -->
                      <div class="flex-1">
                        <app-enriched-input
                          [placeholder]="'Nhập nội dung đáp án...'"
                          [initialValue]="option.get('content')?.value"
                          (valueChange)="updateOptionText(i, $event)"
                          (blocksChange)="updateOptionBlocks(i, $event)"
                        ></app-enriched-input>
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
                        @if (options.length > 2) {
                          <div class="flex-shrink-0">
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
                        }
                      </div>
                    }
                  </div>
                  <!-- Warning if no correct option selected -->
                  @if (!getCorrectOptionKey()) {
                    <div
                      class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div class="text-sm text-yellow-800">
                        <strong>Lưu ý:</strong> Bạn cần chọn ít nhất một đáp án đúng.
                      </div>
                    </div>
                  }
                  <!-- Minimum options warning -->
                  @if (options.length < 2) {
                    <div
                      class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div class="text-sm text-yellow-800">
                        Câu hỏi cần ít nhất 2 đáp án.
                      </div>
                    </div>
                  }
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
            }
          </div>
        </div>
    `
})
export class QuestionEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private questionApi = inject(QuestionApi);

  questionForm: FormGroup;
  isLoading = false;
  question: Question | null = null;
  questionId: string | null = null;

  // Signals for Content Blocks
  questionBlocks = signal<ContentBlock[]>([]);
  optionBlocksMap = new Map<number, ContentBlock[]>();

  // Use ViewChild to set blocks on load

  readonly blockEditor = viewChild.required(BlockEditorComponent);

  constructor() {
    this.questionForm = this.fb.group({
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

  // --- Block Handlers ---

  onQuestionContentChange(blocks: ContentBlock[]) {
    this.questionBlocks.set(blocks);
  }

  updateOptionText(index: number, text: string) {
    this.options.at(index).get('content')?.setValue(text);
  }

  updateOptionBlocks(index: number, blocks: ContentBlock[]) {
    this.optionBlocksMap.set(index, blocks);
  }

  // --- Form Logic ---

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
      error: () => {
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
    this.optionBlocksMap.clear();

    // Add options from question (with null check)
    if (question.options && Array.isArray(question.options)) {
      question.options.forEach((option: any, index) => {
        let optionText = option.content || '';
        // Backend might send 'contentBlocks' or 'blocks' (nested data)
        const rawOptBlocks = option.contentBlocks || option.blocks;

        if (rawOptBlocks && rawOptBlocks.length > 0) {
          const transformed = this.transformFromBackendBlocks(rawOptBlocks);
          this.updateOptionBlocks(index, transformed);

          // Reconstruct hybrid text for EnrichedInput ([IMG:uuid], $latex$)
          // This ensures images appear in the input preview
          optionText = this.blocksToString(transformed);
        }

        this.options.push(this.createOptionGroup(option.optionKey, optionText));
      });
    } else {
      ['A', 'B', 'C', 'D'].forEach(key => {
        this.options.push(this.createOptionGroup(key, ''));
      });
    }

    // Update form values
    this.questionForm.patchValue({
      difficulty: question.difficulty,
      tags: question.tags,
      status: question.status,
      correctOption: question.correctOption
    });

    // Set Question Content Blocks
    // If backend provides blocks, use them. Else parse text.
    // Assuming backend might not yet send `contentBlocks` or generic `question` interface doesn't have it typed fully in FE
    // Set Question Content Blocks
    // Backend returns nested 'data' map, Frontend needs flat properties
    const rawBlocks = (question as any).blocks || (question as any).contentBlocks;
    let blocks: ContentBlock[] = [];

    if (rawBlocks && rawBlocks.length > 0) {
      blocks = this.transformFromBackendBlocks(rawBlocks);
    } else {
      blocks = this.parseRawText(question.content);
    }
    this.questionBlocks.set(blocks);
  }

  private transformFromBackendBlocks(backendBlocks: any[]): ContentBlock[] {
    return backendBlocks.map(b => {
      const { data, ...rest } = b;
      let block: any = { ...rest };

      // Flatten data based on type
      if (b.type === 'text') {
        block.content = data?.html || '';
      } else if (b.type === 'formula') {
        block.content = data?.latex || '';
        block.format = data?.format || 'inline';
      } else if (b.type === 'image') {
        block.url = data?.url || '';
        block.caption = data?.caption;
        block.width = data?.width;
      }
      return block as ContentBlock;
    });
  }

  // Temporary parser for legacy text content
  private parseRawText(text: string): ContentBlock[] {
    if (!text) return [];
    const blocks: ContentBlock[] = [];
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    parts.forEach(part => {
      if (!part) return;
      if (part.startsWith('$$')) {
        blocks.push({ id: crypto.randomUUID(), type: 'formula', content: part.slice(2, -2), format: 'display' });
      } else if (part.startsWith('$')) {
        blocks.push({ id: crypto.randomUUID(), type: 'formula', content: part.slice(1, -1), format: 'inline' });
      } else {
        blocks.push({ id: crypto.randomUUID(), type: 'text', content: part });
      }
    });
    return blocks;
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
    const nextKey = String.fromCharCode(65 + this.options.length);
    this.options.push(this.createOptionGroup(nextKey, ''));
  }

  removeOption(index: number): void {
    if (this.options.length > 2) {
      const removedKey = this.getOptionKey(index);
      this.options.removeAt(index);

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

    const optionsList: string[] = [];
    for (let i = 0; i < this.options.length; i++) {
      const content = this.options.at(i).get('content')?.value;
      if (content) {
        optionsList.push(content);
      }
    }

    // Extract text from blocks for fallback
    const fallbackContent = this.questionBlocks().map(b => (b as any).content || '').join(' ');

    if (!this.questionId) return;

    const request: any = { // Use any for DTO mismatch
      content: fallbackContent,
      blocks: this.transformToBackendBlocks(this.questionBlocks()), // FIXED to match backend DTO

      correctOption: formValue.correctOption,
      options: optionsList,

      // Map option blocks
      optionBlocks: this.options.controls.map((_, i) =>
        this.transformToBackendBlocks(this.optionBlocksMap.get(i) || [])
      ),

      difficulty: formValue.difficulty,
      tags: formValue.tags,
      status: formValue.status
    };

    this.questionApi.updateQuestion(this.questionId, request).subscribe({
      next: () => {
        this.router.navigate(['/teacher/quiz/quiz-bank']);
      },
      error: (error) => {
        alert('Lỗi khi cập nhật câu hỏi: ' + (error?.error?.message || error?.message)); // Show alert
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  private transformToBackendBlocks(blocks: ContentBlock[]): any[] {
    return blocks.map(b => {
      const { id, type, ...rest } = b as any;
      let data: any = {};

      if (type === 'text') {
        data.html = rest.content || '';
      } else if (type === 'formula') {
        data.latex = rest.content || '';
        data.format = rest.format || 'inline';
      } else if (type === 'image') {
        data.url = rest.url || '';
        data.caption = rest.caption;
        data.width = rest.width;
      } else {
        Object.assign(data, rest);
      }

      return {
        id,
        type,
        data
      };
    });
  }

  private blocksToString(blocks: ContentBlock[]): string {
    return blocks.map(b => {
      if (b.type === 'text') return (b as any).content || '';
      if (b.type === 'formula') {
        const content = (b as any).content;
        return (b as any).format === 'display' ? `$$${content}$$` : `$${content}$`;
      }
      if (b.type === 'image') return ` ${(b as any).url ? `[IMG:${(b as any).url}]` : ''} `;
      return '';
    }).join('');
  }

  onCancel(): void {
    this.router.navigate(['/teacher/quiz/quiz-bank']);
  }
}
