
import { Component, OnInit, signal, input, output, inject, viewChild, viewChildren, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionApi } from '../../../api/endpoints/question.api';
import { QuestionBankApi } from '../../../api/endpoints/question-bank.api';
import { BlockEditorComponent } from '../../../shared/components/block-editor/block-editor.component';
import { EnrichedInputFieldComponent } from '../../../shared/components/enriched-input/enriched-input.component';
import { QuestionPreviewComponent } from '../../../shared/components/question-preview/question-preview.component';
import { ContentBlock } from '../../../api/types/content-block.types';

import { AuthImagePipe } from '../../../shared/pipes/auth-image.pipe';
import { ToastService } from '../../../core/services/toast.service';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-question-create',
  imports: [ReactiveFormsModule, LucideAngularModule, BlockEditorComponent, EnrichedInputFieldComponent, AuthImagePipe, QuestionPreviewComponent],
  templateUrl: './question-create.component.html',
  styles: [`@keyframes slideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`]
})
export class QuestionCreateComponent implements OnInit {
  // Signal inputs (Angular v20+)
  readonly isDialog = input(false);

  // Output functions (Angular v20+)
  readonly created = output<any>();
  readonly cancel = output<void>();

  questionForm: FormGroup;
  isLoading = signal(false);
  courseId: string | null = null;
  packageId: string | null = null;
  categoryId: string | null = null;
  showPreview = signal(false);
  showHelpCard = signal(false);
  bankName = signal<string | null>(null);

  // Signals for Content Blocks
  questionBlocks = signal<ContentBlock[]>([]);
  rawQuestionContent = signal<string>('');

  // SOTA 2025: Cached options for preview (prevents infinite re-render)
  _previewOptions = signal<{ key: string; content: string }[]>([]);

  // Track blocks for each option
  // Map index -> ContentBlock[]
  optionBlocksMap = new Map<number, ContentBlock[]>();

  // ViewChild for auto-focus editor on load
  readonly blockEditor = viewChild(BlockEditorComponent);

  // ViewChildren for auto-focus on new option
  readonly optionInputs = viewChildren(EnrichedInputFieldComponent);

  // Entrance animation tracking
  lastAddedIndex = signal<number | null>(null);

  // Injected dependencies
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly questionApi = inject(QuestionApi);
  private readonly toast = inject(ToastService);
  private readonly questionBankApi = inject(QuestionBankApi);

  // Question type state
  selectedType = signal<'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE'>('SINGLE_CHOICE');
  correctKeys = signal<Set<string>>(new Set(['A']));

