import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionApi, CreateQuestionRequest } from '../../../api/endpoints/question.api';
import { BlockEditorComponent } from '../../../shared/components/block-editor/block-editor.component';
import { EnrichedInputFieldComponent } from '../../../shared/components/enriched-input/enriched-input.component';
import { ContentBlock } from '../../../api/types/content-block.types';
import { ContentIdentityService } from '../../../core/services/content-identity.service';
import { AuthImagePipe } from '../../../shared/pipes/auth-image.pipe';

@Component({
  selector: 'app-question-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BlockEditorComponent, EnrichedInputFieldComponent, AuthImagePipe],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Tạo Câu Hỏi Mới</h1>
          <p class="text-gray-600">Soạn thảo câu hỏi trắc nghiệm vói công thức toán học và hình ảnh minh họa</p>
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

              <div *ngIf="questionBlocks().length === 0 && questionForm.touched" 
                   class="text-red-500 text-sm mt-1">
                Nội dung câu hỏi là bắt buộc
              </div>
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

                <!-- Option Content (Enriched Input) -->
                <div class="flex-1">
                  <app-enriched-input
                    [placeholder]="'Nhập nội dung đáp án (dùng [IMG] hoặc $...$)'"
                    (valueChange)="updateOptionText(i, $event)"
                    (blocksChange)="updateOptionBlocks(i, $event)"
                  ></app-enriched-input>
                  
                  <!-- Mini Preview for Option Image -->
                  <div *ngIf="hasImageTag(options.at(i).get('content')?.value)" class="absolute right-14 top-2 z-10">
                       <img [src]="extractFileId(options.at(i).get('content')?.value) | authImage" 
                            class="w-10 h-10 rounded border shadow-sm object-cover bg-white hover:scale-150 transition-transform origin-top-right cursor-zoom-in" 
                            title="Image attached">
                  </div>
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
  @Input() isDialog = false;
  @Output() created = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  questionForm: FormGroup;
  isLoading = false;
  courseId: string | null = null;
  packageId: string | null = null;

  // Signals for Content Blocks
  questionBlocks = signal<ContentBlock[]>([]);

  // Track blocks for each option
  // Map index -> ContentBlock[]
  optionBlocksMap = new Map<number, ContentBlock[]>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private questionApi: QuestionApi
  ) {
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
    this.courseId = this.route.snapshot.paramMap.get('courseId') ||
      this.route.snapshot.queryParamMap.get('courseId');
    this.setCorrectOption('A');
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

  // --- Helper Methods for Preview ---
  hasImageTag(text: string): boolean {
    return !!text && text.includes('[IMG:');
  }

  extractFileId(text: string): string {
    if (!text) return '';
    const match = text.match(/\[IMG:([a-zA-Z0-9-]+)\]/);
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
      packageId: this.packageId || undefined
    };

    console.log('🔍 Creating question with blocks:', request);

    this.questionApi.createQuestion(request).subscribe({
      next: (question) => {
        console.log('✅ Question created successfully:', question);
        if (this.isDialog) {
          this.created.emit(question);
        } else {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          if (returnUrl) {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/teacher/quiz/quiz-bank']);
          }
        }
      },
      error: (error) => {
        console.error('Failed to create question:', error);
        alert('Lỗi khi tạo câu hỏi: ' + (error?.error?.message || error?.message));
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
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
        // EditorJS Image Tool returns: { file: { url: "http://localhost:8088/.../view/UUID" }, ... }
        // SOTA 2025: Extract UUID only - DO NOT store full URL (portability, R2 migration, PWA)
        const rawUrl = rest.url || rest.file?.url || rest.data?.file?.url || rest.data?.url || '';
        data.url = this.extractUuidFromUrl(rawUrl);
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
   * SOTA 2025: Extract UUID from full URL for portable storage
   * Input: "http://localhost:8088/api/v1/files/view/c75e2c59-8a48-41c8-838f-9a095e812cc8"
   * Output: "c75e2c59-8a48-41c8-838f-9a095e812cc8"
   */
  private extractUuidFromUrl(url: string): string {
    if (!url) return '';
    
    // If already a UUID (no slashes), return as-is
    if (!url.includes('/') && this.isValidUuid(url)) {
      return url;
    }
    
    // Extract last segment from URL path
    const segments = url.split('/');
    const lastSegment = segments.pop() || '';
    
    // Validate it's a UUID format
    if (this.isValidUuid(lastSegment)) {
      return lastSegment;
    }
    
    // Fallback: return original if can't extract UUID
    return url;
  }

  /**
   * Validate UUID format (v4)
   */
  private isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  onCancel(): void {
    if (this.isDialog) {
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
}

