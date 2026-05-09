import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  RubricCriterion,
  validateRubricWeightSum,
  generateRubricId
} from './utils/rubric-calculator';
import { RubricApi } from '../../../api/endpoints/rubric.api';

@Component({
  selector: 'app-rubric-creator',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50">

      <!-- Page Header -->
      <div class="bg-white border-b border-slate-200">
        <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <a routerLink="/teacher/assessments/shared/rubrics"
               class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <lucide-icon name="arrow-left" [size]="18"></lucide-icon>
            </a>
            <h1 class="text-xl font-bold text-slate-900">Tạo Rubric mới</h1>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" (click)="togglePreview()"
                    class="h-9 px-4 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
              <lucide-icon [name]="showPreview() ? 'eye-off' : 'eye'" [size]="15"></lucide-icon>
              {{ showPreview() ? 'Ẩn xem trước' : 'Xem trước' }}
            </button>
            <button type="submit" form="rubricForm"
                    [disabled]="!rubricForm.valid || !isWeightValid() || saving()"
                    class="h-9 px-4 bg-[#0056D2] text-white rounded-lg text-sm font-medium hover:bg-[#004BB5] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              @if (saving()) {
                <lucide-icon name="loader-2" [size]="15" class="animate-spin"></lucide-icon>
                Đang lưu...
              } @else {
                <lucide-icon name="save" [size]="15"></lucide-icon>
                Lưu Rubric
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="max-w-5xl mx-auto px-6 py-6">
        <form id="rubricForm" [formGroup]="rubricForm" (ngSubmit)="saveRubric()"
              class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Main column -->
          <div class="lg:col-span-2 space-y-5">

            <!-- Basic Info Card -->
            <div class="bg-white border border-slate-200 rounded-xl p-6">
              <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-[#0056D2]"></span>
                Thông tin định danh
              </h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">
                    Tên Rubric <span class="text-rose-500">*</span>
                  </label>
                  <input type="text" formControlName="name"
                         class="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/10 outline-none transition-colors"
                         placeholder="VD: Rubric Đánh giá Kỹ năng Thực hành"/>
                  @if (rubricForm.get('name')?.invalid && rubricForm.get('name')?.touched) {
                    <p class="mt-1 text-xs text-rose-500">Tên rubric cần ít nhất 3 ký tự.</p>
                  }
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Mô tả</label>
                  <textarea formControlName="description" rows="3"
                            class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/10 outline-none transition-colors resize-none"
                            placeholder="Mô tả phạm vi áp dụng..."></textarea>
                </div>
              </div>
            </div>

            <!-- Criteria Builder Card -->
            <div class="bg-white border border-slate-200 rounded-xl p-6">
              <div class="flex items-center justify-between mb-5">
                <div>
                  <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Cấu trúc tiêu chí
                  </h2>
                  <p class="text-xs text-slate-400 mt-0.5">Xây dựng các cột mốc đánh giá</p>
                </div>
                <button type="button" (click)="addCriterion()"
                        class="h-8 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors flex items-center gap-1.5">
                  <lucide-icon name="plus" [size]="13"></lucide-icon>
                  Thêm tiêu chí
                </button>
              </div>

              @if (criteriaArray.length === 0) {
                <div class="py-10 text-center border-2 border-dashed border-slate-200 rounded-lg">
                  <lucide-icon name="layers" [size]="28" class="mx-auto mb-2 text-slate-300"></lucide-icon>
                  <p class="text-sm text-slate-400 mb-3">Chưa có tiêu chí nào</p>
                  <button type="button" (click)="addCriterion()"
                          class="text-sm font-medium text-[#0056D2] hover:underline">
                    Bắt đầu thêm tiêu chí
                  </button>
                </div>
              } @else {
                <div class="space-y-4" formArrayName="criteria">
                  @for (criterion of criteriaArray.controls; track $index; let i = $index) {
                    <div class="border border-slate-200 rounded-xl p-5 group hover:border-slate-300 transition-colors"
                         [formGroupName]="i">

                      <!-- Criterion Header Row -->
                      <div class="flex items-start gap-3 mb-4">
                        <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {{ i + 1 }}
                        </span>
                        <div class="flex-1 min-w-0">
                          <input type="text" formControlName="name"
                                 class="w-full border-0 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:border-[#0056D2] focus:ring-0 bg-transparent outline-none transition-colors"
                                 placeholder="Tên tiêu chí *"/>
                          <input type="text" formControlName="description"
                                 class="w-full mt-2 text-xs text-slate-500 placeholder:text-slate-300 border-none bg-transparent focus:ring-0 outline-none p-0"
                                 placeholder="Mô tả hướng dẫn (tuỳ chọn)..."/>
                        </div>
                        <div class="flex items-start gap-3 shrink-0">
                          <div class="flex flex-col items-center">
                            <label class="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Trọng số</label>
                            <div class="flex items-center gap-1">
                              <input type="number" formControlName="weight" min="0" max="100"
                                     class="w-14 h-8 text-center text-sm font-bold text-slate-900 border border-slate-200 rounded-lg focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2]/20 outline-none transition-colors"/>
                              <span class="text-xs text-slate-400">%</span>
                            </div>
                          </div>
                          <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pt-5">
                            <button type="button" (click)="duplicateCriterion(i)" title="Nhân bản"
                                    class="w-7 h-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors">
                              <lucide-icon name="copy" [size]="13"></lucide-icon>
                            </button>
                            <button type="button" (click)="removeCriterion(i)" title="Xóa"
                                    class="w-7 h-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors">
                              <lucide-icon name="trash-2" [size]="13"></lucide-icon>
                            </button>
                          </div>
                        </div>
                      </div>

                      <!-- Levels Grid -->
                      <div class="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div class="flex items-center justify-between mb-2.5">
                          <span class="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <lucide-icon name="bar-chart-2" [size]="11"></lucide-icon>
                            Thang điểm
                          </span>
                          <div class="flex items-center gap-3">
                            <button type="button" (click)="autoPopulateScores(i)"
                                    class="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                              <lucide-icon name="target" [size]="11"></lucide-icon>
                              Tự động tính
                            </button>
                            <button type="button" (click)="addLevel(i)"
                                    class="text-xs text-[#0056D2] hover:text-[#004BB5] flex items-center gap-1 transition-colors font-medium">
                              <lucide-icon name="plus" [size]="11"></lucide-icon>
                              Thêm mức
                            </button>
                          </div>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" formArrayName="levels">
                          @for (level of getLevelsArray(i).controls; track $index; let j = $index) {
                            <div class="relative bg-white border border-slate-200 rounded-lg p-2.5 group/level hover:border-[#0056D2]/30 transition-colors"
                                 [formGroupName]="j">
                              <button type="button" (click)="removeLevel(i, j)"
                                      class="absolute top-1 right-1 w-5 h-5 text-slate-300 hover:text-rose-500 rounded flex items-center justify-center transition-colors opacity-0 group-hover/level:opacity-100">
                                <lucide-icon name="x" [size]="10"></lucide-icon>
                              </button>
                              <div class="flex items-center gap-1.5 mb-1.5">
                                <input type="number" formControlName="points" min="0"
                                       class="w-11 h-7 text-center text-xs font-bold text-[#0056D2] border border-slate-200 rounded focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2]/10 outline-none transition-colors"/>
                                <span class="text-[10px] text-slate-400">đ</span>
                              </div>
                              <input type="text" formControlName="name"
                                     class="w-full text-xs font-medium text-slate-700 placeholder:text-slate-300 border-none bg-transparent focus:ring-0 outline-none p-0"
                                     placeholder="Tên mức *"/>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Sidebar -->
          <div>
            <div class="sticky top-6 space-y-4">

              <!-- Weight Status Card -->
              <div class="bg-white border border-slate-200 rounded-xl p-5">
                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full"
                        [class]="isWeightValid() ? 'bg-emerald-500' : 'bg-amber-400'"></span>
                  Trạng thái trọng số
                </h3>

                <div class="flex items-end justify-between mb-2">
                  <span class="text-3xl font-bold text-slate-900">
                    {{ totalWeight() }}<span class="text-base font-medium text-slate-400">%</span>
                  </span>
                  <span class="text-xs text-slate-400">/ 100%</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div class="h-full rounded-full transition-all duration-500"
                       [class.bg-emerald-500]="isWeightValid()"
                       [class.bg-[#0056D2]]="!isWeightValid() && totalWeight() < 100"
                       [class.bg-rose-500]="totalWeight() > 100"
                       [style.width.%]="Math.min(totalWeight(), 100)"></div>
                </div>

                @if (isWeightValid()) {
                  <div class="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    <lucide-icon name="check-circle" [size]="14"></lucide-icon>
                    <span class="text-xs font-medium">Cấu hình hợp lệ</span>
                  </div>
                } @else if (totalWeight() < 100) {
                  <div class="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <lucide-icon name="alert-circle" [size]="14"></lucide-icon>
                    <span class="text-xs font-medium">Còn thiếu {{ 100 - totalWeight() }}%</span>
                  </div>
                } @else {
                  <div class="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                    <lucide-icon name="alert-triangle" [size]="14"></lucide-icon>
                    <span class="text-xs font-medium">Vượt quá {{ totalWeight() - 100 }}%</span>
                  </div>
                }

                <div class="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <p class="text-xs text-slate-400 flex items-start gap-2">
                    <span class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0"></span>
                    Tổng trọng số phải đúng 100% để lưu.
                  </p>
                  <p class="text-xs text-slate-400 flex items-start gap-2">
                    <span class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0"></span>
                    Tên tiêu chí và tên mức độ là bắt buộc.
                  </p>
                </div>
              </div>

              <!-- Cancel -->
              <a routerLink="/teacher/assessments/shared/rubrics"
                 class="block w-full py-2.5 text-center text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                Hủy bỏ & Quay lại
              </a>
            </div>
          </div>
        </form>
      </div>

      <!-- Preview Modal -->
      @if (showPreview()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
             (click)="togglePreview()">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
               (click)="$event.stopPropagation()">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p class="text-xs font-medium text-[#0056D2] uppercase tracking-wider mb-0.5">Xem trước Rubric</p>
                <h3 class="text-lg font-bold text-slate-900">{{ rubricForm.get('name')?.value || 'Rubric chưa đặt tên' }}</h3>
              </div>
              <button (click)="togglePreview()"
                      class="w-9 h-9 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors">
                <lucide-icon name="x" [size]="16"></lucide-icon>
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-6">
              @if (previewCriteria().length === 0) {
                <p class="text-sm text-slate-400 text-center py-8">Chưa có tiêu chí để hiển thị.</p>
              } @else {
                <div class="border border-slate-200 rounded-xl overflow-hidden">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-slate-900 text-white">
                        <th class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider">Tiêu chí</th>
                        @for (level of previewLevelHeaders(); track $index) {
                          <th class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-center border-l border-white/10">
                            {{ level }}
                          </th>
                        }
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (criterion of previewCriteria(); track $index) {
                        <tr class="hover:bg-slate-50 transition-colors">
                          <td class="px-5 py-4 border-r border-slate-100">
                            <div class="font-semibold text-slate-900 text-sm mb-0.5">
                              {{ criterion.name || 'Tiêu chí ' + ($index + 1) }}
                            </div>
                            <div class="text-xs text-[#0056D2] font-medium">{{ criterion.weight }}% trọng số</div>
                          </td>
                          @for (level of criterion.levels; track $index) {
                            <td class="px-5 py-4 text-center border-l border-slate-100">
                              <div class="font-semibold text-slate-900 text-sm mb-1">{{ level.name || '-' }}</div>
                              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {{ level.points }} điểm
                              </span>
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Error Toast -->
      @if (error()) {
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg flex items-center gap-3 z-[200] text-sm">
          <lucide-icon name="alert-circle" [size]="15"></lucide-icon>
          {{ error() }}
          <button (click)="error.set(null)" class="text-slate-400 hover:text-white ml-1">
            <lucide-icon name="x" [size]="14"></lucide-icon>
          </button>
        </div>
      }

      <!-- Success Toast -->
      @if (success()) {
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-3 z-[200] text-sm font-medium">
          <lucide-icon name="check-circle" [size]="15"></lucide-icon>
          Rubric đã được tạo thành công!
        </div>
      }
    </div>
  `
})
export class RubricCreatorComponent implements OnInit {
  protected Math = Math;
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private rubricApi = inject(RubricApi);

  saving = signal(false);
  error = signal<string | null>(null);
  showPreview = signal(false);
  success = signal(false);

  rubricForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    criteria: this.fb.array([])
  });

  get criteriaArray(): FormArray {
    return this.rubricForm.get('criteria') as FormArray;
  }

  private criteriaValue = toSignal(this.criteriaArray.valueChanges, { initialValue: this.criteriaArray.value });

  totalWeight = computed(() => {
    const criteria = this.criteriaValue() as { weight: number | null }[];
    return (criteria || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  });

  remainingWeight = computed(() => 100 - this.totalWeight());
  isWeightValid = computed(() => this.totalWeight() === 100);

  previewCriteria = computed((): RubricCriterion[] => {
    return this.criteriaValue() as RubricCriterion[];
  });

  previewLevelHeaders = computed(() => {
    const criteria = this.previewCriteria();
    if (criteria.length === 0) return [];
    const richest = criteria.reduce((a, b) =>
      (a.levels?.length || 0) >= (b.levels?.length || 0) ? a : b
    );
    return (richest.levels || []).map((l: any) => l.name || 'Mức độ');
  });

  ngOnInit(): void {
    if (this.criteriaArray.length === 0) {
      this.addCriterion();
    }
  }

  getLevelsArray(criterionIndex: number): FormArray {
    return this.criteriaArray.at(criterionIndex).get('levels') as FormArray;
  }

  addCriterion(): void {
    const id = generateRubricId('criterion');
    const weightSuggestion = Math.max(0, this.remainingWeight());

    const criterionGroup = this.fb.group({
      id: [id],
      name: ['', Validators.required],
      description: [''],
      weight: [weightSuggestion, [Validators.required, Validators.min(0), Validators.max(100)]],
      levels: this.fb.array([
        this.createLevelFormGroup('Xuất sắc', 10),
        this.createLevelFormGroup('Đạt yêu cầu', 7),
        this.createLevelFormGroup('Cần cải thiện', 4)
      ])
    });

    this.criteriaArray.push(criterionGroup);
  }

  private createLevelFormGroup(name: string = '', points: number = 0): FormGroup {
    return this.fb.group({
      id: [generateRubricId('level')],
      name: [name, Validators.required],
      description: [''],
      points: [points, [Validators.required, Validators.min(0)]]
    });
  }

  removeCriterion(index: number): void {
    this.criteriaArray.removeAt(index);
  }

  addLevel(criterionIndex: number): void {
    const levelsArray = this.getLevelsArray(criterionIndex);
    levelsArray.push(this.createLevelFormGroup());
  }

  removeLevel(criterionIndex: number, levelIndex: number): void {
    const levelsArray = this.getLevelsArray(criterionIndex);
    if (levelsArray.length > 1) {
      levelsArray.removeAt(levelIndex);
    }
  }

  duplicateCriterion(index: number): void {
    const source = this.criteriaArray.at(index).value;
    const id = generateRubricId('criterion');

    const criterionGroup = this.fb.group({
      id: [id],
      name: [`${source.name} (Bản sao)`, Validators.required],
      description: [source.description],
      weight: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      levels: this.fb.array(
        (source.levels || []).map((l: any) => this.createLevelFormGroup(l.name, l.points))
      )
    });

    this.criteriaArray.insert(index + 1, criterionGroup);
  }

  autoPopulateScores(criterionIndex: number): void {
    const levelsArray = this.getLevelsArray(criterionIndex);
    const count = levelsArray.length;
    if (count < 2) return;

    const maxPts = levelsArray.at(0).get('points')?.value || 100;
    const step = Math.round(maxPts / (count - 1));
    for (let i = 0; i < count; i++) {
      levelsArray.at(i).get('points')?.setValue(Math.max(0, maxPts - step * i));
    }
  }

  togglePreview(): void {
    this.showPreview.update(v => !v);
  }

  saveRubric(): void {
    if (!this.rubricForm.valid || !this.isWeightValid()) {
      this.error.set('Vui lòng hoàn thiện cấu trúc Rubric (Tổng trọng số 100%)');
      return;
    }

    const criteria = this.criteriaArray.value as RubricCriterion[];
    const validation = validateRubricWeightSum(criteria);
    if (!validation.isValid) {
      this.error.set(validation.errors[0]?.message || 'Tổng trọng số không hợp lệ');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.rubricForm.value;
    const request = {
      title: formValue.name as string,
      description: formValue.description as string || undefined,
      maxPoints: 100,
      criteria: (formValue.criteria as any[]).map(c => ({
        name: c.name,
        description: c.description || undefined,
        maxPoints: c.weight,
        levels: (c.levels || []).map((l: any) => ({
          label: l.name,
          description: l.description || undefined,
          points: l.points
        }))
      }))
    };

    this.rubricApi.create(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/teacher/assessments/shared/rubrics']), 1500);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Không thể kết nối máy chủ để lưu Rubric.');
      }
    });
  }
}
