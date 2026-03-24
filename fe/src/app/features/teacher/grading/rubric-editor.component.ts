import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  Rubric, RubricCriterion,
  validateRubricWeightSum,
  generateRubricId
} from './utils/rubric-calculator';
import { RubricApi } from '../../../api/endpoints/rubric.api';

/**
 * Rubric Editor Component
 * 
 * Edits existing rubrics with criteria modification.
 * Features: load existing data, modify criteria, save changes.
 */
@Component({
  selector: 'app-rubric-editor',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50/50">
      <!-- Slender Header -->
      <div class="bg-white border-b border-slate-200">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 font-sans">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <a routerLink="/teacher/assessments/shared/rubrics" class="p-1 -ml-1 text-slate-400 hover:text-[#0056D2] transition-colors">
                  <lucide-icon name="arrow-left" [size]="18"></lucide-icon>
                </a>
              </div>
              <h1 class="text-2xl font-black text-slate-900 tracking-tight">Chỉnh sửa Rubric</h1>
              <p class="text-sm text-slate-500 font-medium">Cập nhật và tinh chỉnh tiêu chí đánh giá năng lực</p>
            </div>
            
            <div class="flex items-center gap-3">
              <button type="button" (click)="togglePreview()" 
                      class="h-10 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 font-bold text-xs shadow-sm">
                <lucide-icon [name]="showPreview() ? 'eye-off' : 'eye'" [size]="16"></lucide-icon>
                {{ showPreview() ? 'Ẩn xem trước' : 'Xem trước' }}
              </button>
              <button type="submit" form="rubricEditForm" [disabled]="!rubricForm.valid || !isWeightValid() || saving()"
                      class="h-10 px-6 bg-[#0056D2] text-white rounded-xl font-bold text-sm hover:bg-[#004BB5] transition-all flex items-center gap-2 shadow-md shadow-blue-100 disabled:opacity-50">
                <lucide-icon name="save" [size]="18"></lucide-icon>
                Lưu Thay đổi
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-screen-2xl mx-auto p-4 sm:p-6">
        @if (loading()) {
          <div class="bg-white rounded-2xl border border-slate-200 p-24 text-center shadow-sm">
            <div class="w-16 h-16 border-4 border-slate-100 border-t-[#0056D2] rounded-full animate-spin mx-auto mb-6"></div>
            <p class="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Đang tải cấu trúc Rubric...</p>
          </div>
        } @else {
          <form id="rubricEditForm" [formGroup]="rubricForm" (ngSubmit)="saveRubric()" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Main Form Column -->
          <div class="lg:col-span-8 space-y-8">
            <!-- Basic Info Card -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden relative group">
              <div class="absolute top-0 right-0 p-4 text-slate-50 group-hover:text-slate-100/50 transition-colors pointer-events-none">
                <lucide-icon name="file-edit" [size]="80" strokeWidth="1"></lucide-icon>
              </div>
              
              <h2 class="text-[13px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-3">
                <span class="w-1.5 h-1.5 rounded-full bg-[#0056D2]"></span>
                Thông tin định danh
              </h2>
              
              <div class="space-y-6 relative z-10">
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Rubric</label>
                  <input type="text" formControlName="name" 
                         class="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-md font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[#0056D2] focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                         placeholder="Nhập tên gọi mới cho Rubric..."/>
                </div>
                
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả chi tiết</label>
                  <textarea formControlName="description" rows="3"
                            class="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-[#0056D2] focus:ring-4 focus:ring-blue-50 transition-all outline-none resize-none"
                            placeholder="Cập nhật mục tiêu đánh giá..."></textarea>
                </div>
              </div>
            </div>

            <!-- Criteria Builder Card -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h2 class="text-[13px] font-black text-slate-900 uppercase tracking-widest mb-1 flex items-center gap-3">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    điều chỉnh Tiêu chí
                  </h2>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Thay đổi cấu trúc trọng số và mức độ</p>
                </div>
                
                <button type="button" (click)='addCriterion()' 
                        class="h-9 px-4 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border border-emerald-100 shadow-sm">
                  <lucide-icon name="plus" [size]="14"></lucide-icon>
                  Thêm mới
                </button>
              </div>
              
              <div class="space-y-4" formArrayName="criteria">
                @for (criterion of criteriaArray.controls; track $index; let i = $index) {
                  <div class="group relative bg-slate-50/50 rounded-xl border border-slate-100 p-6 hover:bg-white hover:border-[#0056D2]/30 hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-300" [formGroupName]="i">
                    <!-- Delete Button -->
                    <button type="button" (click)="removeCriterion(i)" 
                            class="absolute top-2 right-2 w-8 h-8 bg-white border border-slate-100 text-slate-300 hover:text-rose-500 hover:border-rose-100 hover:shadow rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10">
                      <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                    </button>

                    <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <!-- Criterion Info -->
                      <div class="md:col-span-8 space-y-4">
                        <div class="flex items-center gap-3">
                          <span class="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">#{{ i + 1 }}</span>
                          <input type="text" formControlName="name" 
                                 class="flex-1 bg-transparent border-none p-0 text-medium font-black text-slate-900 placeholder:text-slate-300 focus:ring-0"
                                 placeholder="Tên tiêu chí..."/>
                        </div>
                        <input type="text" formControlName="description" 
                               class="w-full bg-white/50 border border-slate-100 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 focus:bg-white focus:border-[#0056D2]/30 transition-all outline-none"
                               placeholder="Mô tả tiêu chí..."/>
                      </div>

                      <!-- Weighting -->
                      <div class="md:col-span-4 bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                        <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Trọng số %</label>
                        <div class="flex items-end gap-1">
                          <input type="number" formControlName="weight" min="0" max="100"
                                 class="w-16 text-3xl font-black text-slate-900 bg-transparent border-none p-0 text-center focus:ring-0"/>
                          <span class="text-sm font-black text-slate-300 mb-1">%</span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Nested Levels -->
                    <div class="mt-6 pt-6 border-t border-slate-100">
                      <div class="flex items-center justify-between mb-3">
                        <h4 class="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <lucide-icon name="bar-chart" [size]="10"></lucide-icon>
                          Thang điểm chi tiết
                        </h4>
                        <button type="button" (click)="addLevel(i)" 
                                class="text-[10px] font-black text-[#0056D2] hover:underline uppercase tracking-widest py-1 px-2">
                          + Thêm mức độ
                        </button>
                      </div>
                      
                      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" formArrayName="levels">
                        @for (level of getLevelsArray(i).controls; track $index; let j = $index) {
                          <div class="relative bg-white border border-slate-100 rounded-xl p-3 group/level hover:border-[#0056D2]/20 transition-all" [formGroupName]="j">
                            <button type="button" (click)="removeLevel(i, j)" 
                                    class="absolute top-1.5 right-1.5 p-1 text-slate-200 hover:text-rose-500 opacity-0 group-level/hover:opacity-100 transition-opacity">
                              <lucide-icon name="x" [size]="10"></lucide-icon>
                            </button>
                            <input type="text" formControlName="name" placeholder="Tên mức" 
                                   class="w-full bg-transparent border-none p-0 text-[10px] font-black text-slate-900 placeholder:text-slate-300 focus:ring-0 mb-1"/>
                            <div class="flex items-center gap-2">
                              <input type="number" formControlName="points" placeholder="0" min="0"
                                     class="w-15 bg-slate-50 rounded-lg px-2 py-1 text-[10px] font-black text-[#0056D2] focus:bg-white border border-slate-100 outline-none transition-all"/>
                              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">điểm</span>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Sidebar Column -->
          <div class="lg:col-span-4 space-y-6">
            <div class="sticky top-6 space-y-6">
              <!-- Validator Card -->
              <div class="bg-slate-900 rounded-2xl p-6 shadow-2xl text-white overflow-hidden relative">
                <div class="absolute -bottom-6 -right-6 text-white/5 pointer-events-none rotate-12">
                  <lucide-icon name="settings" [size]="120" strokeWidth="1"></lucide-icon>
                </div>
                
                <h3 class="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Trạng thái Trọng số
                </h3>
                
                <div class="relative mb-8">
                  <div class="flex items-end justify-between mb-3">
                    <div class="flex items-baseline gap-1">
                      <span class="text-5xl font-black tracking-tighter">{{ totalWeight() }}</span>
                      <span class="text-xl font-black text-white/30">%</span>
                    </div>
                    <div class="text-right">
                      <p class="text-[10px] font-black text-white/40 uppercase tracking-widest">Chuẩn hóa</p>
                      <p class="text-md font-black">100%</p>
                    </div>
                  </div>
                  
                  <div class="h-3 bg-white/10 rounded-full border border-white/5 p-0.5 relative overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-700 ease-out"
                         [class.bg-emerald-400]="isWeightValid()"
                         [class.bg-blue-500]="!isWeightValid() && totalWeight() < 100"
                         [class.bg-rose-500]="totalWeight() > 100"
                         [style.width.%]="Math.min(totalWeight(), 100)"></div>
                  </div>
                </div>

                <!-- Action Group (Inside) -->
                <div class="space-y-4 pt-6 border-t border-white/10">
                  <div class="bg-[#0056D2] rounded-xl p-4 text-white relative overflow-hidden">
                    <p class="text-[10px] font-bold leading-relaxed mb-2 opacity-80 uppercase tracking-widest">Gợi ý thiết kế</p>
                    <p class="text-[11px] font-medium leading-relaxed mb-0">Việc thay đổi trọng số sẽ ảnh hưởng trực tiếp đến kết quả chấm điểm các bài tập cũ.</p>
                  </div>
                </div>
              </div>

              <!-- Contextual Actions -->
              <div class="space-y-3">
                <button type="button" routerLink="/teacher/assessments/shared/rubrics" 
                        class="h-12 w-full rounded-2xl bg-white border border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center">
                  HỦY BỎ & QUAY LẠI
                </button>
              </div>
            </div>
          </div>
        </form>
      }

      <!-- Slender Preview Overlay Overlay -->
      @if (showPreview()) {
        <div class="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[100] p-6 lg:p-20 overflow-hidden">
          <div class="bg-white rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.2)] border border-slate-100 w-full max-w-6xl max-h-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500">
            <div class="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div>
                <span class="text-[9px] font-black text-[#0056D2] uppercase tracking-[0.4em] mb-2 block animate-pulse">LIVE PREVIEW MODE</span>
                <h3 class="text-3xl font-black text-slate-900 tracking-tight">{{ rubricForm.get('name')?.value }}</h3>
              </div>
              <button (click)="togglePreview()" class="w-14 h-14 rounded-[1.5rem] bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center shadow-sm">
                <lucide-icon name="x" [size]="24"></lucide-icon>
              </button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-12 scrollbar-thin scrollbar-thumb-slate-200">
              <div class="rounded-[2.5rem] border border-slate-200 overflow-hidden">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-900 text-white border-b border-white/5">
                      <th class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Tiêu chí</th>
                      @for (level of previewLevelHeaders(); track $index) {
                        <th class="px-8 py-6 text-[10px] text-center font-black uppercase tracking-[0.2em] border-l border-white/5">{{ level }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (criterion of previewCriteria(); track $index) {
                      <tr>
                        <td class="px-8 py-8 bg-slate-50/50 border-r border-slate-100">
                          <div class="font-black text-slate-900 tracking-tight mb-2">{{ criterion.name || 'Tiêu chí #' + ($index + 1) }}</div>
                          <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-[#0056D2]"></span>
                            <span class="text-[10px] font-black uppercase tracking-widest text-[#0056D2]">{{ criterion.weight }}% Trọng số</span>
                          </div>
                        </td>
                        @for (level of criterion.levels; track $index) {
                          <td class="px-8 py-8 text-center border-l border-slate-100">
                            <div class="font-black text-slate-900 tracking-tight mb-2">{{ level.name || '-' }}</div>
                            <div class="inline-flex h-7 px-3 bg-emerald-50 text-emerald-600 rounded-full items-center text-[10px] font-black uppercase tracking-tight border border-emerald-100 shadow-sm">
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
            
            <div class="p-8 border-t border-slate-100 text-center bg-slate-100/30">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sơ đồ Rubric chuẩn hóa v1.0</p>
            </div>
          </div>
        </div>
      }

      <!-- Global Notification Overlay -->
      @if (error()) {
        <div class="fixed bottom-10 left-1/2 -translate-x-1/2 p-6 bg-rose-600 text-white rounded-3xl shadow-[0_20px_50px_rgba(225,29,72,0.3)] flex items-center gap-4 z-[200] animate-in slide-in-from-bottom-full duration-500">
          <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <lucide-icon name="alert-triangle" [size]="20"></lucide-icon>
          </div>
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Lỗi hệ thống</p>
            <p class="text-xs font-black uppercase tracking-widest">{{ error() }}</p>
          </div>
          <button (click)="error.set(null)" class="ml-4 p-2 hover:bg-white/10 rounded-xl transition-colors">
            <lucide-icon name="x" [size]="18"></lucide-icon>
          </button>
        </div>
      }
    </div>
  `
})
export class RubricEditorComponent implements OnInit {
  protected Math = Math;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private rubricApi = inject(RubricApi);
  
  // State
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  rubricId = signal<string | null>(null);
  showPreview = signal(false);
  
  // Form
  rubricForm = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    criteria: this.fb.array([])
  });
  
  get criteriaArray(): FormArray {
    return this.rubricForm.get('criteria') as FormArray;
  }
  
  totalWeight = computed(() => {
    const criteria = this.criteriaArray.value as { weight: number }[];
    return criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  });
  
  isWeightValid = computed(() => this.totalWeight() === 100);

  previewCriteria = computed((): RubricCriterion[] => {
    return this.criteriaArray.value as RubricCriterion[];
  });
  
  previewLevelHeaders = computed(() => {
    const criteria = this.previewCriteria();
    if (criteria.length === 0) return [];
    const maxLevels = Math.max(...criteria.map(c => (c.levels?.length || 0)));
    return Array.from({ length: maxLevels }, (_, i) => `Cấp độ ${i + 1}`);
  });
  
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('rubricId') || this.route.snapshot.paramMap.get('id');
    if (id) {
      this.rubricId.set(id);
      this.loadRubric(id);
    } else {
      this.loading.set(false);
      this.error.set('Không tìm thấy tham chiếu Rubric');
    }
  }
  
  private loadRubric(id: string): void {
    this.rubricApi.getById(id).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (!data) {
          this.error.set('Rubric không tồn tại trong hệ thống');
          this.loading.set(false);
          return;
        }
        const rubric: Rubric = {
          id: data.id,
          name: data.title,
          description: data.description || '',
          criteria: (data.criteria || []).map((c: any, ci: number) => ({
            id: `c${ci}`,
            name: c.name,
            description: c.description || '',
            weight: c.maxPoints || 0,
            levels: (c.levels || []).map((l: any, li: number) => ({
              id: `l${li}`,
              name: l.label,
              description: l.description || '',
              points: l.points || 0
            }))
          })),
          totalPoints: data.maxPoints || 100,
          createdAt: data.createdAt
        };
        this.populateForm(rubric);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Lỗi đồng bộ dữ liệu Rubric');
        this.loading.set(false);
      }
    });
  }
  
  private populateForm(rubric: Rubric): void {
    this.rubricForm.patchValue({
      name: rubric.name,
      description: rubric.description || ''
    });
    
    while (this.criteriaArray.length) {
      this.criteriaArray.removeAt(0);
    }
    
    for (const criterion of rubric.criteria) {
      this.addExistingCriterion(criterion);
    }
  }

  private addExistingCriterion(criterion: RubricCriterion): void {
    const criterionGroup = this.fb.group({
      id: [criterion.id],
      name: [criterion.name, Validators.required],
      description: [criterion.description || ''],
      weight: [criterion.weight, [Validators.required, Validators.min(0), Validators.max(100)]],
      levels: this.fb.array(criterion.levels.map(level => this.fb.group({
        id: [level.id],
        name: [level.name, Validators.required],
        description: [level.description],
        points: [level.points, [Validators.required, Validators.min(0)]]
      })))
    });
    this.criteriaArray.push(criterionGroup);
  }
  
  getLevelsArray(criterionIndex: number): FormArray {
    return this.criteriaArray.at(criterionIndex).get('levels') as FormArray;
  }
  
  addCriterion(): void {
    const id = generateRubricId('criterion');
    const criterionGroup = this.fb.group({
      id: [id],
      name: ['', Validators.required],
      description: [''],
      weight: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      levels: this.fb.array([this.createLevelFormGroup('Mức 1', 10)])
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
  
  togglePreview(): void {
    this.showPreview.update(v => !v);
  }
  
  saveRubric(): void {
    if (!this.rubricForm.valid || !this.isWeightValid()) {
      this.error.set('Vui lòng kiểm tra lại tính hợp lệ của Rubric');
      return;
    }
    
    this.saving.set(true);
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

    this.rubricApi.update(this.rubricId()!, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/teacher/assessments/shared/rubrics']);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Lỗi cập nhật dữ liệu. Thử lại sau.');
      }
    });
  }
}
