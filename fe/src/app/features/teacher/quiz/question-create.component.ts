
import { Component, OnInit, signal, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionApi } from '../../../api/endpoints/question.api';
import { BlockEditorComponent } from '../../../shared/components/block-editor/block-editor.component';
import { EnrichedInputFieldComponent } from '../../../shared/components/enriched-input/enriched-input.component';
import { QuestionPreviewComponent } from '../../../shared/components/question-preview/question-preview.component';
import { ContentBlock } from '../../../api/types/content-block.types';

import { AuthImagePipe } from '../../../shared/pipes/auth-image.pipe';
import { ToastService } from '../../../core/services/toast.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-question-create',
  imports: [ReactiveFormsModule, LucideAngularModule, BlockEditorComponent, EnrichedInputFieldComponent, AuthImagePipe, QuestionPreviewComponent],
  templateUrl: './question-create.component.html',
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

