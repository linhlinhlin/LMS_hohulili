
import { Component, OnInit, signal, viewChild, ElementRef, input, output, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionApi, CreateQuestionRequest } from '../../../api/endpoints/question.api';
import { BlockEditorComponent } from '../../../shared/components/block-editor/block-editor.component';
import { EnrichedInputFieldComponent } from '../../../shared/components/enriched-input/enriched-input.component';
import { QuestionPreviewComponent } from '../../../shared/components/question-preview/question-preview.component';
import { ContentBlock } from '../../../api/types/content-block.types';
import { ContentIdentityService } from '../../../core/services/content-identity.service';
import { AuthImagePipe } from '../../../shared/pipes/auth-image.pipe';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-question-create',
  imports: [ReactiveFormsModule, BlockEditorComponent, EnrichedInputFieldComponent, AuthImagePipe, QuestionPreviewComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header with Preview Button -->
        <div class="mb-8 flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Tạo Câu Hỏi Mới</h1>
            <p class="text-gray-600">Soạn thảo câu hỏi trắc nghiệm với công thức toán học và hình ảnh minh họa</p>
          </div>
          <button type="button" (click)="showPreview = true"
            class="flex items-center gap-2 px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors shadow-md">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            Xem trước
          </button>
        </div>
    
        <!-- Question Creation Form -->
        <form [formGroup]="questionForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <!-- Basic Information -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Nội dung câu hỏi</h2>
    
            <!-- Question Content Block Editor -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Soạn thảo nội dung (Text, Ảnh, Công thức) *
              </label>
    
              <div class="min-h-[150px]">
                <app-block-editor
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
    
            <!-- Basic Info Grid (Difficulty, Tags) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Difficulty -->
              <div>
                <label for="difficulty" class="block text-sm font-medium text-gray-700 mb-2">
                  Độ khó
                </label>
                <select
                  id="difficulty"
                  formControlName="difficulty"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0056D2]"
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0056D2]"
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
                  class="px-3 py-1 text-sm bg-[#0056D2] text-white rounded-md hover:bg-[#004BB5] focus:outline-none focus:ring-2 focus:ring-[#0056D2]"
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
                        [placeholder]="'Nhập nội dung đáp án (dùng [IMG] hoặc $...$)'"
                        (valueChange)="updateOptionText(i, $event)"
                        (blocksChange)="updateOptionBlocks(i, $event)"
                      ></app-enriched-input>
                      <!-- Mini Preview for Option Image -->
                      @if (hasImageTag(options.at(i).get('content')?.value)) {
                        <div class="absolute right-14 top-2 z-10">
                          <img [src]="extractFileId(options.at(i).get('content')?.value) | authImage"
                            class="w-10 h-10 rounded border shadow-sm object-cover bg-white hover:scale-150 transition-transform origin-top-right cursor-zoom-in"
                            title="Image attached">
                          </div>
                        }
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
                    [disabled]="questionForm.invalid || !getCorrectOptionKey() || options.length < 2 || questionBlocks().length === 0"
                    class="px-6 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#004BB5] focus:outline-none focus:ring-2 focus:ring-[#0056D2] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    Tạo Câu Hỏi
                  </button>
                </div>
              </form>
            </div>
          </div>
    
          <!-- Preview Modal -->
          @if (showPreview) {
            <div
              class="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-6"
              (click)="showPreview = false">
              <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
                (click)="$event.stopPropagation()">
                <!-- Modal Header -->
                <div class="bg-[#0056D2] px-6 py-4 flex justify-between items-center">
                  <span class="text-white text-lg font-semibold flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    Xem trước câu hỏi
                  </span>
                  <button (click)="showPreview = false"
                    class="text-white hover:text-red-300 transition-colors p-1">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <!-- Modal Content -->
                <div class="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                  <app-question-preview
                    [questionContent]="rawQuestionContent()"
                    [optionsList]="_previewOptions()"
                    [correctOption]="getCorrectOptionKey() || ''"
                    [showCorrectAnswer]="true">
                  </app-question-preview>
                </div>
              </div>
            </div>
          }
    `
})
export class QuestionCreateComponent implements OnInit {
  // Signal inputs (Angular v20+)
  readonly isDialog = input(false);

  // Output functions (Angular v20+)
  readonly created = output<any>();
  readonly cancel = output<void>();

  questionForm: FormGroup;
  isLoading = false;
  courseId: string | null = null;
  packageId: string | null = null;
  categoryId: string | null = null;
  showPreview = false;

  // Signals for Content Blocks
  questionBlocks = signal<ContentBlock[]>([]);
  rawQuestionContent = signal<string>('');

  // SOTA 2025: Cached options for preview (prevents infinite re-render)
  _previewOptions = signal<{ key: string; content: string }[]>([]);

  // Track blocks for each option
  // Map index -> ContentBlock[]
  optionBlocksMap = new Map<number, ContentBlock[]>();

  // Injected dependencies
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly questionApi = inject(QuestionApi);
  private readonly toast = inject(ToastService);

  constructor() {
    this.questionForm = this.fb.group({
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
    this.packageId = this.route.snapshot.queryParamMap.get('packageId');
    this.categoryId = this.route.snapshot.queryParamMap.get('categoryId');
    this.courseId = this.route.snapshot.paramMap.get('courseId') ||
      this.route.snapshot.queryParamMap.get('courseId');
    this.setCorrectOption('A');
  }

  // --- Block Handlers ---

  onQuestionContentChange(blocks: ContentBlock[]) {
    this.questionBlocks.set(blocks);
    // Parse EditorJS blocks to raw string for preview
    const rawContent = blocks.map((block: any) => {
      if (block.type === 'paragraph' || block.type === 'text') {
        return block.data?.text || block.content || '';
      } else if (block.type === 'image') {
        // SOTA 2025: Use FULL URL for persistence to ensure images load across sessions.
        // We do strictly prefer R2/S3 URLs, but we store what the backend returned.
        const url = block.data?.file?.url || block.data?.url || block.url || '';
        if (url) {
          return `[IMG:${url}]`;
        }
        return '';
      } else if (block.type === 'math' || block.type === 'formula') {
        const content = block.data?.text || block.content || '';
        return `$$${content}$$`;
      }
      return '';
    }).filter(s => s.trim()).join(' ');
    this.rawQuestionContent.set(rawContent);
    // SOTA 2025: Also update cached preview options
    this.updatePreviewOptions();
  }

  updateOptionText(index: number, text: string) {
    this.options.at(index).get('content')?.setValue(text);
    // SOTA 2025: Update cached preview options
    this.updatePreviewOptions();
  }

  /**
   * SOTA 2025: Update cached preview options signal.
   * Called after form changes to prevent method calls creating new arrays in template.
   */
  private updatePreviewOptions(): void {
    const result: { key: string; content: string }[] = [];
    for (let i = 0; i < this.options.length; i++) {
      result.push({
        key: this.getOptionKey(i),
        content: this.options.at(i).get('content')?.value || ''
      });
    }
    this._previewOptions.set(result);
  }

  updateOptionBlocks(index: number, blocks: ContentBlock[]) {
    this.optionBlocksMap.set(index, blocks);
  }

  // --- Helper Methods for Preview ---
  hasImageTag(text: string): boolean {
    return !!text && text.includes('[IMG:');
  }

  extractFileId(text: string): string {
    if (!text) return '';
    // SOTA 2025: Extract content inside [IMG:...] which is now a URL
    const match = text.match(/\[IMG:([^\]]+)\]/);
    return match ? match[1] : '';
  }

  // --- Form Accessors ---

  get options(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  createOptionGroup(optionKey: string): FormGroup {
    return this.fb.group({
      optionKey: [optionKey],
      content: [''] // Content is now optional in form validation if we check blocks, but EnrichedInput drives it
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
      if (this.getOptionKey(i) === correctKey) return i;
    }
    return -1;
  }

  addOption(): void {
    const nextKey = String.fromCharCode(65 + this.options.length);
    this.options.push(this.createOptionGroup(nextKey));
  }

  removeOption(index: number): void {
    if (this.options.length > 2) {
      const removedKey = this.getOptionKey(index);
      this.options.removeAt(index);
      // Re-map keys if needed? 
      // For simplicity, we just keep existing keys or could re-generate A,B,C...
      // But typically removing B shifts C -> B. 
      // Let's rely on standard logic, but need to fix optionBlocksMap potentially.
      // Re-indexing map is complex, simplified for now: just clear removed index
      this.optionBlocksMap.delete(index);

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

    // SOTA 2025: Prevent duplicate submissions
    if (this.isLoading) return;

    this.isLoading = true;
    const formValue = this.questionForm.value;

    const optionsList: string[] = [];
    const optionBlocksList: ContentBlock[][] = [];

    for (let i = 0; i < this.options.length; i++) {
      const text = this.options.at(i).get('content')?.value || '';
      optionsList.push(text);

      // Get blocks or default to text block
      const blocks = this.optionBlocksMap.get(i) || [{
        id: crypto.randomUUID(), // Should generate unique ID
        type: 'text',
        content: text
      }];
      optionBlocksList.push(blocks);
    }

    const request: any = { // Cast to any to bypass interface strictness for now
      content: this.extractTextFromBlocks(this.questionBlocks()), // Fallback text
      blocks: this.transformToBackendBlocks(this.questionBlocks()), // NEW: Transform to backend format

      correctOption: formValue.correctOption,
      options: optionsList,
      optionBlocks: optionBlocksList.map(bl => this.transformToBackendBlocks(bl)), // Sending transformed blocks

      difficulty: formValue.difficulty,
      tags: formValue.tags,
      courseId: this.courseId || undefined,
      packageId: this.packageId || undefined,
      categoryId: this.categoryId || undefined
    };

    this.questionApi.createQuestion(request).subscribe({
      next: (question) => {
        if (this.isDialog()) {
          this.created.emit(question);
        } else {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          if (returnUrl) {
            this.router.navigateByUrl(returnUrl);
          } else {
            // Navigate back to quiz-bank, preserving packageId selection
            this.router.navigate(['/teacher/quiz/quiz-bank'], {
              queryParams: this.packageId ? { packageId: this.packageId } : {}
            });
          }
        }
      },
      error: (error) => {
        this.toast.error('Lỗi khi tạo câu hỏi: ' + (error?.error?.message || error?.message));
        this.isLoading = false;
      },
      complete: () => {
        // Only set isLoading to false on ERROR. On success, we navigate away, so keep it true to prevent double clicks.
        // If isDialog is true, we might stay, so...
        if (this.isDialog()) {
          this.isLoading = false;
        }
      }
    });
  }

  private extractTextFromBlocks(blocks: ContentBlock[]): string {
    return blocks.map(b => (b as any).content || '').join(' ');
  }

  private transformToBackendBlocks(blocks: ContentBlock[]): any[] {
    return blocks.map(b => {
      const { id, type, ...rest } = b as any;
      let data: any = {};

      if (type === 'text') {
        data.html = rest.content || rest.data?.text || '';
      } else if (type === 'formula') {
        data.latex = rest.content || rest.data?.latex || '';
        data.format = rest.format || rest.data?.format || 'inline';
      } else if (type === 'image') {
        // EditorJS Image Tool returns: { file: { url: "..." }, ... }
        // SOTA 2025: Persist FULL URL to ensure availability.
        // The backend returns { file: { url, id, storageKey } } in the upload response.
        // We must preserve this structure or at least the URL.
        const fileObj = rest.file || rest.data?.file || {};
        const url = fileObj.url || rest.url || rest.data?.url || '';

        data.file = {
          url: url,
          // If we have id/storageKey from the upload response, keep them if possible,
          // but the critical part is 'url' for the frontend to render it later.
          id: fileObj.id,
          storageKey: fileObj.storageKey
        };
        data.url = url; // Some viewers might look here
        data.caption = rest.caption || rest.data?.caption || '';
        data.width = rest.width || rest.data?.width;
      } else if (type === 'header') {
        data.text = rest.text || rest.data?.text || '';
        data.level = rest.level || rest.data?.level || 2;
      } else if (type === 'paragraph') {
        data.text = rest.text || rest.data?.text || '';
      } else {
        // For other types, preserve the data structure
        Object.assign(data, rest.data || rest);
      }

      return {
        id,
        type,
        data
      };
    });
  }

  /**
   * SOTA 2025: Removed extractUuidFromUrl as we now prefer Full URLs for stability.
   */
  private isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  onCancel(): void {
    if (this.isDialog()) {
      this.cancel.emit();
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/teacher/quiz/quiz-bank']);
    }
  }

  // ==========================================
  // Preview Helper Methods (Kahoot-style)
  // ==========================================

  /**
   * Get question content for preview component.
   * Extracts text from blocks and returns as string.
   */
  getQuestionContentForPreview(): string {
    const blocks = this.questionBlocks();
    if (blocks.length === 0) return '';

    return blocks.map(block => {
      if (block.type === 'text') {
        return (block as any).content || '';
      } else if (block.type === 'formula') {
        const content = (block as any).content || '';
        const format = (block as any).format;
        return format === 'display' ? `$$${content}$$` : `$${content}$`;
      } else if (block.type === 'image') {
        // SOTA 2025: Use URL
        const url = (block as any).url || (block as any).data?.file?.url || (block as any).data?.url;
        return `[IMG:${url}]`;
      }
      return '';
    }).join(' ');
  }

  /**
   * Get options for preview component.
   * Returns array of {key, content} objects.
   */
  getOptionsForPreview(): { key: string; content: string }[] {
    const result: { key: string; content: string }[] = [];
    for (let i = 0; i < this.options.length; i++) {
      result.push({
        key: this.getOptionKey(i),
        content: this.options.at(i).get('content')?.value || ''
      });
    }
    return result;
  }
}

