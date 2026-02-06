import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

interface LearningAnalytics {
  totalStudyTime: number; // in hours
  coursesCompleted: number;
  averageScore: number;
  learningStreak: number; // days
  weakAreas: string[];
  strongAreas: string[];
  recommendedCourses: string[];
  studyPatterns: StudyPattern[];
  performanceTrend: PerformanceData[];
  skillDevelopment: SkillProgress[];
}

interface StudyPattern {
  dayOfWeek: string;
  averageHours: number;
  peakHours: string[];
  preferredSubjects: string[];
}

interface PerformanceData {
  date: string;
  score: number;
  timeSpent: number;
  course: string;
}

interface SkillProgress {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  progress: number;
  lastUpdated: Date;
}

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number;
  category: string;
  milestones: Milestone[];
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
}

@Component({
  selector: 'app-student-analytics',
  imports: [RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './student-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAnalyticsComponent implements OnInit {
  private router = inject(Router);
  private errorService = inject(ErrorHandlingService);

  // Loading state
  isLoading = signal<boolean>(true);
  selectedPeriod = signal(30);

  // Mock analytics data
  analytics = signal<LearningAnalytics>({
    totalStudyTime: 45.5,
    coursesCompleted: 3,
    averageScore: 8.7,
    learningStreak: 12,
    weakAreas: [
      'Luật Hàng hải Quốc tế',
      'Quản lý Rủi ro',
      'Kỹ thuật Điện tử Tàu'
    ],
    strongAreas: [
      'An toàn Hàng hải',
      'Điều khiển Tàu',
      'Kỹ thuật Cơ khí Tàu'
    ],
    recommendedCourses: [
      'Luật Hàng hải Quốc tế Nâng cao',
      'Quản lý Rủi ro Hàng hải',
      'Kỹ thuật Điện tử Tàu Cơ bản'
    ],
    studyPatterns: [
      {
        dayOfWeek: 'Thứ 2',
        averageHours: 2.5,
        peakHours: ['19:00-21:00'],
        preferredSubjects: ['An toàn', 'Kỹ thuật']
      },
      {
        dayOfWeek: 'Thứ 3',
        averageHours: 3.2,
        peakHours: ['20:00-22:00'],
        preferredSubjects: ['Điều khiển', 'Luật']
      },
      {
        dayOfWeek: 'Thứ 4',
        averageHours: 1.8,
        peakHours: ['18:00-20:00'],
        preferredSubjects: ['Kỹ thuật']
      },
      {
        dayOfWeek: 'Thứ 5',
        averageHours: 2.9,
        peakHours: ['19:00-21:00'],
        preferredSubjects: ['An toàn', 'Quản lý']
      },
      {
        dayOfWeek: 'Thứ 6',
        averageHours: 4.1,
        peakHours: ['19:00-23:00'],
        preferredSubjects: ['Tất cả']
      },
      {
        dayOfWeek: 'Thứ 7',
        averageHours: 3.5,
        peakHours: ['14:00-18:00'],
        preferredSubjects: ['Kỹ thuật', 'Điều khiển']
      },
      {
        dayOfWeek: 'Chủ nhật',
        averageHours: 2.1,
        peakHours: ['10:00-12:00'],
        preferredSubjects: ['Luật', 'Quản lý']
      }
    ],
    performanceTrend: [
      { date: '2024-09-01', score: 8.2, timeSpent: 2.5, course: 'An toàn Hàng hải' },
      { date: '2024-09-05', score: 8.5, timeSpent: 3.0, course: 'Kỹ thuật Tàu biển' },
      { date: '2024-09-10', score: 8.8, timeSpent: 2.8, course: 'Điều khiển Tàu' },
      { date: '2024-09-15', score: 8.9, timeSpent: 3.2, course: 'Quản lý Cảng' },
      { date: '2024-09-20', score: 8.7, timeSpent: 2.9, course: 'Luật Hàng hải' }
    ],
    skillDevelopment: [
      {
        skill: 'An toàn Hàng hải',
        currentLevel: 8,
        targetLevel: 10,
        progress: 80,
        lastUpdated: new Date('2024-09-20')
      },
      {
        skill: 'Kỹ thuật Tàu biển',
        currentLevel: 7,
        targetLevel: 9,
        progress: 78,
        lastUpdated: new Date('2024-09-18')
      },
      {
        skill: 'Điều khiển Tàu',
        currentLevel: 6,
        targetLevel: 8,
        progress: 75,
        lastUpdated: new Date('2024-09-15')
      },
      {
        skill: 'Luật Hàng hải',
        currentLevel: 5,
        targetLevel: 8,
        progress: 63,
        lastUpdated: new Date('2024-09-12')
      }
    ]
  });

  learningGoals = signal<LearningGoal[]>([
    {
      id: 'goal-1',
      title: 'Hoàn thành chứng chỉ STCW',
      description: 'Đạt được chứng chỉ an toàn hàng hải quốc tế',
      targetDate: new Date('2024-12-31'),
      progress: 60,
      category: 'certification',
      milestones: [
        { id: 'm1', title: 'Hoàn thành khóa An toàn', completed: true, completedAt: new Date('2024-08-15') },
        { id: 'm2', title: 'Thi đậu bài kiểm tra', completed: true, completedAt: new Date('2024-09-01') },
        { id: 'm3', title: 'Thực hành tại cảng', completed: false },
        { id: 'm4', title: 'Nộp hồ sơ chứng chỉ', completed: false }
      ]
    },
    {
      id: 'goal-2',
      title: 'Học 100 giờ trong năm',
      description: 'Mục tiêu học tập hàng năm',
      targetDate: new Date('2024-12-31'),
      progress: 45,
      category: 'study',
      milestones: [
        { id: 'm1', title: 'Học 25 giờ quý 1', completed: true, completedAt: new Date('2024-03-31') },
        { id: 'm2', title: 'Học 25 giờ quý 2', completed: true, completedAt: new Date('2024-06-30') },
        { id: 'm3', title: 'Học 25 giờ quý 3', completed: false },
        { id: 'm4', title: 'Học 25 giờ quý 4', completed: false }
      ]
    }
  ]);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  private async loadAnalytics(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Simulate loading analytics data
      await this.simulateAnalyticsLoading();
      
      this.errorService.showSuccess('Phân tích học tập đã được tải thành công!', 'analytics');
      
    } catch (error) {
      this.errorService.handleApiError(error, 'analytics');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulateAnalyticsLoading(): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  updateAnalytics(): void {
    // Update analytics based on selected period
    this.errorService.showInfo(`Đang cập nhật phân tích cho ${this.selectedPeriod()} ngày qua`, 'analytics');
    // In real implementation, this would fetch new data based on selected period
  }

  exportReport(): void {
    // Export analytics report
    // Simulate report generation
    const reportData = {
      analytics: this.analytics(),
      goals: this.learningGoals(),
      period: this.selectedPeriod(),
      generatedAt: new Date()
    };
    
    // Create and download report
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `learning-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    this.errorService.showSuccess('Báo cáo đã được tải xuống thành công!', 'export');
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }

  getCompletedMilestones(milestones: Milestone[]): number {
    return milestones.filter(m => m.completed).length;
  }
}

