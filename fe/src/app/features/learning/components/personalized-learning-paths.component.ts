import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LearningPathService } from '../../../core/services/learning-path.service';
import { LearningPath, LearningGoal, AdaptiveLearningRecommendation } from '../../../shared/types/learning-path.types';

@Component({
  selector: 'app-personalized-learning-paths',
  standalone: true,
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Learning Paths</h1>
              <p class="text-gray-600">Lộ trình học tập được cá nhân hóa cho bạn</p>
            </div>
            <div class="flex items-center space-x-4">
              <button (click)="goBack()"
                      class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <svg class="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Learning Goals Overview -->
        <div class="mb-8">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Mục tiêu học tập của bạn</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (goal of activeGoals(); track goal.id) {
              <div class="bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900">{{ goal.title }}</h3>
                      <p class="text-sm text-gray-600">{{ goal.type }}</p>
                    </div>
                  </div>
                  <span class="text-sm text-gray-500">{{ goal.targetDate | date:'dd/MM/yyyy' }}</span>
                </div>
                <p class="text-gray-600 text-sm mb-4">{{ goal.description }}</p>
                <div class="mb-4">
                  <div class="flex justify-between text-sm mb-2">
                    <span>Tiến độ</span>
                    <span>{{ goal.progress }}%</span>
                  </div>
                  <div class="bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-500 rounded-full h-2 transition-all duration-300" 
                         [style.width.%]="goal.progress"></div>
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">{{ goal.milestones.length }} mốc quan trọng</span>
                  <button (click)="viewGoalDetail(goal.id)"
                          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Xem chi tiết
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- AI Recommendations -->
        @if (highPriorityRecommendations().length > 0) {
          <div class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Gợi ý từ AI</h2>
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white mb-6">
              <div class="flex items-center mb-4">
                <svg class="w-8 h-8 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
                <div>
                  <h3 class="text-lg font-semibold">Gợi ý thông minh</h3>
                  <p class="text-purple-100">Dựa trên tiến độ và sở thích học tập của bạn</p>
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              @for (recommendation of highPriorityRecommendations(); track recommendation.id) {
                <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                      <h3 class="font-semibold text-gray-900 mb-2">{{ recommendation.title }}</h3>
                      <p class="text-gray-600 text-sm mb-3">{{ recommendation.description }}</p>
                      <div class="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{{ recommendation.estimatedTime }} phút</span>
                        <span>Độ khó: {{ recommendation.difficulty }}/5</span>
                        <span>{{ recommendation.confidence * 100 }}% phù hợp</span>
                      </div>
                    </div>
                    <div class="flex flex-col space-y-2">
                      <button (click)="acceptRecommendation(recommendation.id)"
                              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                        Chấp nhận
                      </button>
                      <button (click)="rejectRecommendation(recommendation.id)"
                              class="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                        Bỏ qua
                      </button>
                    </div>
                  </div>
                  <div class="bg-purple-50 rounded-lg p-3">
                    <p class="text-sm text-purple-800">
                      <strong>Lý do:</strong> {{ recommendation.reason }}
                    </p>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Learning Paths -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">Lộ trình học tập</h2>
            <div class="flex space-x-2">
              <button (click)="setActiveTab('recommended')"
                      [class]="activeTab() === 'recommended' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'"
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Được gợi ý
              </button>
              <button (click)="setActiveTab('in-progress')"
                      [class]="activeTab() === 'in-progress' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'"
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Đang học
              </button>
              <button (click)="setActiveTab('completed')"
                      [class]="activeTab() === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'"
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Đã hoàn thành
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            @for (path of filteredPaths(); track path.id) {
              <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="p-6">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ path.title }}</h3>
                      <p class="text-gray-600 text-sm mb-3">{{ path.description }}</p>
                      <div class="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{{ path.duration }} tuần</span>
                        <span>{{ path.estimatedTime }} giờ</span>
                        <span>Độ khó: {{ path.difficulty }}/5</span>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-bold text-blue-600">{{ path.progress }}%</div>
                      <div class="text-sm text-gray-600">Hoàn thành</div>
                    </div>
                  </div>
                  
                  <!-- Progress Bar -->
                  <div class="mb-4">
                    <div class="bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-500 rounded-full h-2 transition-all duration-300" 
                           [style.width.%]="path.progress"></div>
                    </div>
                  </div>
                  
                  <!-- Skills -->
                  <div class="mb-4">
                    <h4 class="text-sm font-medium text-gray-900 mb-2">Kỹ năng sẽ học được:</h4>
                    <div class="flex flex-wrap gap-2">
                      @for (skill of path.skills; track skill) {
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {{ skill }}
                        </span>
                      }
                    </div>
                  </div>
                  
                  <!-- Actions -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      @if (path.isRecommended) {
                        <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          Được gợi ý
                        </span>
                      }
                      @if (path.isCompleted) {
                        <span class="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          Hoàn thành
                        </span>
                      }
                    </div>
                    <button (click)="startLearningPath(path.id)"
                            [disabled]="path.isCompleted"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
                      {{ path.isCompleted ? 'Đã hoàn thành' : 'Bắt đầu học' }}
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class PersonalizedLearningPathsComponent implements OnInit {
  private learningPathService = inject(LearningPathService);
  private router = inject(Router);

  // Signals
  activeTab = signal<string>('recommended');
  
  // Computed values
  recommendedPaths = computed(() => this.learningPathService.recommendedPaths());
  inProgressPaths = computed(() => this.learningPathService.inProgressPaths());
  completedPaths = computed(() => this.learningPathService.completedPaths());
  activeGoals = computed(() => this.learningPathService.activeGoals());
  highPriorityRecommendations = computed(() => this.learningPathService.highPriorityRecommendations());

  filteredPaths = computed(() => {
    const tab = this.activeTab();
    switch (tab) {
      case 'recommended':
        return this.recommendedPaths();
      case 'in-progress':
        return this.inProgressPaths();
      case 'completed':
        return this.completedPaths();
      default:
        return [];
    }
  });

  ngOnInit(): void {
    // Initialize component
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  startLearningPath(pathId: string): void {
    this.router.navigate(['/learning-path', pathId]);
  }

  viewGoalDetail(goalId: string): void {
    this.router.navigate(['/learning-goal', goalId]);
  }

  acceptRecommendation(recommendationId: string): void {
    this.learningPathService.acceptRecommendation(recommendationId);
  }

  rejectRecommendation(recommendationId: string): void {
    this.learningPathService.rejectRecommendation(recommendationId);
  }

  goBack(): void {
    this.router.navigate(['/student']);
  }
}