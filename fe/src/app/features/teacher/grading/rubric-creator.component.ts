import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  RubricCriterion,
  validateRubricWeightSum,
  createDefaultCriterion,
  generateRubricId
} from './utils/rubric-calculator';
import { RubricApi } from '../../../api/endpoints/rubric.api';

/**
 * Rubric Creator Component
 * 
 * Creates new rubrics with dynamic criteria builder.
 * Features: add/remove criteria, point configuration, preview mode.
 */
@Component({
  selector: 'app-rubric-creator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50/50">
      <!-- Sticky Slender Header -->
      <div class="sticky top-0 z-[60] bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 font-sans">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <a routerLink="/teacher/assessments/shared/rubrics" class="p-2 bg-slate-50 border border-slate-100 text-slate-400 hover:text-[#0056D2] hover:bg-white hover:border-[#0056D2]/20 hover:shadow-sm rounded-xl transition-all">
                <lucide-icon name="arrow-left" [size]="18"></lucide-icon>
              </a>
              <div>
                <h1 class="text-2xl font-black text-slate-900 tracking-tight">Tạo Rubric mới</h1>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <button type="button" (click)="togglePreview()" 
                      class="h-10 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 font-bold text-xs shadow-sm">
                <lucide-icon [name]="showPreview() ? 'eye-off' : 'eye'" [size]="16"></lucide-icon>
                {{ showPreview() ? 'Ẩn xem trước' : 'Xem trước' }}
              </button>
              <button type="submit" form="rubricForm" [disabled]="!rubricForm.valid || !isWeightValid() || saving()"
                      class="h-10 px-6 bg-[#0056D2] text-white rounded-xl font-bold text-sm hover:bg-[#004BB5] transition-all flex items-center gap-2 shadow-md shadow-blue-100 disabled:opacity-50 active:scale-95">
                <lucide-icon name="save" [size]="18"></lucide-icon>
                Lưu Rubric
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-screen-2xl mx-auto p-4 sm:p-6">
        <form id="rubricForm" [formGroup]="rubricForm" (ngSubmit)="saveRubric()" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Main Form Column -->
        <div class="lg:col-span-8 space-y-8">
          <!-- Basic Info Card -->
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden relative group">
            <h2 class="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <span class="w-2 h-2 rounded-full bg-[#0056D2]"></span>
              Thông tin định danh
            </h2>
            
            <div class="space-y-3 relative z-10">
              <div class="grid grid-cols-1 gap-3">
                <div class="space-y-2">
                  <label class="text-[11px] font-black uppercase tracking-widest ml-1">Tên Rubric Đại diện</label>
                  <input type="text" formControlName="name" 
                         class="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-md text-slate-500 placeholder:text-slate-300 focus:bg-white focus:border-[#0056D2] focus:ring-4 focus:ring-blue-50/50 transition-all outline-none"
                         placeholder="VD: Rubric Đánh giá Kỹ năng Thực hành"/>
                </div>
                
                <div class="space-y-2">
                  <label class="text-[11px] font-black uppercase tracking-widest ml-1">Mô tả mục tiêu</label>
                  <textarea formControlName="description" rows="2"
                            class="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-md text-slate-500 placeholder:text-slate-300 focus:bg-white focus:border-[#0056D2] focus:ring-4 focus:ring-blue-50/50 transition-all outline-none resize-none"
                            placeholder="Mô tả phạm vi áp dụng..."></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Criteria Builder Card -->
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden min-h-[400px]">
            <div class="flex items-center justify-between mb-8 border-b border-slate-50 pb-5">
              <div>
                <h2 class="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1 flex items-center gap-3">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Cấu trúc Tiêu chí
                </h2>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-5">Xây dựng các cột mốc đánh giá</p>
              </div>
              
              <button type="button" (click)='addCriterion()' 
                      class="h-9 px-4 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border border-emerald-100 shadow-sm active:scale-95">
                <lucide-icon name="plus" [size]="14"></lucide-icon>
                Thêm tiêu chí
              </button>
            </div>
            
            @if (criteriaArray.length === 0) {
              <div class="py-20 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100 shadow-sm">
                  <lucide-icon name="plus" [size]="32" strokeWidth="1"></lucide-icon>
                </div>
                <p class="text-slate-400 font-black uppercase tracking-widest text-[10px]">Danh sách tiêu chí đang trống</p>
                <button type="button" (click)="addCriterion()" class="mt-4 text-[10px] font-black text-[#0056D2] uppercase tracking-[0.2em] hover:underline">Bắt đầu thêm ngay</button>
              </div>
            } @else {
              <div class="space-y-6" formArrayName="criteria">
                @for (criterion of criteriaArray.controls; track $index; let i = $index) {
                  <div class="group/card relative bg-white rounded-2xl border border-slate-200 hover:border-[#0056D2]/30 hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-300" [formGroupName]="i">
                    <!-- Compact Toolbar -->
                    <div class="absolute -top-3 right-4 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-300 z-20">
                      <button type="button" (click)="duplicateCriterion(i)" 
                              class="w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-100 hover:shadow-sm rounded-lg flex items-center justify-center transition-all bg-white" title="Nhân bản">
                        <lucide-icon name="plus" [size]="14"></lucide-icon>
                      </button>
                      <button type="button" (click)="removeCriterion(i)" 
                              class="w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:shadow-sm rounded-lg flex items-center justify-center transition-all bg-white" title="Xóa">
                        <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                      </button>
                    </div>

                    <div class="p-5">
                      <!-- Flat Criterion Header -->
                      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start mb-6">
                        <div class="md:col-span-1">
                          <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-md shadow-slate-900/10">0{{ i + 1 }}</div>
                        </div>
                        <div class="md:col-span-8">
                          <input type="text" formControlName="name" 
                                 class="w-full bg-transparent border-none p-0 text-lg font-black text-slate-900 placeholder:text-slate-200 focus:ring-0 mb-1"
                                 placeholder="Tên tiêu chí..."/>
                          <input type="text" formControlName="description" 
                                 class="w-full bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 placeholder:text-slate-300 focus:bg-white focus:ring-1 focus:ring-[#0056D2]/20 transition-all outline-none"
                                  placeholder="Mô tả hướng dẫn cho tiêu chí này..."/>
                        </div>
                        <div class="md:col-span-3">
                          <div class="bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 flex flex-col items-center justify-center group/weight hover:bg-white hover:border-[#0056D2]/20 transition-all">
                            <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Trọng số</label>
                            <div class="flex items-center gap-1">
                              <input type="number" formControlName="weight" 
                                     class="w-12 text-xl font-black text-slate-900 bg-transparent border-none p-0 text-center focus:ring-0 cursor-pointer"/>
                              <span class="text-[10px] font-black text-slate-300">%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Horizontal Levels Grid -->
                      <div class="bg-slate-50/50 rounded-xl p-4 border border-slate-100 border-dashed">
                        <div class="flex items-center justify-between mb-4">
                          <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <lucide-icon name="layout" [size]="12"></lucide-icon>
                            Thang điểm chi tiết
                          </h4>
                          <div class="flex items-center gap-2">
                             <button type="button" (click)="autoPopulateScores(i)" 
                                    class="text-[9px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest flex items-center gap-1 transition-colors px-2">
                              <lucide-icon name="target" [size]="12"></lucide-icon>
                              Tự động tính
                            </button>
                            <button type="button" (click)="addLevel(i)" 
                                    class="text-[9px] font-black text-[#0056D2] hover:text-[#004BB5] uppercase tracking-widest flex items-center gap-1 transition-colors bg-white border border-slate-200 px-3 py-1 rounded-lg hover:shadow-sm">
                              <lucide-icon name="plus" [size]="12"></lucide-icon>
                              Thêm mức
                            </button>
                          </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3" formArrayName="levels">
                          @for (level of getLevelsArray(i).controls; track $index; let j = $index) {
                            <div class="relative bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-[#0056D2]/30 transition-all group/level" [formGroupName]="j">
                              <!-- Inline Points & Name -->
                              <div class="flex flex-col gap-2">
                                <div class="flex items-center justify-between gap-2">
                                  <input type="number" formControlName="points" 
                                         class="w-12 h-8 bg-slate-50 border border-slate-100 rounded-lg text-center text-xs font-black text-[#0056D2] focus:bg-white focus:border-[#0056D2]/40 outline-none transition-all"/>
                                  <span class="text-[9px] font-black text-slate-300 uppercase shrink-0">Điểm</span>
                                  <button type="button" (click)="removeLevel(i, j)" 
                                          class="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-level/hover:opacity-100 ml-auto">
                                    <lucide-icon name="x" [size]="12"></lucide-icon>
                                  </button>
                                </div>
                                <input type="text" formControlName="name" 
                                       class="w-full bg-transparent border-none p-0 text-[11px] font-black text-slate-900 placeholder:text-slate-300 focus:ring-0"
                                       placeholder="Mức độ..."/>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Sidebar / Statistics Column -->
        <div class="lg:col-span-4 space-y-6">
          <!-- Weight Verification Card -->
          <div class="sticky top-6 space-y-6">
            <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative group">
              <h3 class="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <span class="w-2 h-2 rounded-full" [class]="isWeightValid() ? 'bg-emerald-500' : 'bg-amber-500'"></span>
                Trạng thái Trọng số
              </h3>
              
              <div class="mb-8">
                <div class="flex items-end justify-between mb-4">
                  <div>
                    <span class="text-5xl font-black tracking-tighter text-slate-900">{{ totalWeight() }}</span>
                    <span class="text-xl font-black text-slate-300 ml-1">%</span>
                  </div>
                  <div class="text-right">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mục tiêu</p>
                    <p class="text-md font-black text-slate-900">100/100</p>
                  </div>
                </div>
                
                <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100 p-0.5">
                  <div class="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                       [class.bg-emerald-500]="isWeightValid()"
                       [class.bg-[#0056D2]]="!isWeightValid() && totalWeight() < 100"
                       [class.bg-rose-500]="totalWeight() > 100"
                       [style.width.%]="Math.min(totalWeight(), 100)"></div>
                </div>
              </div>
              
              <div class="space-y-3">
                @if (isWeightValid()) {
                  <div class="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                      <lucide-icon name="check-check" [size]="16"></lucide-icon>
                    </div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-emerald-600">Cấu hình hoàn tất</p>
                  </div>
                } @else if (totalWeight() < 100) {
                  <div class="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 animate-pulse">
                    <div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white">
                      <lucide-icon name="alert-circle" [size]="16"></lucide-icon>
                    </div>
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-amber-600 leading-tight">
                        CÒN THIẾU {{ 100 - totalWeight() }}%
                      </p>
                      <p class="text-[9px] font-bold text-amber-500/60 uppercase tracking-tight">Vui lòng điều chỉnh</p>
                    </div>
                  </div>
                } @else {
                  <div class="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white">
                      <lucide-icon name="alert-triangle" [size]="16"></lucide-icon>
                    </div>
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest text-rose-600">VƯỢT QUÁ {{ totalWeight() - 100 }}%</p>
                    </div>
                  </div>
                }
              </div>

              <!-- Contextual Help -->
              <div class="mt-8 pt-6 border-t border-slate-100">
                <h4 class="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-slate-400">
                  <lucide-icon name="help-circle" [size]="12"></lucide-icon>
                  Gợi ý thiết lập
                </h4>
                <div class="space-y-3">
                  <div class="flex items-start gap-3">
                    <div class="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1"></div>
                    <p class="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">Tổng trọng số phải chuẩn 100% để lưu.</p>
                  </div>
                  <div class="flex items-start gap-3">
                    <div class="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1"></div>
                    <p class="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">Mỗi tiêu chí nên có ít nhất 3 mức độ.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Contextual Actions -->
            <button type="button" routerLink="/teacher/assessments/shared/rubrics" 
                    class="h-12 w-full rounded-2xl bg-white border border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center">
              Hủy bỏ & Quay lại
            </button>
          </div>
        </div>
      </form>
      </div>

      <!-- Slender Preview Overlay -->
      @if (showPreview()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-6 lg:p-20">
          <div class="bg-white rounded-[3rem] shadow-2xl border border-slate-100 w-full max-w-6xl max-h-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <!-- Preview Header -->
            <div class="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span class="text-[9px] font-black text-[#0056D2] uppercase tracking-[0.4em] mb-2 block">X-RAY VIEW</span>
                <h3 class="text-3xl font-black text-slate-900 tracking-tight">{{ rubricForm.get('name')?.value || 'Rubric chưa đặt tên' }}</h3>
              </div>
              <button (click)="togglePreview()" class="w-14 h-14 rounded-[1.5rem] bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm">
                <lucide-icon name="x" [size]="24"></lucide-icon>
              </button>
            </div>
            
            <!-- Preview Content -->
            <div class="flex-1 overflow-y-auto p-12 scrollbar-thin scrollbar-thumb-slate-200">
              <div class="rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/20">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-900 text-white">
                      <th class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] border-r border-white/5">Tiêu chí đánh giá</th>
                      @for (level of previewLevelHeaders(); track $index) {
                        <th class="px-8 py-6 text-[10px] text-center font-black uppercase tracking-[0.2em] border-r border-white/5">{{ level }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (criterion of previewCriteria(); track $index) {
                      <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-8 py-8 border-r border-slate-100 bg-slate-50/30">
                          <div class="font-black text-slate-900 tracking-tight mb-1">{{ criterion.name || 'Tiêu chí #' + ($index + 1) }}</div>
                          <div class="text-[10px] font-bold text-[#0056D2] uppercase tracking-widest">{{ criterion.weight }}% Trọng số</div>
                        </td>
                        @for (level of criterion.levels; track $index) {
                          <td class="px-8 py-8 text-center border-r border-slate-100">
                            <div class="font-black text-slate-900 tracking-tight mb-1">{{ level.name || 'Mức độ' }}</div>
                            <div class="inline-flex h-7 px-3 bg-emerald-50 text-emerald-600 rounded-full items-center text-[10px] font-black uppercase tracking-tight border border-emerald-100">
                              {{ level.points }} Điểm
                            </div>
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Preview Footer -->
            <div class="p-8 border-t border-slate-100 text-center bg-slate-50/30">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đây là giao diện học viên sẽ nhìn thấy khi nộp bài</p>
            </div>
          </div>
        </div>
      }

      <!-- Global Error Message -->
      @if (error()) {
        <div class="fixed bottom-10 left-1/2 -translate-x-1/2 p-5 bg-rose-600 text-white border border-rose-500 rounded-2xl shadow-2xl flex items-center gap-4 z-[200] animate-in slide-in-from-bottom duration-500">
          <lucide-icon name="alert-circle" [size]="20"></lucide-icon>
          <span class="text-xs font-black uppercase tracking-widest">{{ error() }}</span>
          <button (click)="error.set(null)" class="text-white/60 hover:text-white transition-colors">
            <lucide-icon name="x" [size]="16"></lucide-icon>
          </button>
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

  // State
  saving = signal(false);
  error = signal<string | null>(null);
  showPreview = signal(false);

  // Form
  rubricForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    criteria: this.fb.array([])
  });

  get criteriaArray(): FormArray {
    return this.rubricForm.get('criteria') as FormArray;
  }

  // Form Signals for Reactivity
  private criteriaValue = toSignal(this.criteriaArray.valueChanges, { initialValue: this.criteriaArray.value });

  // Computed
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
    const maxLevels = Math.max(...criteria.map(c => (c.levels?.length || 0)));
    return Array.from({ length: maxLevels }, (_, i) => `Cấp độ ${i + 1}`);
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
    const weightSuggestion = this.remainingWeight() > 0 ? Math.min(this.remainingWeight(), 25) : 0;

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
      weight: [0, [Validators.required, Validators.min(0), Validators.max(100)]], // Reset weight for safety
      levels: this.fb.array(
        (source.levels || []).map((l: any) => this.createLevelFormGroup(l.name, l.points))
      )
    });

    this.criteriaArray.insert(index + 1, criterionGroup);
  }

  autoPopulateScores(criterionIndex: number): void {
    const levelsArray = this.getLevelsArray(criterionIndex);
    if (levelsArray.length < 2) return;

    const firstPoints = levelsArray.at(0).get('points')?.value || 0;
    if (firstPoints === 0) return;

    // Logic: Decrement points logically (e.g., 100%, 70%, 40%, 10% or similar)
    // For simplicity, let's do a linear decrease if they are empty or 0
    const step = Math.floor(firstPoints / levelsArray.length);

    for (let i = 1; i < levelsArray.length; i++) {
      const target = levelsArray.at(i).get('points');
      if (!target?.value || target.value === 0) {
        target?.setValue(Math.max(0, firstPoints - (step * i)));
      }
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
        this.router.navigate(['/teacher/assessments/shared/rubrics']);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Không thể kết nối máy chủ để lưu Rubric.');
      }
    });
  }
}
