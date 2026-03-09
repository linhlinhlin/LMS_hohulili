import { Component, OnInit, signal, viewChild, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';

import { QuestionApi, Question, UpdateQuestionRequest } from '../../../api/endpoints/question.api';
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
  template: `
    <div class="min-h-screen bg-slate-50/50 p-3">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-6 flex justify-between items-start bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <lucide-icon name="edit-3" class="text-[#0056D2]" [size]="24"></lucide-icon>
              <h1 class="text-2xl font-black text-slate-900 tracking-tight">Chỉnh sửa Câu Hỏi</h1>
            </div>
            <p class="text-sm text-slate-500 font-medium italic">Cập nhật nội dung và tùy chọn cho câu hỏi trắc nghiệm</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" (click)="showPreview.set(true)"
              class="h-10 px-4 border border-slate-200 rounded-xl bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 shadow-sm">
              <lucide-icon name="eye" [size]="16"></lucide-icon>
              Xem trước
            </button>
            <button type="button" (click)="onSubmit()" [disabled]="questionForm.invalid || isLoading() || options.length < 2"
              class="h-10 px-6 bg-[#0056D2] text-white rounded-xl font-bold text-sm hover:bg-[#004BB5] transition-all flex items-center gap-2 shadow-md shadow-blue-100 disabled:opacity-50">
              <lucide-icon name="save" [size]="18"></lucide-icon>
              Lưu thay đổi
            </button>
          </div>
        </div>
    
        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex flex-col justify-center items-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div class="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-[#0056D2] mb-4"></div>
            <span class="text-slate-500 font-black uppercase tracking-widest text-xs">Đang tải dữ liệu...</span>
          </div>
        }
    
        <!-- Question Edit Form -->
        @if (!isLoading()) {
          <form [formGroup]="questionForm" (ngSubmit)="onSubmit()" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Left Column: Content & Options -->
            <div class="lg:col-span-2 space-y-6">
              
              <!-- Question Content Block Editor -->
              <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h2 class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nội dung câu hỏi</h2>
                  <div class="flex items-center gap-2 text-slate-300">
                    <lucide-icon name="type" [size]="14"></lucide-icon>
                    <lucide-icon name="image" [size]="14"></lucide-icon>
                    <lucide-icon name="sigma" [size]="14"></lucide-icon>
                  </div>
                </div>
                <div class="p-6">
                  <div class="min-h-[210px]">
                    <app-block-editor
                      #blockEditor
                      [initialBlocks]="questionBlocks()"
                      (blocksChange)="onQuestionContentChange($event)">
                    </app-block-editor>
                  </div>
                  @if (questionBlocks().length === 0 && questionForm.touched) {
                    <div class="text-rose-500 text-[10px] font-black uppercase tracking-wider mt-3 flex items-center gap-1">
                      <lucide-icon name="alert-circle" [size]="12"></lucide-icon>
                      Nội dung câu hỏi không được để trống
                    </div>
                  }
                </div>
              </div>

              <!-- Options -->
              <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-500">
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h2 class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Danh sách đáp án</h2>
                  <button type="button" (click)="addOption()"
                    class="text-[#0056D2] hover:text-[#004BB5] font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                    <lucide-icon name="plus-circle" [size]="14"></lucide-icon>
                    Thêm đáp án
                  </button>
                </div>
                
                <div class="p-6">
                  <div formArrayName="options" class="space-y-3">
                    @for (option of options.controls; track $index; let i = $index) {
                      <div [formGroupName]="i"
                        class="group relative flex items-center gap-3 p-1.5 rounded-xl border-2 transition-all"
                        [class.border-emerald-500]="getCorrectOptionKey() === getOptionKey(i)"
                        [class.bg-emerald-50/30]="getCorrectOptionKey() === getOptionKey(i)"
                        [class.border-slate-100]="getCorrectOptionKey() !== getOptionKey(i)">
                        
                        <!-- Option Key (A, B, C...) -->
                        <div class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm transition-colors"
                          [class.bg-emerald-500]="getCorrectOptionKey() === getOptionKey(i)"
                          [class.text-white]="getCorrectOptionKey() === getOptionKey(i)"
                          [class.bg-slate-100]="getCorrectOptionKey() !== getOptionKey(i)"
                          [class.text-slate-400]="getCorrectOptionKey() !== getOptionKey(i)">
                          {{ getOptionKey(i) }}
                        </div>

                        <!-- Enriched Input -->
                        <div class="flex-1 min-w-0 relative">
                          <app-enriched-input
                            [placeholder]="'Nhập nội dung đáp án...'"
                            [initialValue]="option.get('content')?.value"
                            (valueChange)="updateOptionText(i, $event)"
                            (blocksChange)="updateOptionBlocks(i, $event)">
                          </app-enriched-input>

                          <!-- Mini Preview for Option Image -->
                          @if (hasImageTag(options.at(i).get('content')?.value)) {
                            <div class="absolute right-12 top-1.5 z-10">
                              <img [src]="extractFileId(options.at(i).get('content')?.value) | authImage"
                                class="w-7 h-7 rounded border border-slate-200 shadow-sm object-cover bg-white hover:scale-[3] transition-transform origin-right cursor-zoom-in">
                            </div>
                          }
                        </div>

                        <!-- Action Controls: Correct Toggle & Remove -->
                        <div class="flex items-center gap-1 pr-2">
                           <button type="button" (click)="setCorrectOption(getOptionKey(i))"
                             class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                             [class.text-emerald-600]="getCorrectOptionKey() === getOptionKey(i)"
                             [class.bg-emerald-100]="getCorrectOptionKey() === getOptionKey(i)"
                             [class.text-slate-300]="getCorrectOptionKey() !== getOptionKey(i)"
                             [class.hover:text-emerald-400]="getCorrectOptionKey() !== getOptionKey(i)"
                             title="Đánh dấu là câu trả lời đúng">
                             <lucide-icon name="check-circle-2" [size]="20"></lucide-icon>
                           </button>

                           @if (options.length > 2) {
                             <button type="button" (click)="removeOption(i)"
                               class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                               title="Xóa đáp án">
                               <lucide-icon name="trash-2" [size]="16"></lucide-icon>
                             </button>
                           }
                        </div>
                      </div>
                    }
                  </div>

                  @if (!getCorrectOptionKey()) {
                    <div class="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
                      <lucide-icon name="alert-triangle" class="text-amber-500" [size]="18"></lucide-icon>
                      <span class="text-xs font-bold text-amber-700">Lưu ý: Bạn cần đánh dấu ít nhất một đáp án đúng.</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Right Column: Metadata & Actions -->
            <div class="space-y-6 text-slate-500">
              
              <!-- Difficulty & Tags -->
              <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <h2 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3">Phân loại & Độ khó</h2>
                
                <div>
                  <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Độ khó câu hỏi</label>
                  <select formControlName="difficulty"
                    class="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all cursor-pointer">
                    <option value="EASY">Dễ (Dành cho mới bắt đầu)</option>
                    <option value="MEDIUM">Trung bình (Phổ biến)</option>
                    <option value="HARD">Khó (Nâng cao)</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Thẻ phân loại (Tags)</label>
                  <div class="relative">
                    <lucide-icon name="tag" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" [size]="16"></lucide-icon>
                    <input type="text" formControlName="tags"
                      class="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all placeholder:text-slate-400"
                      placeholder="Toán học, Hàng hải..."/>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-2 font-medium italic">Phân cách các thẻ bằng dấu phẩy (,)</p>
                </div>

                <div>
                  <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Trạng thái câu hỏi</label>
                  <select formControlName="status"
                    class="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#0056D2]/5 focus:border-[#0056D2] outline-none transition-all cursor-pointer">
                    <option value="DRAFT">Bản nháp ( Draft )</option>
                    <option value="ACTIVE">Hoạt động ( Active )</option>
                    <option value="INACTIVE">Ngừng hoạt động ( Inactive )</option>
                  </select>
                </div>
              </div>

              <!-- Question Info -->
              <div class="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                 <h2 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 opacity-50">Thông tin hệ thống</h2>
                 <div class="space-y-4">
                    <div class="flex justify-between items-center">
                       <span class="text-xs font-bold text-slate-400">ID Câu hỏi</span>
                       <span class="text-[10px] bg-white/10 px-2 py-1 rounded font-mono">{{ question?.id?.substring(0, 8) }}...</span>
                    </div>
                    <div class="flex justify-between items-center">
                       <span class="text-xs font-bold text-slate-400">Đã cập nhật</span>
                       <span class="text-xs font-black">{{ (question?.updatedAt || '') | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                 </div>
              </div>

              <!-- Page Actions -->
              <div class="flex flex-col gap-2 pt-4">
                <button type="button" (click)="onCancel()"
                  class="h-11 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs transition-all uppercase tracking-widest">
                  Hủy bỏ
                </button>
              </div>
            </div>
          </form>
        }
      </div>

      <!-- Preview Modal -->
      @if (showPreview()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-in fade-in duration-200"
          (click)="showPreview.set(false)">
          <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="bg-slate-50 px-8 py-5 flex justify-between items-center border-b border-slate-100">
              <div>
                <span class="text-[10px] font-black text-[#0056D2] uppercase tracking-widest mb-1 block">Chế độ xem trước</span>
                <h3 class="text-xl font-black text-slate-900 tracking-tight">Cấu trúc hiển thị câu hỏi</h3>
              </div>
              <button (click)="showPreview.set(false)"
                class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-200 text-slate-400 transition-all">
                <lucide-icon name="x" [size]="20"></lucide-icon>
              </button>
            </div>
            <!-- Modal Content -->
            <div class="p-8 overflow-y-auto flex-1">
              <app-question-preview
                [questionContent]="getQuestionContentForPreview()"
                [optionsList]="_previewOptions()"
                [correctOption]="getCorrectOptionKey() || ''"
                [showCorrectAnswer]="true">
              </app-question-preview>
            </div>
          </div>
        </div>
      }
    </div>
  `,
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
        optionsArray.push(this.fb.group({
          optionKey: [opt.optionKey],
          content: [opt.content]
        }));
        
        // Populate option blocks if available
        const optBlocks = (question as any).optionBlocks ? (question as any).optionBlocks[index] : null;
        if (optBlocks) {
          this.optionBlocksMap.set(index, this.transformFromBackendBlocks(optBlocks));
        }
      });
    }

    // 3. Question Content Blocks
    const rawBlocks = (question as any).blocks || (question as any).contentBlocks;
    let blocks: ContentBlock[] = [];

    if (rawBlocks && rawBlocks.length > 0) {
      blocks = this.transformFromBackendBlocks(rawBlocks);
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
      this.optionBlocksMap.delete(index);

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

  private parseRawText(content: string): ContentBlock[] {
    if (!content) return [];
    return [{
      id: crypto.randomUUID(),
      type: 'text',
      content: content
    }];
  }

  // --- Preview Helpers ---
  getQuestionContentForPreview(): string {
    return this.rawQuestionContent();
  }
}
