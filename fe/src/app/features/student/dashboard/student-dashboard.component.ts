import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { ProgressBarComponent } from '../../../shared/components/ui/progress-bar/progress-bar.component';
import { TabsComponent } from '../../../shared/components/ui/tabs/tabs.component';

interface Lesson {
  id: string;
  title: string;
  completed: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface NextItem {
  title: string;
  type: string;
  duration: string;
}

interface Course {
  id: string;
  title: string;
  instructor: string;
  partner: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  status: 'in-progress' | 'completed';
  estimatedCompletion: string;
  showModules: boolean;
  nextItem: NextItem;
  modules: Module[];
}

/**
 * Student Dashboard - LMS Style with Course Cards
 * 
 * Dashboard with:
 * - Greeting + Career goal
 * - Course cards with tabs (In Progress / Completed)
 * - Sidebar widgets (Goals, Learning Plan, Statistics)
 */
@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IconComponent,
    ButtonComponent,
    CardComponent,
    ProgressBarComponent,
    TabsComponent
  ],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss'
})
export class StudentDashboardComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // State
  careerGoal = signal<string>('Chuyên gia Hàng hải');
  todayGoalProgress = signal<number>(1);
  learningStreak = signal<number>(3);
  completedGoals = signal<number>(12);
  inProgressCount = signal<number>(3);
  totalStudyTime = signal<number>(24);
  activeTab = signal<'in-progress' | 'completed'>('in-progress');

  // Mock courses data with modules
  courses = signal<Course[]>([
    {
      id: '1',
      title: 'Cơ bản về Hàng hải',
      instructor: 'Nguyễn Văn A',
      partner: 'LMS Maritime',
      progress: 75,
      completedLessons: 9,
      totalLessons: 12,
      status: 'in-progress' as const,
      estimatedCompletion: 'Nov 25, 2025',
      showModules: false,
      nextItem: {
        title: 'Giới thiệu về an toàn hàng hải',
        type: 'Video',
        duration: '15 minutes'
      },
      modules: [
        {
          id: 'm1',
          title: 'Chương 1: Giới thiệu',
          lessons: [
            { id: 'l1', title: 'Tổng quan về hàng hải', completed: true },
            { id: 'l2', title: 'Lịch sử phát triển', completed: true },
            { id: 'l3', title: 'Vai trò trong kinh tế', completed: false }
          ]
        },
        {
          id: 'm2',
          title: 'Chương 2: An toàn hàng hải',
          lessons: [
            { id: 'l4', title: 'Quy định an toàn', completed: false },
            { id: 'l5', title: 'Thiết bị bảo hộ', completed: false }
          ]
        }
      ]
    },
    {
      id: '2',
      title: 'An toàn hàng hải',
      instructor: 'Trần Thị B',
      partner: 'LMS Maritime',
      progress: 45,
      completedLessons: 5,
      totalLessons: 11,
      status: 'in-progress' as const,
      estimatedCompletion: 'Dec 10, 2025',
      showModules: false,
      nextItem: {
        title: 'Bài kiểm tra giữa kỳ',
        type: 'Quiz',
        duration: '30 minutes'
      },
      modules: [
        {
          id: 'm1',
          title: 'Chương 1: Cơ bản',
          lessons: [
            { id: 'l1', title: 'Khái niệm an toàn', completed: true },
            { id: 'l2', title: 'Quy trình kiểm tra', completed: true }
          ]
        }
      ]
    },
    {
      id: '3',
      title: 'Kỹ thuật điều khiển tàu',
      instructor: 'Lê Văn C',
      partner: 'LMS Maritime',
      progress: 100,
      completedLessons: 15,
      totalLessons: 15,
      status: 'completed' as const,
      estimatedCompletion: 'Completed',
      showModules: false,
      nextItem: {
        title: 'Khóa học đã hoàn thành',
        type: 'Certificate',
        duration: ''
      },
      modules: []
    }
  ]);

  // Computed - Get 2 recent in-progress + 2 recent completed
  recentInProgress = computed(() => 
    this.courses()
      .filter(c => c.status === 'in-progress')
      .slice(0, 2)
  );

  recentCompleted = computed(() =>
    this.courses()
      .filter(c => c.status === 'completed')
      .slice(0, 2)
  );

  averageProgress = computed(() => {
    const courses = this.courses().filter(c => c.status === 'in-progress');
    if (courses.length === 0) return 0;
    return Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length);
  });

  // Learning heatmap (12 months / 52 weeks) - GitHub style with maritime blue
  learningHeatmap = this.generateYearHeatmap();

  private generateYearHeatmap() {
    const weeks = [];
    const today = new Date();
    
    // Generate 52 weeks of data
    for (let weekIndex = 0; weekIndex < 52; weekIndex++) {
      const days = [];
      
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const daysAgo = (51 - weekIndex) * 7 + (6 - dayIndex);
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        
        // Random activity level (0-3) for demo
        const level = Math.random() > 0.7 ? Math.floor(Math.random() * 4) : 0;
        const count = level * 2;
        
        days.push({
          date: date.toISOString().split('T')[0],
          level,
          count
        });
      }
      
      weeks.push({ week: weekIndex + 1, days });
    }
    
    return weeks;
  }

  // Old 4-week data for reference
  learningHeatmapOld = [
    { week: 1, days: [
      { date: '2024-10-14', level: 2, count: 3 },
      { date: '2024-10-15', level: 3, count: 5 },
      { date: '2024-10-16', level: 1, count: 1 },
      { date: '2024-10-17', level: 2, count: 3 },
      { date: '2024-10-18', level: 0, count: 0 },
      { date: '2024-10-19', level: 1, count: 2 },
      { date: '2024-10-20', level: 2, count: 4 }
    ]},
    { week: 2, days: [
      { date: '2024-10-21', level: 3, count: 6 },
      { date: '2024-10-22', level: 2, count: 3 },
      { date: '2024-10-23', level: 2, count: 3 },
      { date: '2024-10-24', level: 1, count: 1 },
      { date: '2024-10-25', level: 3, count: 5 },
      { date: '2024-10-26', level: 0, count: 0 },
      { date: '2024-10-27', level: 1, count: 2 }
    ]},
    { week: 3, days: [
      { date: '2024-10-28', level: 2, count: 4 },
      { date: '2024-10-29', level: 3, count: 5 },
      { date: '2024-10-30', level: 2, count: 3 },
      { date: '2024-10-31', level: 2, count: 3 },
      { date: '2024-11-01', level: 1, count: 1 },
      { date: '2024-11-02', level: 0, count: 0 },
      { date: '2024-11-03', level: 2, count: 3 }
    ]},
    { week: 4, days: [
      { date: '2024-11-04', level: 3, count: 6 },
      { date: '2024-11-05', level: 2, count: 4 },
      { date: '2024-11-06', level: 2, count: 3 },
      { date: '2024-11-07', level: 1, count: 2 },
      { date: '2024-11-08', level: 3, count: 5 },
      { date: '2024-11-09', level: 2, count: 3 },
      { date: '2024-11-10', level: 0, count: 0 }
    ]}
  ];

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  getUserFirstName(): string {
    const fullName = this.authService.currentUser()?.name || 'Bạn';
    return fullName.split(' ').pop() || fullName;
  }

  continueCourse(courseId: string): void {
    this.router.navigate(['/student/learn/course', courseId]);
  }

  editGoal(): void {
    console.log('Edit goal clicked');
  }

  setLearningPlan(): void {
    console.log('Set learning plan clicked');
  }

  toggleModules(courseId: string): void {
    this.courses.update(courses =>
      courses.map(c =>
        c.id === courseId ? { ...c, showModules: !c.showModules } : c
      )
    );
  }

  switchTab(tab: 'in-progress' | 'completed'): void {
    this.activeTab.set(tab);
  }
}
