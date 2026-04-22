import { Component, OnInit, signal, viewChild, viewChildren, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';

import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { QuestionBankApi } from '../../../api/endpoints/question-bank.api';
import { BlockEditorComponent } from '../../../shared/components/block-editor/block-editor.component';
import { EnrichedInputFieldComponent } from '../../../shared/components/enriched-input/enriched-input.component';
import { QuestionPreviewComponent } from '../../../shared/components/question-preview/question-preview.component';
import { ContentBlock } from '../../../api/types/content-block.types';
import { AuthImagePipe } from '../../../shared/pipes/auth-image.pipe';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-question-edit',
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    LucideAngularModule,
    BlockEditorComponent, 
    EnrichedInputFieldComponent,
    QuestionPreviewComponent,
    AuthImagePipe
  ],
  templateUrl: './question-edit.component.html',
  styles: [`@keyframes slideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`]
})
export class QuestionEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private questionApi = inject(QuestionApi);
  private toast = inject(ToastService);
  private questionBankApi = inject(QuestionBankApi);
  private confirmDialog = inject(ConfirmDialogService);

  questionForm: FormGroup;
  isLoading = signal(false);
  question: Question | null = null;
  questionId: string | null = null;
  packageId: string | null = null;
  bankName = signal<string | null>(null);

  // Question type state
  selectedType = signal<'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE'>('SINGLE_CHOICE');
  correctKeys = signal<Set<string>>(new Set());

  // Signals for Content Blocks
  questionBlocks = signal<ContentBlock[]>([]);
  rawQuestionContent = signal<string>('');
  showPreview = signal(false);
  showHelpCard = signal(false);

  // SOTA 2025: Cached options for preview
  _previewOptions = signal<{ key: string; content: string }[]>([]);

  // Track blocks for each option
  optionBlocksMap = new Map<number, ContentBlock[]>();

  readonly blockEditor = viewChild(BlockEditorComponent);
  readonly optionInputs = viewChildren(EnrichedInputFieldComponent);

  // Entrance animation tracking
  lastAddedIndex = signal<number | null>(null);

  constructor() {
    this.questionForm = this.fb.group({
      difficulty: ['MEDIUM', Validators.required],
      tags: [''],
      status: ['ACTIVE', Validators.required],
      options: this.fb.array([]),
      correctOption: ['', Validators.required]
    });
  }

  private returnUrl: string | null = null;
  private isDirty = false;

  ngOnInit(): void {
    this.questionId = this.route.snapshot.paramMap.get('questionId');
    this.packageId = this.route.snapshot.queryParamMap.get('packageId');
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (this.questionId) {
      this.loadQuestion();
    }
  }

  async loadQuestion() {
    this.isLoading.set(true);
    try {
      const question = await firstValueFrom(this.questionApi.getQuestionById(this.questionId!));
      if (question) {
        this.question = question;
        this.populateFormWithQuestion(question);

        const pkgId = this.packageId || (question as any).packageId || (question as any).bankId;
        if (pkgId) {
          this.packageId = pkgId;
          this.questionBankApi.getBankById(pkgId).subscribe({
            next: (bank) => this.bankName.set(bank?.name || null),
            error: () => {}
          });
        }
      }
    } catch (error) {
      console.error('Error loading question:', error);
      this.toast.error('Không thể tải thông tin câu hỏi. Vui lòng thử lại.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private populateFormWithQuestion(question: Question) {
    // 0. Question type
    const qType = (question.questionType || 'SINGLE_CHOICE') as 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
    this.selectedType.set(qType);

    // Parse correctKeys from correctOption (supports comma-separated for MULTIPLE_CHOICE)
    const correctOpt = question.correctOption || '';
    if (qType === 'MULTIPLE_CHOICE' && correctOpt.includes(',')) {
      this.correctKeys.set(new Set(correctOpt.split(',').map(k => k.trim())));
    } else if (correctOpt) {
      this.correctKeys.set(new Set([correctOpt]));
    }

    // 1. Basic Info
    this.questionForm.patchValue({
      difficulty: question.difficulty,
      tags: question.tags,
      status: question.status,
      correctOption: question.correctOption
    });

    // 2. Options
    const optionsArray = this.options;
    optionsArray.clear();
    
    if (question.options && question.options.length > 0) {
      question.options.forEach((opt, index) => {
        const hydratedBlocks = opt.contentBlocks ? this.transformFromBackendBlocks(opt.contentBlocks) : [];
        const hydratedContent = hydratedBlocks.length > 0
          ? this.serializeBlocksToInlineValue(hydratedBlocks)
          : opt.content;

        optionsArray.push(this.fb.group({
          optionKey: [opt.optionKey],
          content: [hydratedContent]
        }));

        if (hydratedBlocks.length > 0) {
          this.optionBlocksMap.set(index, hydratedBlocks);
        }
      });
    }

    // 3. Question Content Blocks
    const rawBlocks = (question as any).blocks || (question as any).contentBlocks;
    let blocks: ContentBlock[] = [];

    if (rawBlocks && rawBlocks.length > 0) {
      blocks = this.transformQuestionBlocksForEditor(rawBlocks);
    } else {
      blocks = this.parseRawText(question.content);
    }
    
    this.questionBlocks.set(blocks);
    this.updateRawQuestionContent(blocks);
    this.updatePreviewOptions();
  }

  // --- Block Handlers ---

  onQuestionContentChange(blocks: ContentBlock[]) {
    this.isDirty = true;
    this.questionBlocks.set(blocks);
    this.updateRawQuestionContent(blocks);
    this.updatePreviewOptions();
  }

  private updateRawQuestionContent(blocks: ContentBlock[]) {
    const rawContent = blocks.map((block: any) => {
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
    this.rawQuestionContent.set(rawContent);
  }

  updateOptionText(index: number, text: string) {
    this.options.at(index).get('content')?.setValue(text);
    this.updatePreviewOptions();
  }

  updateOptionBlocks(index: number, blocks: ContentBlock[]) {
    this.optionBlocksMap.set(index, blocks);
    this.updatePreviewOptions();
  }

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

  // --- Form Accessors ---

  get options(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  getOptionKey(index: number): string {
    return this.options.at(index).get('optionKey')?.value;
  }

  getCorrectOptionKey(): string | null {
    return this.questionForm.get('correctOption')?.value;
  }

  setCorrectOption(optionKey: string): void {
    this.correctKeys.set(new Set([optionKey]));
    this.questionForm.patchValue({ correctOption: optionKey });
    this.updatePreviewOptions();
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

  hasValidCorrectAnswer(): boolean {
    if (this.selectedType() === 'MULTIPLE_CHOICE') {
      return this.correctKeys().size > 0;
    }
    return !!this.getCorrectOptionKey();
  }

  onEnterOnEmptyOption(index: number): void {
    if (index === this.options.length - 1) {
      this.addOption();
    }
  }

  addOption(): void {
    const nextKey = String.fromCharCode(65 + this.options.length);
    const newIndex = this.options.length;
    this.options.push(this.fb.group({
      optionKey: [nextKey],
      content: ['']
    }));
    this.updatePreviewOptions();
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

  // --- Helpers ---

  /** Truncated question text for breadcrumb (matches quiz-edit title pattern) */
  getQuestionPreviewTitle(): string {
    if (!this.question) return 'Đang tải...';
    const content = this.question.content || '';
    const text = content.replace(/<[^>]*>/g, '').trim();
    if (!text) return `Câu hỏi #${this.question.id.substring(0, 8)}`;
    return text.length > 50 ? text.substring(0, 50) + '…' : text;
  }

  getQuestionTypeLabel(): string {
    switch (this.question?.questionType) {
      case 'SINGLE_CHOICE': return 'Trắc nghiệm';
      case 'MULTIPLE_CHOICE': return 'Nhiều đáp án';
      case 'TRUE_FALSE': return 'Đúng/Sai';
      case 'FILL_IN_BLANK': return 'Điền từ';
      case 'SHORT_ANSWER': return 'Trả lời ngắn';
      case 'ESSAY': return 'Tự luận';
      default: return 'Câu hỏi';
    }
  }

  getDifficultyLabel(): string {
    switch (this.question?.difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return '';
    }
  }

  getStatusBadgeClass(): string {
    switch (this.question?.status) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700';
      case 'INACTIVE': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  getStatusText(status?: string): string {
    switch (status) {
      case 'DRAFT': return 'Bản nháp';
      case 'ACTIVE': return 'Hoạt động';
      case 'INACTIVE': return 'Ngừng hoạt động';
      default: return status || 'Không xác định';
    }
  }

  hasImageTag(text: string): boolean {
    return !!text && text.includes('[IMG:');
  }

  extractFileId(text: string): string {
    if (!text) return '';
    const match = text.match(/\[IMG:([^\]]+)\]/);
    return match ? match[1] : '';
  }

  onSubmit(): void {
    if (this.questionForm.invalid || !this.hasValidCorrectAnswer() || this.options.length < 2 || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    const formValue = this.questionForm.getRawValue();

    const optionsList: string[] = [];
    const optionBlocksList: any[][] = [];

    for (let i = 0; i < this.options.length; i++) {
      const text = this.options.at(i).get('content')?.value || '';
      optionsList.push(text);

      const blocks = this.optionBlocksMap.get(i) || [{
        id: crypto.randomUUID(),
        type: 'text',
        content: text
      }];
      optionBlocksList.push(this.transformToBackendBlocks(blocks));
    }

    // Build type-specific answerKey
    const qType = this.selectedType();
    let answerKey: Record<string, unknown>;
    if (qType === 'MULTIPLE_CHOICE') {
      answerKey = { correctOptions: [...this.correctKeys()].sort() };
    } else if (qType === 'TRUE_FALSE') {
      answerKey = { correctOption: formValue.correctOption === 'A' ? 'TRUE' : 'FALSE' };
    } else {
      answerKey = { correctOption: formValue.correctOption };
    }

    const request: any = {
      content: this.extractTextFromBlocks(this.questionBlocks()),
      blocks: this.transformToBackendBlocks(this.questionBlocks()),
      questionType: qType,
      correctOption: formValue.correctOption,
      answerKey,
      options: optionsList,
      optionBlocks: optionBlocksList,
      difficulty: formValue.difficulty,
      tags: formValue.tags,
      status: formValue.status
    };

    this.questionApi.updateQuestion(this.questionId!, request).subscribe({
      next: () => {
        this.isDirty = false;
        this.toast.success('Đã cập nhật câu hỏi thành công!');
        this.navigateBack();
      },
      error: (error) => {
        this.toast.error('Lỗi khi cập nhật câu hỏi: ' + (error?.error?.message || error?.message));
        this.isLoading.set(false);
      }
    });
  }

  onCancel(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }
    this.router.navigate(['/teacher/assessments/shared/question-bank'], {
      queryParams: this.packageId ? { packageId: this.packageId } : {}
    });
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.isDirty) return true;
    return this.confirmDialog.confirm({
      title: 'Rời màn chỉnh sửa câu hỏi',
      message: 'Bạn có thay đổi chưa lưu. Nếu rời màn này, các chỉnh sửa sẽ bị mất.',
      variant: 'warning',
      confirmText: 'Rời màn này',
      cancelText: 'Ở lại'
    });
  }

  // --- Data Transformation ---

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
        const fileObj = rest.file || rest.data?.file || {};
        const url = fileObj.url || rest.url || rest.data?.url || '';
        data.file = { url: url, id: fileObj.id, storageKey: fileObj.storageKey };
        data.url = url;
        data.caption = rest.caption || rest.data?.caption || '';
      } else if (type === 'paragraph') {
        data.text = rest.text || rest.data?.text || '';
      } else if (type === 'video') {
        data.videoAssetId = rest.data?.videoAssetId || rest.videoAssetId || '';
        data.url = rest.data?.url || rest.url || '';
        data.caption = rest.data?.caption || rest.caption || '';
        data.mimeType = rest.data?.mimeType || rest.mimeType || 'video/mp4';
      } else {
        Object.assign(data, rest.data || rest);
      }

      return { id, type, data };
    });
  }

  private transformFromBackendBlocks(backendBlocks: any[]): ContentBlock[] {
    return backendBlocks.map(b => {
      const { id, type, data } = b;
      const block: any = { id, type };

      if (type === 'text') {
        block.content = data.html || data.text || '';
      } else if (type === 'formula') {
        block.content = data.latex || '';
        block.format = data.format || 'inline';
      } else if (type === 'image') {
        block.url = data.file?.url || data.url || '';
        block.caption = data.caption || '';
      } else if (type === 'paragraph') {
        block.type = 'text';
        block.content = data.text || '';
      } else if (type === 'video') {
        block.data = {
          videoAssetId: data.videoAssetId || '',
          url: data.url || '',
          caption: data.caption || '',
          mimeType: data.mimeType || 'video/mp4'
        };
      } else {
        block.data = data;
      }

      return block;
    });
  }

  private transformQuestionBlocksForEditor(backendBlocks: any[]): ContentBlock[] {
    return backendBlocks.map((block: any) => {
      const { id, type, data } = block;

      if (type === 'text') {
        return {
          id,
          type: 'paragraph',
          data: { text: data?.html || data?.text || '' }
        } as any;
      }

      if (type === 'paragraph') {
        return {
          id,
          type: 'paragraph',
          data: { text: data?.text || data?.html || '' }
        } as any;
      }

      if (type === 'image') {
        const url = data?.file?.url || data?.url || '';
        return {
          id,
          type: 'image',
          data: {
            file: {
              url,
              id: data?.file?.id,
              storageKey: data?.file?.storageKey
            },
            url,
            caption: data?.caption || ''
          }
        } as any;
      }

      if (type === 'formula') {
        return {
          id,
          type: 'math',
          data: {
            latex: data?.latex || data?.text || '',
            format: data?.format || 'inline'
          }
        } as any;
      }

      if (type === 'video') {
        return {
          id,
          type: 'video',
          data: {
            videoAssetId: data?.videoAssetId || '',
            url: data?.url || '',
            caption: data?.caption || '',
            mimeType: data?.mimeType || 'video/mp4'
          }
        } as any;
      }

      return block;
    });
  }

  private parseRawText(content: string): ContentBlock[] {
    if (!content) return [];
    return [{
      id: crypto.randomUUID(),
      type: 'text',
      content: content
    }];
  }

  private serializeBlocksToInlineValue(blocks: ContentBlock[]): string {
    return blocks.map((block: any) => {
      if (block.type === 'text') {
        return block.content || '';
      }
      if (block.type === 'formula') {
        const latex = block.content || '';
        const format = block.format || 'inline';
        return format === 'display' ? `$$${latex}$$` : `$${latex}$`;
      }
      if (block.type === 'image') {
        const idOrUrl = block.url || block.data?.url || block.data?.file?.url || '';
        return idOrUrl ? `[IMG:${idOrUrl}]` : '';
      }
      return '';
    }).filter(Boolean).join(' ').trim();
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

}
