import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface GradingRubric {
  id: string;
  name: string;
  description: string;
  criteria: RubricCriteria[];
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
  isTemplate: boolean;
  usageCount: number;
  category: string;
}

interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

interface RubricLevel {
  name: string;
  description: string;
  points: number;
  examples?: string[];
}

@Component({
  selector: 'app-rubric-manager',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải quản lý rubric..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">📋 Quản lý Rubric</h1>
              <p class="text-gray-600">Tạo và quản lý rubric chấm điểm cho bài tập</p>
            </div>
            <button (click)="createNewRubric()"
                    class="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              Tạo Rubric mới
            </button>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng Rubric</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalRubrics() }}</p>
                <p class="text-sm text-purple-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                  </svg>
                  Templates
                </p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Đã sử dụng</p>
                <p class="text-3xl font-bold text-gray-900">{{ usedRubrics() }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  Active
                </p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Templates</p>
                <p class="text-3xl font-bold text-gray-900">{{ templateRubrics() }}</p>
                <p class="text-sm text-blue-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"></path>
                  </svg>
                  Reusable
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng điểm</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalPoints() }}</p>
                <p class="text-sm text-orange-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h4.586l-1.293-1.293a1 1 0 011.414-1.414L10 15.414l2.293-2.293a1 1 0 111.414 1.414L12.414 15H17a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  Max Score
                </p>
              </div>
              <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h4.586l-1.293-1.293a1 1 0 011.414-1.414L10 15.414l2.293-2.293a1 1 0 111.414 1.414L12.414 15H17a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter and Search -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div class="relative">
                <input type="text" 
                       [(ngModel)]="searchQuery"
                       placeholder="Tìm kiếm rubric..."
                       class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                </svg>
              </div>
              
              <select [(ngModel)]="selectedCategory" 
                      class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Tất cả danh mục</option>
                <option value="navigation">Navigation</option>
                <option value="engineering">Engineering</option>
                <option value="safety">Safety</option>
                <option value="management">Management</option>
              </select>
              
              <select [(ngModel)]="selectedType" 
                      class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Tất cả loại</option>
                <option value="template">Templates</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            <div class="flex items-center space-x-2">
              <button (click)="toggleSortOrder()"
                      class="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h4.586l-1.293-1.293a1 1 0 011.414-1.414L10 15.414l2.293-2.293a1 1 0 111.414 1.414L12.414 15H17a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </button>
              <span class="text-sm text-gray-600">{{ filteredRubrics().length }} rubric</span>
            </div>
          </div>
        </div>

        <!-- Rubrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          @for (rubric of filteredRubrics(); track rubric.id) {
            <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <!-- Rubric Header -->
              <div class="p-6 border-b border-gray-200">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ rubric.name }}</h3>
                    <p class="text-sm text-gray-600 mb-3">{{ rubric.description }}</p>
                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                      <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        {{ rubric.criteria.length }} tiêu chí
                      </span>
                      <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h4.586l-1.293-1.293a1 1 0 011.414-1.414L10 15.414l2.293-2.293a1 1 0 111.414 1.414L12.414 15H17a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        {{ rubric.totalPoints }} điểm
                      </span>
                    </div>
                  </div>
                  
                  <div class="flex flex-col items-end space-y-2">
                    @if (rubric.isTemplate) {
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Template
                      </span>
                    }
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {{ rubric.category }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Rubric Criteria Preview -->
              <div class="p-6">
                <h4 class="text-sm font-medium text-gray-900 mb-3">Tiêu chí đánh giá:</h4>
                <div class="space-y-3">
                  @for (criteria of rubric.criteria.slice(0, 3); track criteria.id) {
                    <div class="p-3 bg-gray-50 rounded-lg">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-900">{{ criteria.name }}</span>
                        <span class="text-sm text-gray-600">{{ criteria.maxPoints }} điểm</span>
                      </div>
                      <p class="text-xs text-gray-600">{{ criteria.description }}</p>
                    </div>
                  }
                  @if (rubric.criteria.length > 3) {
                    <div class="text-sm text-gray-500 text-center">
                      +{{ rubric.criteria.length - 3 }} tiêu chí khác...
                    </div>
                  }
                </div>
              </div>

              <!-- Rubric Actions -->
              <div class="p-6 border-t border-gray-200 bg-gray-50">
                <div class="flex items-center justify-between">
                  <div class="text-sm text-gray-600">
                    Đã sử dụng {{ rubric.usageCount }} lần
                  </div>
                  <div class="flex items-center space-x-2">
                    <button (click)="editRubric(rubric)"
                            class="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      Chỉnh sửa
                    </button>
                    <button (click)="duplicateRubric(rubric)"
                            class="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Sao chép
                    </button>
                    <button (click)="deleteRubric(rubric)"
                            class="px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (filteredRubrics().length === 0) {
          <div class="text-center py-12">
            <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không tìm thấy rubric nào</h3>
            <p class="text-gray-500 mb-4">Hãy tạo rubric đầu tiên của bạn</p>
            <button (click)="createNewRubric()"
                    class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Tạo Rubric mới
            </button>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RubricManagerComponent implements OnInit {
  private router = inject(Router);

  // Signals
  isLoading = signal(false);
  rubrics = signal<GradingRubric[]>([]);
  searchQuery = signal('');
  selectedCategory = signal('');
  selectedType = signal('');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Computed properties
  totalRubrics = computed(() => this.rubrics().length);
  
  usedRubrics = computed(() => 
    this.rubrics().filter(r => r.usageCount > 0).length
  );

  templateRubrics = computed(() => 
    this.rubrics().filter(r => r.isTemplate).length
  );

  totalPoints = computed(() => 
    this.rubrics().reduce((sum, r) => sum + r.totalPoints, 0)
  );

  filteredRubrics = computed(() => {
    let filtered = this.rubrics();
    
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query)
      );
    }
    
    if (this.selectedCategory()) {
      filtered = filtered.filter(r => r.category === this.selectedCategory());
    }
    
    if (this.selectedType()) {
      if (this.selectedType() === 'template') {
        filtered = filtered.filter(r => r.isTemplate);
      } else if (this.selectedType() === 'custom') {
        filtered = filtered.filter(r => !r.isTemplate);
      }
    }
    
    // Sort by creation date
    return filtered.sort((a, b) => {
      const comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return this.sortOrder() === 'asc' ? comparison : -comparison;
    });
  });

  ngOnInit(): void {
    this.loadRubrics();
  }

  private loadRubrics(): void {
    this.isLoading.set(true);
    
    // Load mock data
    setTimeout(() => {
      this.rubrics.set(this.generateMockRubrics());
      this.isLoading.set(false);
    }, 1000);
  }

  private generateMockRubrics(): GradingRubric[] {
    return [
      {
        id: 'r1',
        name: 'Navigation Safety Rubric',
        description: 'Rubric for evaluating navigation safety knowledge and skills',
        category: 'navigation',
        totalPoints: 100,
        isTemplate: true,
        usageCount: 15,
        criteria: [
          {
            id: 'c1',
            name: 'Knowledge of Regulations',
            description: 'Understanding of maritime regulations and safety protocols',
            maxPoints: 40,
            levels: [
              { name: 'Excellent', description: 'Complete understanding of all regulations', points: 40 },
              { name: 'Good', description: 'Good understanding with minor gaps', points: 30 },
              { name: 'Fair', description: 'Basic understanding with some gaps', points: 20 },
              { name: 'Poor', description: 'Limited understanding with major gaps', points: 10 }
            ]
          },
          {
            id: 'c2',
            name: 'Practical Application',
            description: 'Ability to apply knowledge in real-world scenarios',
            maxPoints: 35,
            levels: [
              { name: 'Excellent', description: 'Consistently applies knowledge correctly', points: 35 },
              { name: 'Good', description: 'Usually applies knowledge correctly', points: 28 },
              { name: 'Fair', description: 'Sometimes applies knowledge correctly', points: 21 },
              { name: 'Poor', description: 'Rarely applies knowledge correctly', points: 14 }
            ]
          },
          {
            id: 'c3',
            name: 'Communication',
            description: 'Clear communication of safety procedures',
            maxPoints: 25,
            levels: [
              { name: 'Excellent', description: 'Clear and concise communication', points: 25 },
              { name: 'Good', description: 'Generally clear communication', points: 20 },
              { name: 'Fair', description: 'Adequate communication', points: 15 },
              { name: 'Poor', description: 'Unclear communication', points: 10 }
            ]
          }
        ],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20')
      },
      {
        id: 'r2',
        name: 'Marine Engineering Assignment',
        description: 'Rubric for marine engineering projects and assignments',
        category: 'engineering',
        totalPoints: 150,
        isTemplate: false,
        usageCount: 8,
        criteria: [
          {
            id: 'c4',
            name: 'Technical Accuracy',
            description: 'Accuracy of technical calculations and solutions',
            maxPoints: 60,
            levels: [
              { name: 'Excellent', description: 'All calculations are accurate', points: 60 },
              { name: 'Good', description: 'Most calculations are accurate', points: 48 },
              { name: 'Fair', description: 'Some calculations are accurate', points: 36 },
              { name: 'Poor', description: 'Few calculations are accurate', points: 24 }
            ]
          },
          {
            id: 'c5',
            name: 'Problem Solving',
            description: 'Ability to solve complex engineering problems',
            maxPoints: 50,
            levels: [
              { name: 'Excellent', description: 'Solves complex problems efficiently', points: 50 },
              { name: 'Good', description: 'Solves most problems correctly', points: 40 },
              { name: 'Fair', description: 'Solves basic problems', points: 30 },
              { name: 'Poor', description: 'Struggles with problem solving', points: 20 }
            ]
          },
          {
            id: 'c6',
            name: 'Documentation',
            description: 'Quality of technical documentation',
            maxPoints: 40,
            levels: [
              { name: 'Excellent', description: 'Comprehensive and clear documentation', points: 40 },
              { name: 'Good', description: 'Good documentation with minor issues', points: 32 },
              { name: 'Fair', description: 'Adequate documentation', points: 24 },
              { name: 'Poor', description: 'Poor documentation', points: 16 }
            ]
          }
        ],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-05')
      }
    ];
  }

  createNewRubric(): void {
    this.router.navigate(['/teacher/rubrics/create']);
  }

  editRubric(rubric: GradingRubric): void {
    this.router.navigate(['/teacher/rubrics/edit', rubric.id]);
  }

  duplicateRubric(rubric: GradingRubric): void {
    // Create a copy of the rubric
    const newRubric: GradingRubric = {
      ...rubric,
      id: this.generateId(),
      name: `${rubric.name} (Copy)`,
      isTemplate: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.rubrics.update(rubrics => [...rubrics, newRubric]);
  }

  deleteRubric(rubric: GradingRubric): void {
    if (confirm(`Bạn có chắc chắn muốn xóa rubric "${rubric.name}"?`)) {
      this.rubrics.update(rubrics => rubrics.filter(r => r.id !== rubric.id));
    }
  }

  toggleSortOrder(): void {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
  }

  private generateId(): string {
    return 'r' + Math.random().toString(36).substr(2, 9);
  }
}