import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface StudySession {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  lessonId?: string;
  lessonName?: string;
  duration: number; // in minutes
  scheduledDate: Date;
  scheduledTime: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  completedAt?: Date;
  createdAt: Date;
}

interface StudyGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number; // 0-100
  status: 'active' | 'completed' | 'paused';
  sessions: StudySession[];
  createdAt: Date;
}

interface StudyPlan {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  goals: StudyGoal[];
  totalSessions: number;
  completedSessions: number;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
}

@Component({
  selector: 'app-study-planner',
  imports: [CommonModule, FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">📅 Study Planner</h1>
            <p class="text-gray-600">Lập kế hoạch học tập và theo dõi tiến độ</p>
          </div>
          <div class="flex items-center space-x-4">
            <button (click)="createNewPlan()"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              Tạo kế hoạch mới
            </button>
            <button (click)="goToCalendar()"
                    class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
              </svg>
              Xem lịch
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Tổng kế hoạch</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().totalPlans }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Buổi học hôm nay</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().todaySessions }}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Tiến độ trung bình</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().averageProgress }}%</p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Mục tiêu hoàn thành</p>
                <p class="text-2xl font-bold text-gray-900">{{ stats().completedGoals }}</p>
              </div>
              <div class="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Today's Sessions -->
        @if (todaySessions().length > 0) {
          <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 class="text-xl font-bold text-gray-900 mb-6">📚 Buổi học hôm nay</h3>
            <div class="space-y-4">
              @for (session of todaySessions(); track session.id) {
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                        <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 class="font-medium text-gray-900">{{ session.title }}</h4>
                      <p class="text-sm text-gray-600">{{ session.courseName }}</p>
                      <p class="text-sm text-gray-500">{{ session.scheduledTime }} • {{ session.duration }} phút</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span class="px-3 py-1 rounded-full text-sm font-medium"
                          [class]="getPriorityClass(session.priority)">
                      {{ getPriorityText(session.priority) }}
                    </span>
                    @if (session.status === 'scheduled') {
                      <button (click)="startSession(session.id)"
                              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Bắt đầu
                      </button>
                    } @else if (session.status === 'in-progress') {
                      <button (click)="completeSession(session.id)"
                              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        Hoàn thành
                      </button>
                    } @else {
                      <span class="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Đã hoàn thành
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Study Plans -->
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-900">📋 Kế hoạch học tập</h3>
            <div class="flex items-center space-x-4">
              <select [(ngModel)]="selectedFilter" (ngModelChange)="filterPlans()"
                      class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="paused">Tạm dừng</option>
              </select>
            </div>
          </div>

          @if (filteredPlans().length === 0) {
            <div class="text-center py-12">
              <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có kế hoạch học tập</h3>
              <p class="text-gray-600 mb-6">Tạo kế hoạch học tập đầu tiên để bắt đầu hành trình học tập có tổ chức</p>
              <button (click)="createNewPlan()"
                      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Tạo kế hoạch đầu tiên
              </button>
            </div>
          } @else {
            <div class="space-y-6">
              @for (plan of filteredPlans(); track plan.id) {
                <div class="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div class="flex items-center justify-between mb-4">
                    <div>
                      <h4 class="text-lg font-semibold text-gray-900">{{ plan.title }}</h4>
                      <p class="text-gray-600">{{ plan.description }}</p>
                    </div>
                    <div class="flex items-center space-x-3">
                      <span class="px-3 py-1 rounded-full text-sm font-medium"
                            [class]="getStatusClass(plan.status)">
                        {{ getStatusText(plan.status) }}
                      </span>
                      <button (click)="editPlan(plan.id)"
                              class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div class="mb-4">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium text-gray-700">Tiến độ</span>
                      <span class="text-sm text-gray-600">{{ plan.completedSessions }}/{{ plan.totalSessions }} buổi học</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                           [style.width.%]="plan.progress"></div>
                    </div>
                  </div>

                  <!-- Goals -->
                  <div class="space-y-3">
                    @for (goal of plan.goals.slice(0, 3); track goal.id) {
                      <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                          </svg>
                        </div>
                        <div class="flex-1">
                          <h5 class="font-medium text-gray-900">{{ goal.title }}</h5>
                          <p class="text-sm text-gray-600">{{ goal.description }}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-sm font-medium text-gray-900">{{ goal.progress }}%</p>
                          <p class="text-xs text-gray-500">{{ formatDate(goal.targetDate) }}</p>
                        </div>
                      </div>
                    }
                    @if (plan.goals.length > 3) {
                      <button (click)="viewAllGoals(plan.id)"
                              class="w-full text-blue-600 hover:text-blue-800 font-medium text-sm">
                        Xem thêm {{ plan.goals.length - 3 }} mục tiêu khác →
                      </button>
                    }
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                      Tạo ngày: {{ formatDate(plan.createdAt) }}
                    </div>
                    <div class="flex items-center space-x-3">
                      <button (click)="viewPlanDetails(plan.id)"
                              class="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium">
                        Xem chi tiết
                      </button>
                      @if (plan.status === 'active') {
                        <button (click)="pausePlan(plan.id)"
                                class="px-4 py-2 text-yellow-600 hover:text-yellow-800 font-medium">
                          Tạm dừng
                        </button>
                      } @else if (plan.status === 'paused') {
                        <button (click)="resumePlan(plan.id)"
                                class="px-4 py-2 text-green-600 hover:text-green-800 font-medium">
                          Tiếp tục
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudyPlannerComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Mock data
  studyPlans = signal<StudyPlan[]>([
    {
      id: 'plan-1',
      title: 'Chuẩn bị thi chứng chỉ hàng hải',
      description: 'Kế hoạch học tập để chuẩn bị cho kỳ thi chứng chỉ hàng hải quốc tế',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      goals: [
        {
          id: 'goal-1',
          title: 'Hoàn thành khóa học An toàn hàng hải',
          description: 'Học và thi đậu khóa học về an toàn hàng hải',
          targetDate: new Date('2024-03-31'),
          progress: 75,
          status: 'active',
          sessions: [],
          createdAt: new Date('2024-01-01')
        },
        {
          id: 'goal-2',
          title: 'Luyện tập bài thi thực hành',
          description: 'Thực hành các kỹ năng điều khiển tàu',
          targetDate: new Date('2024-05-31'),
          progress: 40,
          status: 'active',
          sessions: [],
          createdAt: new Date('2024-01-01')
        }
      ],
      totalSessions: 50,
      completedSessions: 30,
      progress: 60,
      status: 'active',
      createdAt: new Date('2024-01-01')
    },
    {
      id: 'plan-2',
      title: 'Nâng cao kỹ năng điều hướng',
      description: 'Học các kỹ thuật điều hướng hiện đại và sử dụng thiết bị GPS',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-04-30'),
      goals: [
        {
          id: 'goal-3',
          title: 'Thành thạo sử dụng GPS',
          description: 'Học cách sử dụng hệ thống GPS trong điều hướng',
          targetDate: new Date('2024-03-15'),
          progress: 100,
          status: 'completed',
          sessions: [],
          createdAt: new Date('2024-02-01')
        }
      ],
      totalSessions: 20,
      completedSessions: 20,
      progress: 100,
      status: 'completed',
      createdAt: new Date('2024-02-01')
    }
  ]);

  studySessions = signal<StudySession[]>([
    {
      id: 'session-1',
      title: 'Học về quy tắc COLREG',
      courseId: 'course-1',
      courseName: 'An toàn hàng hải',
      lessonId: 'lesson-1',
      lessonName: 'Quy tắc COLREG',
      duration: 90,
      scheduledDate: new Date(),
      scheduledTime: '09:00',
      status: 'scheduled',
      priority: 'high',
      notes: 'Chuẩn bị cho bài thi tuần tới',
      createdAt: new Date()
    },
    {
      id: 'session-2',
      title: 'Thực hành điều hướng GPS',
      courseId: 'course-2',
      courseName: 'Điều hướng hiện đại',
      lessonId: 'lesson-2',
      lessonName: 'Sử dụng GPS',
      duration: 120,
      scheduledDate: new Date(),
      scheduledTime: '14:00',
      status: 'in-progress',
      priority: 'medium',
      createdAt: new Date()
    },
    {
      id: 'session-3',
      title: 'Ôn tập luật hàng hải',
      courseId: 'course-3',
      courseName: 'Luật hàng hải',
      lessonId: 'lesson-3',
      lessonName: 'Luật cơ bản',
      duration: 60,
      scheduledDate: new Date(),
      scheduledTime: '19:00',
      status: 'completed',
      priority: 'low',
      completedAt: new Date(),
      createdAt: new Date()
    }
  ]);

  selectedFilter = signal<string>('all');

  // Computed properties
  stats = computed(() => {
    const plans = this.studyPlans();
    const sessions = this.studySessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      totalPlans: plans.length,
      todaySessions: sessions.filter(s => {
        const sessionDate = new Date(s.scheduledDate);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      }).length,
      averageProgress: plans.length > 0 ? Math.round(plans.reduce((sum, plan) => sum + plan.progress, 0) / plans.length) : 0,
      completedGoals: plans.reduce((sum, plan) => sum + plan.goals.filter(g => g.status === 'completed').length, 0)
    };
  });

  todaySessions = computed(() => {
    const sessions = this.studySessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sessions.filter(s => {
      const sessionDate = new Date(s.scheduledDate);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    }).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  });

  filteredPlans = computed(() => {
    const filter = this.selectedFilter();
    const plans = this.studyPlans();

    if (filter === 'all') return plans;
    return plans.filter(plan => plan.status === filter);
  });

  ngOnInit(): void {
    // Initialize component
  }

  createNewPlan(): void {
    // Navigate to create plan page or open modal
    console.log('Create new plan');
  }

  goToCalendar(): void {
    this.router.navigate(['/learning/calendar']);
  }

  startSession(sessionId: string): void {
    const sessions = this.studySessions();
    const updatedSessions = sessions.map(s => 
      s.id === sessionId ? { ...s, status: 'in-progress' as const } : s
    );
    this.studySessions.set(updatedSessions);
  }

  completeSession(sessionId: string): void {
    const sessions = this.studySessions();
    const updatedSessions = sessions.map(s => 
      s.id === sessionId ? { ...s, status: 'completed' as const, completedAt: new Date() } : s
    );
    this.studySessions.set(updatedSessions);
  }

  editPlan(planId: string): void {
    console.log('Edit plan:', planId);
  }

  viewAllGoals(planId: string): void {
    console.log('View all goals for plan:', planId);
  }

  viewPlanDetails(planId: string): void {
    console.log('View plan details:', planId);
  }

  pausePlan(planId: string): void {
    const plans = this.studyPlans();
    const updatedPlans = plans.map(p => 
      p.id === planId ? { ...p, status: 'paused' as const } : p
    );
    this.studyPlans.set(updatedPlans);
  }

  resumePlan(planId: string): void {
    const plans = this.studyPlans();
    const updatedPlans = plans.map(p => 
      p.id === planId ? { ...p, status: 'active' as const } : p
    );
    this.studyPlans.set(updatedPlans);
  }

  filterPlans(): void {
    // Filter is handled by computed property
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return 'Không xác định';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Đang hoạt động';
      case 'completed': return 'Đã hoàn thành';
      case 'paused': return 'Tạm dừng';
      default: return 'Không xác định';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }
}
