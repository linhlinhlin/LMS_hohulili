import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
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
  selector: 'app-rubric-editor',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">✏️ Chỉnh sửa Rubric</h1>
              <p class="text-gray-600">Cập nhật tiêu chí chấm điểm</p>
            </div>
            <div class="flex space-x-3">
              <button (click)="previewRubric()"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Xem trước
              </button>
              <button (click)="goBack()"
                      class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                Quay lại
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p class="mt-2 text-gray-600">Đang tải rubric...</p>
          </div>
        } @else {
          <form (ngSubmit)="updateRubric()" class="space-y-8">
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
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                   <textarea [(ngModel)]="rubric().description"
                            name="description"
                            rows="3"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"></textarea>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>Tạo lúc: {{ formatDate(rubric().createdAt) }}</div>
                  <div>Cập nhật lần cuối: {{ formatDate(rubric().updatedAt) }}</div>
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
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả tiêu chí</label>
                        <textarea [(ngModel)]="criteria.description"
                                  name="criteria_{{ criteria.id }}_description"
                                  rows="2"
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
                                       class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                              </div>
                              <div class="w-20">
                                <input type="number" 
                                       [(ngModel)]="level.points"
                                       name="level_{{ level.id }}_points"
                                       min="0"
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
                  <p class="text-gray-500 mb-4">Thêm tiêu chí đầu tiên để bắt đầu</p>
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
                Cập nhật Rubric
              </button>
            </div>
          </form>
        }
      </div>
    </div>

    <!-- Preview Modal -->
    @if (showPreviewModal()) {
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Xem trước Rubric</h3>
              <button (click)="closePreviewModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div class="space-y-6">
              <div>
                <h4 class="text-xl font-semibold text-gray-900">{{ rubric().title }}</h4>
                <p class="text-gray-600 mt-2">{{ rubric().description }}</p>
              </div>
              
              <div class="space-y-4">
                @for (criteria of rubric().criteria; track criteria.id) {
                  <div class="border border-gray-200 rounded-lg p-4">
                    <div class="flex justify-between items-start mb-3">
                      <h5 class="font-medium text-gray-900">{{ criteria.title }}</h5>
                      <span class="text-sm text-gray-500">Trọng số: {{ criteria.weight }}%</span>
                    </div>
                    <p class="text-sm text-gray-600 mb-3">{{ criteria.description }}</p>
                    
                    <div class="space-y-2">
                      @for (level of criteria.levels; track level.id) {
                        <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div class="flex-1">
                            <span class="font-medium text-gray-900">{{ level.title }}</span>
                            <p class="text-sm text-gray-600">{{ level.description }}</p>
                          </div>
                          <span class="text-sm font-medium text-blue-600">{{ level.points }} điểm</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
              
              <div class="bg-blue-50 p-4 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="font-medium text-gray-900">Tổng điểm tối đa:</span>
                  <span class="text-xl font-bold text-blue-600">{{ maxPoints() }} điểm</span>
                </div>
              </div>
            </div>
            
            <div class="flex justify-end mt-6">
              <button (click)="closePreviewModal()"
                      class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RubricEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);

  rubricId = signal<string>('');
  isLoading = signal<boolean>(true);
  showPreviewModal = signal<boolean>(false);
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

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.rubricId.set(params['id']);
      this.loadRubric();
    });
  }

  private loadRubric(): void {
    // Mock data for now
    const mockRubric: Rubric = {
      id: this.rubricId(),
      title: 'Rubric chấm điểm bài tập An toàn Hàng hải',
      description: 'Tiêu chí chấm điểm cho bài tập về an toàn hàng hải',
      criteria: [
        {
          id: 'criteria_1',
          title: 'Kiến thức lý thuyết',
          description: 'Hiểu biết về các quy định an toàn hàng hải',
          weight: 40,
          levels: [
            { id: 'level_1', title: 'Xuất sắc', description: '', points: 100 },
            { id: 'level_2', title: 'Tốt', description: '', points: 80 },
            { id: 'level_3', title: 'Đạt', description: '', points: 60 },
            { id: 'level_4', title: 'Chưa đạt', description: '', points: 40 }
          ]
        },
        {
          id: 'criteria_2',
          title: 'Thực hành',
          description: 'Khả năng áp dụng kiến thức vào thực tế',
          weight: 35,
          levels: [
            { id: 'level_5', title: 'Xuất sắc', description: '', points: 100 },
            { id: 'level_6', title: 'Tốt', description: '', points: 80 },
            { id: 'level_7', title: 'Đạt', description: '', points: 60 },
            { id: 'level_8', title: 'Chưa đạt', description: '', points: 40 }
          ]
        },
        {
          id: 'criteria_3',
          title: 'Trình bày',
          description: 'Cách trình bày và giải thích',
          weight: 25,
          levels: [
            { id: 'level_9', title: 'Xuất sắc', description: '', points: 100 },
            { id: 'level_10', title: 'Tốt', description: '', points: 80 },
            { id: 'level_11', title: 'Đạt', description: '', points: 60 },
            { id: 'level_12', title: 'Chưa đạt', description: '', points: 40 }
          ]
        }
      ],
      totalPoints: 300,
      createdAt: new Date('2024-09-15'),
      updatedAt: new Date('2024-09-20')
    };

    setTimeout(() => {
      this.rubric.set(mockRubric);
      this.isLoading.set(false);
    }, 1000);
  }

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

  updateRubric(): void {
    if (this.isValidRubric()) {
      const rubric = {
        ...this.rubric(),
        totalPoints: this.maxPoints(),
        updatedAt: new Date()
      };

      console.log('Updated rubric:', rubric);
      // Save to service/database
      try {
        // Here you would typically call a service to save the rubric
        // await this.rubricService.updateRubric(rubric);
        console.log('Rubric saved successfully');
        this.goBack();
      } catch (error) {
        console.error('Error saving rubric:', error);
      }
    }
  }

  previewRubric(): void {
    // Open preview modal
    this.showPreviewModal.set(true);
  }

  closePreviewModal(): void {
    this.showPreviewModal.set(false);
  }

  goBack(): void {
    window.history.back();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }
}