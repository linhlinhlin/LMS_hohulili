import { Component, inject, output , ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { SectionEditorState } from '../../state/section-editor.state';

@Component({
  selector: 'app-add-questions-modal',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    @if (state.showInlineAddQuestionsModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" (click)="onClose()"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Thêm câu hỏi từ Ngân hàng</h3>
              <p class="text-sm text-gray-500 mt-1">Chọn gói câu hỏi và thêm vào quiz</p>
            </div>
            <button (click)="onClose()" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            <!-- Package Selector -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Chọn gói câu hỏi</label>
              <select [(ngModel)]="state.inlinePackageId"
                      (ngModelChange)="onPackageChange($event)"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]">
                <option value="">-- Chọn gói --</option>
                @for (pkg of state.quizPackages(); track pkg.id) {
                  <option [value]="pkg.id">{{ pkg.name }} ({{ pkg.questionCount || 0 }} câu)</option>
                }
              </select>
            </div>

            <!-- Questions List -->
            @if (state.inlinePackageQuestions().length > 0) {
              <div class="border border-gray-200 rounded-lg overflow-hidden">
                <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">
                    Đã chọn {{ state.selectedInlineQuestions().length }}/{{ state.inlinePackageQuestions().length }}
                  </span>
                  <button (click)="state.selectAllInlineQuestions()"
                          class="text-sm text-[#0056D2] hover:text-[#004BB5] font-medium">
                    {{ state.selectedInlineQuestions().length === state.inlinePackageQuestions().length ? 'Bỏ chọn tất cả' : 'Chọn tất cả' }}
                  </button>
                </div>
                <div class="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                  @for (q of state.inlinePackageQuestions(); track q.id) {
                    <div class="p-4 hover:bg-[#0056D2]/5 cursor-pointer transition-colors"
                         (click)="state.toggleInlineQuestion(q.id)">
                      <div class="flex items-start gap-3">
                        <input type="checkbox"
                               [checked]="state.selectedInlineQuestions().includes(q.id)"
                               class="mt-1 w-4 h-4 text-[#0056D2] border-gray-300 rounded focus:ring-[#0056D2]"
                               (click)="$event.stopPropagation()">
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-gray-900">{{ q.content }}</p>
                          <div class="flex items-center gap-2 mt-2">
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                                  [class.bg-green-100]="q.difficulty === 'EASY'"
                                  [class.text-green-700]="q.difficulty === 'EASY'"
                                  [class.bg-yellow-100]="q.difficulty === 'MEDIUM'"
                                  [class.text-yellow-700]="q.difficulty === 'MEDIUM'"
                                  [class.bg-red-100]="q.difficulty === 'HARD'"
                                  [class.text-red-700]="q.difficulty === 'HARD'">
                              {{ getDifficultyLabel(q.difficulty) }}
                            </span>
                            @if (q.tags) {
                              <span class="text-xs text-gray-500">{{ q.tags }}</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Empty State -->
            @if (state.inlinePackageId && state.inlinePackageQuestions().length === 0) {
              <div class="text-center py-8 text-gray-500">
                <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                </svg>
                <p>Gói câu hỏi này chưa có câu hỏi nào</p>
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button (click)="onClose()"
                    class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium">
              Hủy
            </button>
            <button (click)="onAdd()"
                    [disabled]="state.selectedInlineQuestions().length === 0 || state.addingInlineQuestions()"
                    class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              @if (state.addingInlineQuestions()) {
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang thêm...
              } @else {
                Thêm {{ state.selectedInlineQuestions().length }} câu hỏi
              }
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class AddQuestionsModalComponent {
  readonly state = inject(SectionEditorState);

  added = output<{ added: number; skipped: number }>();
  closed = output<void>();

  async onPackageChange(packageId: string): Promise<void> {
    await this.state.loadPackageQuestions(packageId);
  }

  async onAdd(): Promise<void> {
    const result = await this.state.addSelectedQuestionsToQuiz();
    this.added.emit(result);
    if (result.added > 0 || result.skipped === this.state.selectedInlineQuestions().length) {
      this.state.closeAddQuestionsModal();
    }
  }

  onClose(): void {
    this.state.closeAddQuestionsModal();
    this.closed.emit();
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return difficulty;
    }
  }
}
