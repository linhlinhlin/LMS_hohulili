import { Component, signal, computed, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface RubricCriteria {
  id: string;
  title: string;
  description: string;
  weight: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  id: string;
  title: string;
  description: string;
  points: number;
}

export interface Rubric {
  id: string;
  title: string;
  description: string;
  criteria: RubricCriteria[];
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-rubric-creator',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">📋 Tạo Rubric mới</h1>
              <p class="text-gray-600">Tạo tiêu chí chấm điểm chi tiết cho bài tập</p>
            </div>
            <button (click)="goBack()"
                    class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Quay lại
            </button>
          </div>
        </div>

        <form (ngSubmit)="createRubric()" class="space-y-8">
          <!-- Basic Information -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">Thông tin cơ bản</h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tên Rubric *</label>
                <input type="text" 
                        [(ngModel)]="rubric().title"
                       name="title"
                       required
                       placeholder="Ví dụ: Rubric chấm điểm bài tập An toàn Hàng hải"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                 <textarea [(ngModel)]="rubric().description"
                          name="description"
                          rows="3"
                          placeholder="Mô tả ngắn gọn về rubric này..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"></textarea>
              </div>
            </div>
          </div>

          <!-- Criteria -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-gray-900">Tiêu chí chấm điểm</h2>
              <button type="button"
                      (click)="addCriteria()"
                      class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Thêm tiêu chí
              </button>
            </div>

            <div class="space-y-6">
              @for (criteria of rubric().criteria; track criteria.id; let i = $index) {
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-medium text-gray-900">Tiêu chí {{ i + 1 }}</h3>
                    <button type="button"
                            (click)="removeCriteria(criteria.id)"
                            class="text-red-600 hover:text-red-800">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  </div>

                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Tên tiêu chí *</label>
                      <input type="text" 
                             [(ngModel)]="criteria.title"
                             name="criteria_{{ criteria.id }}_title"
                             required
                             placeholder="Ví dụ: Kiến thức lý thuyết"
                             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả tiêu chí</label>
                      <textarea [(ngModel)]="criteria.description"
                                name="criteria_{{ criteria.id }}_description"
                                rows="2"
                                placeholder="Mô tả chi tiết tiêu chí này..."
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"></textarea>
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Trọng số (%) *</label>
                      <input type="number" 
                             [(ngModel)]="criteria.weight"
                             name="criteria_{{ criteria.id }}_weight"
                             min="1"
                             max="100"
                             required
                             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                    </div>

                    <!-- Levels -->
                    <div>
                      <div class="flex items-center justify-between mb-3">
                        <label class="block text-sm font-medium text-gray-700">Mức độ đánh giá</label>
                        <button type="button"
                                (click)="addLevel(criteria.id)"
                                class="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm">
                          Thêm mức độ
                        </button>
                      </div>
                      
                      <div class="space-y-3">
                        @for (level of criteria.levels; track level.id; let j = $index) {
                          <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div class="flex-1">
                              <input type="text" 
                                     [(ngModel)]="level.title"
                                     name="level_{{ level.id }}_title"
                                     placeholder="Tên mức độ (ví dụ: Xuất sắc)"
                                     class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                            </div>
                            <div class="w-20">
                              <input type="number" 
                                     [(ngModel)]="level.points"
                                     name="level_{{ level.id }}_points"
                                     min="0"
                                     placeholder="Điểm"
                                     class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                            </div>
                            <button type="button"
                                    (click)="removeLevel(criteria.id, level.id)"
                                    class="text-red-600 hover:text-red-800">
                              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                              </svg>
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Empty State -->
            @if (rubric().criteria.length === 0) {
              <div class="text-center py-8">
                <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có tiêu chí nào</h3>
                <p class="text-gray-500 mb-4">Thêm tiêu chí đầu tiên để bắt đầu tạo rubric</p>
                <button type="button"
                        (click)="addCriteria()"
                        class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  Thêm tiêu chí đầu tiên
                </button>
              </div>
            }
          </div>

          <!-- Summary -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Tóm tắt</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center p-4 bg-purple-50 rounded-lg">
                  <div class="text-2xl font-bold text-purple-600">{{ rubric().criteria.length }}</div>
                <div class="text-sm text-gray-600">Tiêu chí</div>
              </div>
              <div class="text-center p-4 bg-blue-50 rounded-lg">
                <div class="text-2xl font-bold text-blue-600">{{ totalWeight() }}%</div>
                <div class="text-sm text-gray-600">Tổng trọng số</div>
              </div>
              <div class="text-center p-4 bg-green-50 rounded-lg">
                <div class="text-2xl font-bold text-green-600">{{ maxPoints() }}</div>
                <div class="text-sm text-gray-600">Điểm tối đa</div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-4">
            <button type="button"
                    (click)="goBack()"
                    class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Hủy
            </button>
            <button type="submit"
                    [disabled]="!isValidRubric()"
                    class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Tạo Rubric
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RubricCreatorComponent {
  rubric = signal<Rubric>({
    id: '',
    title: '',
    description: '',
    criteria: [],
    totalPoints: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  totalWeight = computed(() => {
    return this.rubric().criteria.reduce((sum, criteria) => sum + (criteria.weight || 0), 0);
  });

  maxPoints = computed(() => {
    return this.rubric().criteria.reduce((sum, criteria) => {
      const maxLevelPoints = Math.max(...criteria.levels.map(level => level.points || 0));
      return sum + maxLevelPoints;
    }, 0);
  });

  isValidRubric = computed(() => {
    const rubric = this.rubric();
    return rubric.title.trim() !== '' && 
           rubric.criteria.length > 0 && 
           rubric.criteria.every(criteria => 
             criteria.title.trim() !== '' && 
             criteria.weight > 0 && 
             criteria.levels.length > 0 &&
             criteria.levels.every(level => level.title.trim() !== '' && level.points >= 0)
           );
  });

  addCriteria(): void {
    const newCriteria: RubricCriteria = {
      id: this.generateId(),
      title: '',
      description: '',
      weight: 0,
      levels: [
        {
          id: this.generateId(),
          title: 'Xuất sắc',
          description: '',
          points: 100
        },
        {
          id: this.generateId(),
          title: 'Tốt',
          description: '',
          points: 80
        },
        {
          id: this.generateId(),
          title: 'Đạt',
          description: '',
          points: 60
        },
        {
          id: this.generateId(),
          title: 'Chưa đạt',
          description: '',
          points: 40
        }
      ]
    };

    this.rubric.update(rubric => ({
      ...rubric,
      criteria: [...rubric.criteria, newCriteria]
    }));
  }

  removeCriteria(criteriaId: string): void {
    this.rubric.update(rubric => ({
      ...rubric,
      criteria: rubric.criteria.filter(criteria => criteria.id !== criteriaId)
    }));
  }

  addLevel(criteriaId: string): void {
    const newLevel: RubricLevel = {
      id: this.generateId(),
      title: '',
      description: '',
      points: 0
    };

    this.rubric.update(rubric => ({
      ...rubric,
      criteria: rubric.criteria.map(criteria => 
        criteria.id === criteriaId 
          ? { ...criteria, levels: [...criteria.levels, newLevel] }
          : criteria
      )
    }));
  }

  removeLevel(criteriaId: string, levelId: string): void {
    this.rubric.update(rubric => ({
      ...rubric,
      criteria: rubric.criteria.map(criteria => 
        criteria.id === criteriaId 
          ? { ...criteria, levels: criteria.levels.filter(level => level.id !== levelId) }
          : criteria
      )
    }));
  }

  createRubric(): void {
    if (this.isValidRubric()) {
      const rubric = {
        ...this.rubric(),
        id: this.generateId(),
        totalPoints: this.maxPoints(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Created rubric:', rubric);
      // Save to service/database
      try {
        // Here you would typically call a service to save the rubric
        // await this.rubricService.createRubric(rubric);
        console.log('Rubric created successfully');
        this.goBack();
      } catch (error) {
        console.error('Error creating rubric:', error);
      }
    }
  }

  goBack(): void {
    window.history.back();
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }
}