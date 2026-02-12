import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
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
 * 
 * @requirements 6.3
 */
@Component({
  selector: 'app-rubric-editor',
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Chỉnh sửa Rubric</h1>
          <p class="text-gray-600 mt-1">Cập nhật tiêu chí chấm điểm</p>
        </div>
        <a routerLink="/teacher/grading/rubrics" class="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Quay lại
        </a>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2]"></div>
        </div>
      } @else {
        <form [formGroup]="rubricForm" (ngSubmit)="saveRubric()">
          <!-- Basic Info -->
          <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tên Rubric *</label>
                <input type="text" formControlName="name" 
                       class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0056D2]"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea formControlName="description" rows="2"
                          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0056D2]"></textarea>
              </div>
            </div>
          </div>

          <!-- Criteria Section -->
          <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">Tiêu chí chấm điểm</h2>
              <div class="flex items-center gap-4">
                <span class="text-sm" [class.text-green-600]="isWeightValid()" [class.text-red-600]="!isWeightValid()">
                  Tổng trọng số: {{ totalWeight() }}% / 100%
                </span>
                <button type="button" (click)="addCriterion()" 
                        class="px-3 py-1.5 bg-blue-50 text-[#0056D2] rounded-lg hover:bg-blue-100 text-sm">
                  + Thêm tiêu chí
                </button>
              </div>
            </div>
            
            <div class="space-y-4" formArrayName="criteria">
              @for (criterion of criteriaArray.controls; track $index; let i = $index) {
                <div class="border rounded-lg p-4" [formGroupName]="i">
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1 grid grid-cols-12 gap-4">
                      <div class="col-span-6">
                        <label class="block text-xs font-medium text-gray-500 mb-1">Tên tiêu chí</label>
                        <input type="text" formControlName="name" 
                               class="w-full px-3 py-2 border rounded-lg text-sm"/>
                      </div>
                      <div class="col-span-3">
                        <label class="block text-xs font-medium text-gray-500 mb-1">Trọng số (%)</label>
                        <input type="number" formControlName="weight" min="0" max="100"
                               class="w-full px-3 py-2 border rounded-lg text-sm"/>
                      </div>
                      <div class="col-span-3 flex items-end">
                        <button type="button" (click)="removeCriterion(i)" 
                                class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mb-3">
                    <label class="block text-xs font-medium text-gray-500 mb-1">Mô tả</label>
                    <input type="text" formControlName="description" 
                           class="w-full px-3 py-2 border rounded-lg text-sm"/>
                  </div>
                  
                  <!-- Levels -->
                  <div class="mt-3 pt-3 border-t">
                    <div class="flex items-center justify-between mb-2">
                      <label class="text-xs font-medium text-gray-500">Các mức điểm</label>
                      <button type="button" (click)="addLevel(i)" class="text-xs text-[#0056D2] hover:underline">
                        + Thêm mức
                      </button>
                    </div>
                    <div class="space-y-2" formArrayName="levels">
                      @for (level of getLevelsArray(i).controls; track $index; let j = $index) {
                        <div class="flex items-center gap-2" [formGroupName]="j">
                          <input type="text" formControlName="name" placeholder="Tên mức" 
                                 class="flex-1 px-2 py-1 border rounded text-sm"/>
                          <input type="number" formControlName="points" placeholder="Điểm" min="0"
                                 class="w-20 px-2 py-1 border rounded text-sm"/>
                          <button type="button" (click)="removeLevel(i, j)" class="p-1 text-red-400 hover:text-red-600">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
            
            @if (!isWeightValid() && criteriaArray.length > 0) {
              <div class="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
                Tổng trọng số phải bằng 100%. Còn thiếu {{ 100 - totalWeight() }}%.
              </div>
            }
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3">
            <a routerLink="/teacher/grading/rubrics" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Hủy
            </a>
            <button type="submit" [disabled]="!rubricForm.valid || !isWeightValid() || saving()"
                    class="px-6 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] disabled:opacity-50">
              {{ saving() ? 'Đang lưu...' : 'Lưu thay đổi' }}
            </button>
          </div>
          
          @if (error()) {
            <div class="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">{{ error() }}</div>
          }
        </form>
      }
    </div>
  `
})

export class RubricEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private rubricApi = inject(RubricApi);
  
  // State
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  rubricId = signal<string | null>(null);
  
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
  
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.rubricId.set(id);
      this.loadRubric(id);
    } else {
      this.loading.set(false);
      this.error.set('Không tìm thấy Rubric');
    }
  }
  
  private loadRubric(id: string): void {
    this.rubricApi.getById(id).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (!data) {
          this.error.set('Không tìm thấy Rubric');
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
        this.error.set(err?.error?.message || 'Không thể tải rubric');
        this.loading.set(false);
      }
    });
  }
  
  private populateForm(rubric: Rubric): void {
    this.rubricForm.patchValue({
      name: rubric.name,
      description: rubric.description || ''
    });
    
    // Clear existing criteria
    while (this.criteriaArray.length) {
      this.criteriaArray.removeAt(0);
    }
    
    // Add criteria from rubric
    for (const criterion of rubric.criteria) {
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
      levels: this.fb.array([this.fb.group({
        id: [generateRubricId('level')],
        name: ['', Validators.required],
        description: [''],
        points: [0, [Validators.required, Validators.min(0)]]
      })])
    });
    this.criteriaArray.push(criterionGroup);
  }
  
  removeCriterion(index: number): void {
    this.criteriaArray.removeAt(index);
  }
  
  addLevel(criterionIndex: number): void {
    const levelsArray = this.getLevelsArray(criterionIndex);
    levelsArray.push(this.fb.group({
      id: [generateRubricId('level')],
      name: ['', Validators.required],
      description: [''],
      points: [0, [Validators.required, Validators.min(0)]]
    }));
  }
  
  removeLevel(criterionIndex: number, levelIndex: number): void {
    const levelsArray = this.getLevelsArray(criterionIndex);
    if (levelsArray.length > 1) {
      levelsArray.removeAt(levelIndex);
    }
  }
  
  saveRubric(): void {
    if (!this.rubricForm.valid || !this.isWeightValid()) {
      this.error.set('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    const criteria = this.criteriaArray.value as RubricCriterion[];
    const validation = validateRubricWeightSum(criteria);
    if (!validation.isValid) {
      this.error.set(validation.errors[0]?.message || 'Lỗi validation');
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

    this.rubricApi.update(this.rubricId()!, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/teacher/grading/rubrics']);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Không thể lưu rubric. Vui lòng thử lại.');
      }
    });
  }
}
