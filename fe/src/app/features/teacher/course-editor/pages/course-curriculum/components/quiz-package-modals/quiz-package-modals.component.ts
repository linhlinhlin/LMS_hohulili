import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PackageApi } from '../../../../../../../api/endpoints/package.api';
import { ToastService } from '../../../../../../../core/services/toast.service';
import { CurriculumEditorService } from '../../../../services/curriculum-editor.service';

/**
 * Quiz Package Modals — self-contained component for quiz bank + random question selection.
 *
 * Manages its own package loading and question selection state.
 * Writes selected questions to CurriculumEditorService.sectionQuizSelectedQuestions.
 * Visibility controlled by CurriculumEditorService.showSectionQuizBankModal / showSectionQuizRandomModal.
 */
@Component({
  selector: 'app-quiz-package-modals',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <!-- ═══ Quiz Bank Modal ═══ -->
    @if (svc.showSectionQuizBankModal()) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
           (click)="svc.showSectionQuizBankModal.set(false)">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
             (click)="$event.stopPropagation()"
             role="dialog" aria-modal="true" aria-labelledby="quiz-bank-title" tabindex="-1">

          <!-- Header -->
          <div class="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 id="quiz-bank-title" class="text-lg font-semibold text-gray-900">Chọn câu hỏi từ ngân hàng</h3>
            <button (click)="svc.showSectionQuizBankModal.set(false)"
              class="rounded p-1 text-gray-400 hover:text-gray-600" aria-label="Đóng">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Chọn gói câu hỏi</label>
              <select [(ngModel)]="selectedPackageId" (change)="loadPackageQuestions()"
                class="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white text-sm">
                <option value="">-- Chọn gói câu hỏi --</option>
                @for (pkg of packages(); track pkg.id) {
                  <option [value]="pkg.id">{{ pkg.name }} ({{ pkg.questionCount || 0 }} câu)</option>
                }
              </select>
            </div>

            @if (questions().length > 0) {
              <div class="border border-gray-200 rounded-lg overflow-hidden">
                <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <span class="text-sm font-medium">Danh sách câu hỏi</span>
                  <div class="flex items-center gap-2">
                    <button (click)="selectAll()" class="text-xs text-rose-600 hover:underline">Chọn tất cả</button>
                    <button (click)="clearSelection()" class="text-xs text-gray-600 hover:underline">Bỏ chọn</button>
                  </div>
                </div>
                <div class="max-h-64 overflow-y-auto p-3 space-y-2">
                  @for (q of questions(); track q.id) {
                    <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                      [class.border-rose-500]="selectedIds().has(q.id)"
                      [class.bg-rose-50]="selectedIds().has(q.id)">
                      <input type="checkbox" [checked]="selectedIds().has(q.id)"
                        (change)="toggleQuestion(q.id)" class="mt-1 h-4 w-4 text-rose-600 rounded" />
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-900">{{ q.content }}</p>
                        <span class="text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block"
                          [class.bg-green-100]="q.difficulty === 'EASY'"
                          [class.text-green-700]="q.difficulty === 'EASY'"
                          [class.bg-yellow-100]="q.difficulty === 'MEDIUM'"
                          [class.text-yellow-700]="q.difficulty === 'MEDIUM'"
                          [class.bg-red-100]="q.difficulty === 'HARD'"
                          [class.text-red-700]="q.difficulty === 'HARD'">
                          {{ q.difficulty === 'EASY' ? 'Dễ' : q.difficulty === 'MEDIUM' ? 'TB' : 'Khó' }}
                        </span>
                      </div>
                    </label>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="p-5 border-t border-gray-200 flex justify-end gap-3">
            <button (click)="svc.showSectionQuizBankModal.set(false)"
              class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Hủy bỏ</button>
            <button (click)="addFromBank()" [disabled]="selectedIds().size === 0"
              class="px-4 py-2 text-sm font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors">
              Thêm {{ selectedIds().size }} câu hỏi
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ═══ Quiz Random Modal ═══ -->
    @if (svc.showSectionQuizRandomModal()) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
           (click)="svc.showSectionQuizRandomModal.set(false)">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4"
             (click)="$event.stopPropagation()"
             role="dialog" aria-modal="true" aria-labelledby="quiz-random-title" tabindex="-1">

          <div class="p-5 border-b border-gray-100">
            <h3 id="quiz-random-title" class="text-lg font-bold text-gray-900">Tạo câu hỏi ngẫu nhiên</h3>
            <p class="text-sm text-gray-500 mt-1">Chọn gói câu hỏi</p>
          </div>

          <div class="p-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nguồn câu hỏi</label>
              <select [(ngModel)]="selectedPackageId"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm">
                <option value="">-- Chọn gói câu hỏi --</option>
                @for (pkg of packages(); track pkg.id) {
                  <option [value]="pkg.id">{{ pkg.name }} ({{ pkg.questionCount || 0 }} câu)</option>
                }
              </select>
            </div>
            <div [class.opacity-50]="!selectedPackageId">
              <label class="block text-sm font-medium text-gray-700 mb-1">Số lượng câu hỏi</label>
              <div class="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button class="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-r transition-colors"
                  (click)="decreaseCount()">-</button>
                <input type="number" [ngModel]="randomCount()" (ngModelChange)="randomCount.set(+$event)"
                  class="w-full text-center border-none focus:ring-0 p-2 text-sm" min="1" />
                <button class="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-l transition-colors"
                  (click)="increaseCount()">+</button>
              </div>
            </div>
          </div>

          <div class="p-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
            <button (click)="svc.showSectionQuizRandomModal.set(false)"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Hủy</button>
            <button (click)="generateRandom()" [disabled]="!selectedPackageId"
              class="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors">
              Tạo ngay
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class QuizPackageModalsComponent implements OnInit {
  readonly svc = inject(CurriculumEditorService);
  private readonly packageApi = inject(PackageApi);
  private readonly toast = inject(ToastService);

  readonly packages = signal<any[]>([]);
  readonly questions = signal<any[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly randomCount = signal(5);
  selectedPackageId = '';

  ngOnInit(): void {
    this.loadPackages();
  }

  private async loadPackages(): Promise<void> {
    try {
      const pkgs = await firstValueFrom(this.packageApi.getMyPackages());
      this.packages.set(pkgs || []);
    } catch {
      this.packages.set([]);
    }
  }

  async loadPackageQuestions(): Promise<void> {
    if (!this.selectedPackageId) {
      this.questions.set([]);
      return;
    }
    try {
      const qs = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.selectedPackageId));
      this.questions.set(qs || []);
      this.selectedIds.set(new Set());
    } catch {
      this.questions.set([]);
      this.toast.error('Tải câu hỏi thất bại');
    }
  }

  selectAll(): void {
    this.selectedIds.set(new Set(this.questions().map((q: any) => q.id)));
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  toggleQuestion(id: string): void {
    const s = new Set(this.selectedIds());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.selectedIds.set(s);
  }

  addFromBank(): void {
    if (this.selectedIds().size === 0) return;

    const selected = this.questions().filter(q => this.selectedIds().has(q.id));
    const currentIds = new Set(this.svc.sectionQuizSelectedQuestions().map((q: any) => q.id));
    const newOnes = selected.filter(q => !currentIds.has(q.id));

    if (newOnes.length === 0) {
      this.toast.warning('Các câu hỏi đã chọn đã có trong mục này.');
      return;
    }

    this.svc.sectionQuizSelectedQuestions.update(cur => [...cur, ...newOnes]);
    this.svc.markDirty();
    this.svc.showSectionQuizBankModal.set(false);
    this.selectedIds.set(new Set());
  }

  async generateRandom(): Promise<void> {
    if (!this.selectedPackageId) return;

    try {
      const qs = await firstValueFrom(this.packageApi.getQuestionsInPackage(this.selectedPackageId));
      if (!qs?.length) {
        this.toast.warning('Gói câu hỏi này không có dữ liệu!');
        return;
      }

      const currentIds = new Set(this.svc.sectionQuizSelectedQuestions().map((q: any) => q.id));
      const available = qs.filter((q: any) => !currentIds.has(q.id));
      if (available.length === 0) {
        this.toast.warning('Không còn câu hỏi mới để thêm.');
        return;
      }

      const count = this.randomCount();
      const shuffled = [...available].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, Math.min(count, available.length));

      this.svc.sectionQuizSelectedQuestions.update(cur => [...cur, ...picked]);
      this.svc.markDirty();
      this.svc.showSectionQuizRandomModal.set(false);

      if (picked.length < count) {
        this.toast.info(`Chỉ còn ${picked.length} câu mới, đã thêm toàn bộ.`);
      }
    } catch {
      this.toast.error('Lỗi khi tạo câu hỏi ngẫu nhiên.');
    }
  }

  decreaseCount(): void {
    const c = this.randomCount();
    if (c > 1) this.randomCount.set(c - 1);
  }

  increaseCount(): void {
    this.randomCount.update(v => v + 1);
  }
}