  constructor() {
    this.questionForm = this.fb.group({
      questionType: ['SINGLE_CHOICE', Validators.required],
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

    if (this.packageId) {
      this.questionBankApi.getBankById(this.packageId).subscribe({
        next: (bank) => this.bankName.set(bank?.name || null),
        error: () => {}
      });
    }
  }

  // --- Block Handlers ---

  onEditorReady() {
    // Auto-focus the editor on page load (not in dialog mode)
    if (!this.isDialog()) {
      setTimeout(() => this.blockEditor()?.focusEditor(), 100);
    }
  }

  onQuestionContentChange(blocks: ContentBlock[]) {
    this.questionBlocks.set(blocks);
    this.rawQuestionContent.set(this.serializeBlocksForPreview(blocks));
    this.updatePreviewOptions();
  }

  /** Serialize EditorJS blocks to a raw string for preview rendering */
  private serializeBlocksForPreview(blocks: ContentBlock[]): string {
    return blocks.map((block: any) => {
      if (block.type === 'paragraph' || block.type === 'text') {
        return block.data?.text || block.content || '';
      } else if (block.type === 'image') {
        const url = block.data?.file?.url || block.data?.url || block.url || '';
        return url ? `[IMG:${url}]` : '';
      } else if (block.type === 'math' || block.type === 'formula') {
        const content = block.data?.text || block.data?.latex || block.content || '';
        return `$$${content}$$`;
      } else if (block.type === 'table') {
        const data = block.data || {};
        return `[TABLE:${JSON.stringify({ content: data.content || [], withHeadings: !!data.withHeadings })}]`;
      } else if (block.type === 'list') {
        const data = block.data || {};
        return `[LIST:${JSON.stringify({ style: data.style || 'unordered', items: data.items || [] })}]`;
      } else if (block.type === 'warning') {
        const data = block.data || {};
        return `[WARNING:${JSON.stringify({ title: data.title || '', message: data.message || '' })}]`;
      } else if (block.type === 'video') {
        const data = block.data || {};
        if (data.isYouTube && data.url) {
          return `[YTVID:${data.url}]`;
        }
        // Prefer rawUrl (original upload URL, not overwritten by HLS manifest)
        const url = data.rawUrl || data.url || '';
        const assetId = data.videoAssetId || '';
        return url ? `[VID:${url}]` : (assetId ? `[VID:${assetId}]` : '');
      }
      return '';
    }).filter(s => s.trim()).join(' ');
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
    this.updatePreviewOptions();
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

  createOptionGroup(optionKey: string, content = ''): FormGroup {
    return this.fb.group({
      optionKey: [optionKey],
      content: [content]
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

  onEnterOnEmptyOption(index: number): void {
    if (index === this.options.length - 1) {
      this.addOption();
    }
  }

  addOption(): void {
    const nextKey = String.fromCharCode(65 + this.options.length);
    const newIndex = this.options.length;
    this.options.push(this.createOptionGroup(nextKey));
    this.lastAddedIndex.set(newIndex);
    setTimeout(() => {
      const inputs = this.optionInputs();
      inputs[inputs.length - 1]?.focus();
    });
    setTimeout(() => this.lastAddedIndex.set(null), 300);
  }

  removeOption(index: number): void {
    if (this.options.length > 2) {
      const removedKey = this.getOptionKey(index);
      this.options.removeAt(index);
      this.reindexOptionBlocksMap(index);

      if (this.getCorrectOptionKey() === removedKey) {
        this.questionForm.patchValue({ correctOption: this.getOptionKey(0) });
      }
      this.updatePreviewOptions();
    }
  }

  setCorrectOption(optionKey: string): void {
    this.correctKeys.set(new Set([optionKey]));
    this.questionForm.patchValue({ correctOption: optionKey });
  }

  /** MULTIPLE_CHOICE: toggle a key in/out of the correct set */
  toggleCorrectKey(optionKey: string): void {
    const keys = new Set(this.correctKeys());
    if (keys.has(optionKey)) {
      keys.delete(optionKey);
    } else {
      keys.add(optionKey);
    }
    this.correctKeys.set(keys);
    this.questionForm.patchValue({ correctOption: [...keys].sort().join(',') });
    this.updatePreviewOptions();
  }

  onOptionRowClick(index: number, event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('textarea, input[type="radio"], input[type="checkbox"], button, app-enriched-input')) return;
    if (this.selectedType() === 'MULTIPLE_CHOICE') {
      this.toggleCorrectKey(this.getOptionKey(index));
    } else {
      this.setCorrectOption(this.getOptionKey(index));
    }
  }

  isOptionCorrect(index: number): boolean {
    const key = this.getOptionKey(index);
    if (this.selectedType() === 'MULTIPLE_CHOICE') {
      return this.correctKeys().has(key);
    }
    return this.getCorrectOptionKey() === key;
  }

  /** Handle question type change from selector */
  onTypeChange(newType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE'): void {
    const oldType = this.selectedType();
    if (newType === oldType) return;

    this.selectedType.set(newType);
    this.questionForm.patchValue({ questionType: newType });

    if (newType === 'TRUE_FALSE') {
      // Replace options with fixed "Đúng"/"Sai"
      this.options.clear();
      this.optionBlocksMap.clear();
      this.options.push(this.createOptionGroup('A', 'Đúng'));
      this.options.push(this.createOptionGroup('B', 'Sai'));
      this.correctKeys.set(new Set(['A']));
      this.questionForm.patchValue({ correctOption: 'A' });
    } else if (oldType === 'TRUE_FALSE') {
      // Switching away from TRUE_FALSE: restore 4 empty options
      this.options.clear();
      this.optionBlocksMap.clear();
      this.options.push(this.createOptionGroup('A'));
      this.options.push(this.createOptionGroup('B'));
      this.options.push(this.createOptionGroup('C'));
      this.options.push(this.createOptionGroup('D'));
      this.correctKeys.set(new Set());
      this.questionForm.patchValue({ correctOption: '' });
    }

    if (newType === 'SINGLE_CHOICE' && oldType === 'MULTIPLE_CHOICE') {
      // Keep only the first correct key
      const keys = [...this.correctKeys()].sort();
      const first = keys[0] || '';
      this.correctKeys.set(first ? new Set([first]) : new Set());
      this.questionForm.patchValue({ correctOption: first });
    }

    if (newType === 'MULTIPLE_CHOICE' && oldType === 'SINGLE_CHOICE') {
      // Migrate single key to set
      const current = this.getCorrectOptionKey();
      this.correctKeys.set(current ? new Set([current]) : new Set());
    }

    this.updatePreviewOptions();
  }

  getTypeSubtitle(): string {
    switch (this.selectedType()) {
      case 'SINGLE_CHOICE': return 'Trắc nghiệm · 1 đáp án đúng';
      case 'MULTIPLE_CHOICE': return 'Trắc nghiệm · nhiều đáp án đúng';
      case 'TRUE_FALSE': return 'Đúng / Sai';
    }
  }

  hasValidCorrectAnswer(): boolean {
    if (this.selectedType() === 'MULTIPLE_CHOICE') {
      return this.correctKeys().size > 0;
    }
    return !!this.getCorrectOptionKey();
  }

  onSubmit(): void {
    if (this.questionForm.invalid || !this.hasValidCorrectAnswer() || this.options.length < 2) {
      return;
    }

    // SOTA 2025: Prevent duplicate submissions
    if (this.isLoading()) return;

    this.isLoading.set(true);
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

    // Build type-specific answerKey
    const qType = this.selectedType();
    let answerKey: Record<string, unknown> | undefined;
    if (qType === 'MULTIPLE_CHOICE') {
      const keys = [...this.correctKeys()].sort();
      answerKey = { correctOptions: keys };
    } else if (qType === 'TRUE_FALSE') {
      answerKey = { correctOption: formValue.correctOption === 'A' ? 'TRUE' : 'FALSE' };
    }

    const request: any = {
      content: this.extractTextFromBlocks(this.questionBlocks()),
      blocks: this.transformToBackendBlocks(this.questionBlocks()),
      questionType: qType,
      correctOption: formValue.correctOption,
      answerKey,
      options: optionsList,
      optionBlocks: optionBlocksList.map(bl => this.transformToBackendBlocks(bl)),
      difficulty: formValue.difficulty,
      tags: formValue.tags,
      courseId: this.courseId || undefined,
      packageId: this.packageId || undefined,
      categoryId: this.categoryId || undefined
    };

    this.questionApi.createQuestion(request).subscribe({
      next: async (question) => {
        if (this.isDialog()) {
          try {
            const createdQuestion = await firstValueFrom(this.questionApi.getQuestionById(question.id));
            this.created.emit(createdQuestion);
          } catch {
            this.created.emit(question);
          }
          return;
        }

        const addToQuizLessonId = this.route.snapshot.queryParamMap.get('addToQuiz');
        const returnUrl = this.normalizeInternalReturnUrl(
          this.route.snapshot.queryParamMap.get('returnUrl')
        );

        if (addToQuizLessonId) {
          this.router.navigate(['/teacher/assessments/shared/question-bank'], {
            queryParams: this.buildQuestionBankReturnQueryParams(question.id)
          });
        } else if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else {
          // Navigate back to quiz-bank, preserving packageId selection
          this.router.navigate(['/teacher/assessments/shared/question-bank'], {
            queryParams: this.packageId ? { packageId: this.packageId } : {}
          });
        }
      },
      error: (error) => {
        this.toast.error('Lỗi khi tạo câu hỏi: ' + (error?.error?.message || error?.message));
        this.isLoading.set(false);
      },
      complete: () => {
        // Only set isLoading to false on ERROR. On success, we navigate away, so keep it true to prevent double clicks.
        // If isDialog is true, we might stay, so...
        if (this.isDialog()) {
          this.isLoading.set(false);
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
      } else if (type === 'video') {
        data.videoAssetId = rest.data?.videoAssetId || rest.videoAssetId || '';
        data.url = rest.data?.url || rest.url || '';
        data.caption = rest.data?.caption || rest.caption || '';
        data.mimeType = rest.data?.mimeType || rest.mimeType || 'video/mp4';
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

  private reindexOptionBlocksMap(removedIndex: number): void {
    const next = new Map<number, ContentBlock[]>();
    for (const [index, blocks] of this.optionBlocksMap.entries()) {
      if (index < removedIndex) {
        next.set(index, blocks);
      } else if (index > removedIndex) {
        next.set(index - 1, blocks);
      }
    }
    this.optionBlocksMap = next;
  }

  private buildQuestionBankReturnQueryParams(selectQuestionId?: string) {
    const queryParams: Record<string, string> = {};

    if (this.packageId) {
      queryParams['packageId'] = this.packageId;
    }

    if (this.categoryId) {
      queryParams['categoryId'] = this.categoryId;
    }

    const addToQuizLessonId = this.route.snapshot.queryParamMap.get('addToQuiz');
    if (addToQuizLessonId) {
      queryParams['addToQuiz'] = addToQuizLessonId;
    }

    const returnUrl = this.normalizeInternalReturnUrl(
      this.route.snapshot.queryParamMap.get('returnUrl')
    );
    if (returnUrl) {
      queryParams['returnUrl'] = returnUrl;
    }

    if (selectQuestionId) {
      queryParams['selectQuestionId'] = selectQuestionId;
    }

    return queryParams;
  }

  onCancel(): void {
    if (this.isDialog()) {
      this.cancel.emit();
      return;
    }
    const addToQuizLessonId = this.route.snapshot.queryParamMap.get('addToQuiz');
    const returnUrl = this.normalizeInternalReturnUrl(
      this.route.snapshot.queryParamMap.get('returnUrl')
    );
    if (addToQuizLessonId) {
      this.router.navigate(['/teacher/assessments/shared/question-bank'], {
        queryParams: this.buildQuestionBankReturnQueryParams()
      });
    } else if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/teacher/assessments/shared/question-bank'], {
        queryParams: this.packageId ? { packageId: this.packageId } : {}
      });
    }
  }

  private normalizeInternalReturnUrl(returnUrl: string | null): string | null {
    if (!returnUrl) {
      return null;
    }

    if (returnUrl.startsWith('/')) {
      return returnUrl;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const parsed = new URL(returnUrl, window.location.origin);
      if (parsed.origin !== window.location.origin) {
        return null;
      }

      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }
}
