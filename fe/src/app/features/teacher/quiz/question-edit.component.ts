import { Component, OnInit, signal, viewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';

import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { BlockEditorComponent } from '../../../shared/components/block-editor/block-editor.component';
import { EnrichedInputFieldComponent } from '../../../shared/components/enriched-input/enriched-input.component';
import { QuestionPreviewComponent } from '../../../shared/components/question-preview/question-preview.component';
import { ContentBlock } from '../../../api/types/content-block.types';
import { AuthImagePipe } from '../../../shared/pipes/auth-image.pipe';
import { ToastService } from '../../../core/services/toast.service';

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
})
export class QuestionEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private questionApi = inject(QuestionApi);
  private toast = inject(ToastService);

  questionForm: FormGroup;
  isLoading = signal(false);
  question: Question | null = null;
  questionId: string | null = null;

  // Signals for Content Blocks
  questionBlocks = signal<ContentBlock[]>([]);
  rawQuestionContent = signal<string>('');
  showPreview = signal(false);

  // SOTA 2025: Cached options for preview
  _previewOptions = signal<{ key: string; content: string }[]>([]);

  // Track blocks for each option
  optionBlocksMap = new Map<number, ContentBlock[]>();

  readonly blockEditor = viewChild(BlockEditorComponent);

  constructor() {
    this.questionForm = this.fb.group({
      difficulty: ['MEDIUM', Validators.required],
      tags: [''],
      status: ['ACTIVE', Validators.required],
      options: this.fb.array([]),
      correctOption: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.questionId = this.route.snapshot.paramMap.get('questionId');
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
      }
    } catch (error) {
      console.error('Error loading question:', error);
      this.toast.error('Không thể tải thông tin câu hỏi. Vui lòng thử lại.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private populateFormWithQuestion(question: Question) {
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
    this.questionBlocks.set(blocks);
    this.updateRawQuestionContent(blocks);
    this.updatePreviewOptions();
  }

  private updateRawQuestionContent(blocks: ContentBlock[]) {
    const rawContent = blocks.map((block: any) => {
      if (block.type === 'paragraph' || block.type === 'text') {
        const text = block.data?.text || block.content || '';
        return text;
      } else if (block.type === 'image') {
        const url = block.data?.file?.url || block.data?.url || block.url || '';
        return url ? `[IMG:${url}]` : '';
      } else if (block.type === 'math' || block.type === 'formula') {
        const content = block.data?.text || block.content || '';
        return `$$${content}$$`;
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
    this.questionForm.patchValue({ correctOption: optionKey });
    this.updatePreviewOptions();
  }

  addOption(): void {
    const nextKey = String.fromCharCode(65 + this.options.length);
    this.options.push(this.fb.group({
      optionKey: [nextKey],
      content: ['']
    }));
    this.updatePreviewOptions();
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
    if (this.questionForm.invalid || !this.getCorrectOptionKey() || this.options.length < 2 || this.isLoading()) {
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

    const request: any = {
      content: this.extractTextFromBlocks(this.questionBlocks()),
      blocks: this.transformToBackendBlocks(this.questionBlocks()),
      correctOption: formValue.correctOption,
      options: optionsList,
      optionBlocks: optionBlocksList,
      difficulty: formValue.difficulty,
      tags: formValue.tags,
      status: formValue.status
    };

    this.questionApi.updateQuestion(this.questionId!, request).subscribe({
      next: () => {
        this.toast.success('Đã cập nhật câu hỏi thành công!');
        this.router.navigate(['/teacher/quiz/quiz-bank'], {
          queryParams: { packageId: (this.question as any).packageId || (this.question as any).bankId }
        });
      },
      error: (error) => {
        this.toast.error('Lỗi khi cập nhật câu hỏi: ' + (error?.error?.message || error?.message));
        this.isLoading.set(false);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/teacher/quiz/quiz-bank']);
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

  // --- Preview Helpers ---
  getQuestionContentForPreview(): string {
    return this.rawQuestionContent();
  }
}
