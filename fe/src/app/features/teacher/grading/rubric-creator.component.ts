import { Component, ChangeDetectionStrategy, ViewEncapsulation, signal, computed } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { 
  RubricCriterion, 
  validateRubricWeightSum, 
  createDefaultCriterion, 
  generateRubricId,
  getRemainingWeight,
  isValidWeightSum
} from './utils/rubric-calculator';

/**
 * Rubric Creator Component
 * 
 * Creates new rubrics with dynamic criteria builder.
 * Features: add/remove criteria, point configuration, preview mode.
 * 
 * @requirements 6.1
 */
@Component({
  selector: 'app-rubric-creator',
  imports: [RouterLink, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tạo Rubric mới</h1>
          <p class="text-gray-600 mt-1">Định nghĩa các tiêu chí chấm điểm</p>
        </div>
        <a routerLink="/teacher/grading/rubrics" class="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Quay lại
        </a>
      </div>

      <form [formGroup]="rubricForm" (ngSubmit)="saveRubric()">
        <!-- Basic Info -->
        <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tên Rubric *</label>
              <input type="text" formControlName="name" 
                     class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     placeholder="VD: Rubric Bài tập Hàng hải"/>
              @if (rubricForm.get('name')?.errors?.['required'] && rubricForm.get('name')?.touched) {
                <p class="text-red-500 text-sm mt-1">Tên rubric là bắt buộc</p>
              }
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea formControlName="description" rows="2"
                        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Mô tả ngắn về rubric này..."></textarea>
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
                      class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Thêm tiêu chí
              </button>
            </div>
          </div>
          
          @if (criteriaArray.length === 0) {
            <div class="text-center py-8 text-gray-500">
              <p>Chưa có tiêu chí nào. Nhấn "Thêm tiêu chí" để bắt đầu.</p>
            </div>
          } @else {
            <div class="space-y-4" formArrayName="criteria">
              @for (criterion of criteriaArray.controls; track $index; let i = $index) {
                <div class="border rounded-lg p-4" [formGroupName]="i">
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1 grid grid-cols-12 gap-4">
                      <div class="col-span-6">
                        <label class="block text-xs font-medium text-gray-500 mb-1">Tên tiêu chí</label>
                        <input type="text" formControlName="name" 
                               class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                               placeholder="VD: Kiến thức chuyên môn"/>
                      </div>
                      <div class="col-span-3">
                        <label class="block text-xs font-medium text-gray-500 mb-1">Trọng số (%)</label>
                        <input type="number" formControlName="weight" min="0" max="100"
                               class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div class="col-span-3 flex items-end">
                        <button type="button" (click)="removeCriterion(i)" 
                                class="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Xóa tiêu chí">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mb-3">
                    <label class="block text-xs font-medium text-gray-500 mb-1">Mô tả tiêu chí</label>
                    <input type="text" formControlName="description" 
                           class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                           placeholder="Mô tả chi tiết tiêu chí này..."/>
                  </div>
                  
                  <!-- Levels -->
                  <div class="mt-3 pt-3 border-t">
                    <div class="flex items-center justify-between mb-2">
                      <label class="text-xs font-medium text-gray-500">Các mức điểm</label>
                      <button type="button" (click)="addLevel(i)" 
                              class="text-xs text-blue-600 hover:underline">+ Thêm mức</button>
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
          }
          
          @if (!isWeightValid() && criteriaArray.length > 0) {
            <div class="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
              Tổng trọng số phải bằng 100%. Còn thiếu {{ remainingWeight() }}%.
            </div>
          }
        </div>

        <!-- Preview Section -->
        @if (showPreview()) {
          <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Xem trước Rubric</h2>
            <div class="border rounded-lg overflow-hidden">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Tiêu chí</th>
                    @for (level of previewLevelHeaders(); track $index) {
                      <th class="px-4 py-2 text-center text-sm font-medium text-gray-700">{{ level }}</th>
                    }
                  </tr>
                </thead>
                <tbody class="divide-y">
                  @for (criterion of previewCriteria(); track criterion.id) {
                    <tr>
                      <td class="px-4 py-3">
                        <div class="font-medium text-gray-900">{{ criterion.name }}</div>
                        <div class="text-xs text-gray-500">Trọng số: {{ criterion.weight }}%</div>
                      </td>
                      @for (level of criterion.levels; track level.id) {
                        <td class="px-4 py-3 text-center text-sm">
                          <div class="font-medium">{{ level.name }}</div>
                          <div class="text-gray-500">{{ level.points }} điểm</div>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Actions -->
        <div class="flex items-center justify-between">
          <button type="button" (click)="togglePreview()" 
                  class="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            {{ showPreview() ? 'Ẩn xem trước' : 'Xem trước' }}
          </button>
          
          <div class="flex items-center gap-3">
            <a routerLink="/teacher/grading/rubrics" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Hủy
            </a>
            <button type="submit" [disabled]="!rubricForm.valid || !isWeightValid() || saving()"
                    class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {{ saving() ? 'Đang lưu...' : 'Lưu Rubric' }}
            </button>
          </div>
        </div>
        
        @if (error()) {
          <div class="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {{ error() }}
          </div>
        }
      </form>
    </div>
  `
})
export class RubricCreatorComponent {
  private fb = new FormBuilder();
  private router?: Router;
  
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
  
  // Computed
  totalWeight = computed(() => {
    const criteria = this.criteriaArray.value as { weight: number }[];
    return criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  });
  
  remainingWeight = computed(() => 100 - this.totalWeight());
  
  isWeightValid = computed(() => this.totalWeight() === 100);
  
  previewCriteria = computed((): RubricCriterion[] => {
    return this.criteriaArray.value as RubricCriterion[];
  });
  
  previewLevelHeaders = computed(() => {
    const criteria = this.previewCriteria();
    if (criteria.length === 0) return [];
    const maxLevels = Math.max(...criteria.map(c => c.levels?.length || 0));
    return Array.from({ length: maxLevels }, (_, i) => `Mức ${i + 1}`);
  });

  constructor() {
    // Add initial criterion
    this.addCriterion();
  }
  
  getLevelsArray(criterionIndex: number): FormArray {
    return this.criteriaArray.at(criterionIndex).get('levels') as FormArray;
  }
  
  addCriterion(): void {
    const id = generateRubricId('criterion');
    const defaultCriterion = createDefaultCriterion(id, '', this.remainingWeight() > 0 ? Math.min(this.remainingWeight(), 25) : 0);
    
    const criterionGroup = this.fb.group({
      id: [id],
      name: ['', Validators.required],
      description: [''],
      weight: [defaultCriterion.weight, [Validators.required, Validators.min(0), Validators.max(100)]],
      levels: this.fb.array(defaultCriterion.levels.map(level => this.fb.group({
        id: [level.id],
        name: [level.name, Validators.required],
        description: [level.description],
        points: [level.points, [Validators.required, Validators.min(0)]]
      })))
    });
    
    this.criteriaArray.push(criterionGroup);
  }
  
  removeCriterion(index: number): void {
    this.criteriaArray.removeAt(index);
  }
  
  addLevel(criterionIndex: number): void {
    const levelsArray = this.getLevelsArray(criterionIndex);
    const levelId = generateRubricId('level');
    
    levelsArray.push(this.fb.group({
      id: [levelId],
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
  
  togglePreview(): void {
    this.showPreview.update(v => !v);
  }
  
  saveRubric(): void {
    if (!this.rubricForm.valid || !this.isWeightValid()) {
      this.error.set('Vui lòng điền đầy đủ thông tin và đảm bảo tổng trọng số bằng 100%');
      return;
    }
    
    // Validate weight sum
    const criteria = this.criteriaArray.value as RubricCriterion[];
    const validation = validateRubricWeightSum(criteria);
    if (!validation.isValid) {
      this.error.set(validation.errors[0]?.message || 'Lỗi validation');
      return;
    }
    
    this.saving.set(true);
    this.error.set(null);
    
    const rubricData = {
      ...this.rubricForm.value,
      id: generateRubricId('rubric'),
      totalPoints: 100,
      createdAt: new Date().toISOString()
    };
    
    // TODO: Call API to save rubric
    // Simulate API call
    setTimeout(() => {
      this.saving.set(false);
      // Navigate back to list
      if (this.router) {
        this.router.navigate(['/teacher/grading/rubrics']);
      }
    }, 1000);
  }
}
