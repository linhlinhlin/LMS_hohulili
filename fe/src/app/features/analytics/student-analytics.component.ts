import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../api/client/api-client';
import { STUDENT_ENDPOINTS } from '../../api/endpoints/student.endpoints';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

interface StudentAnalyticsData {
  totalStudyTimeHours: number;
  coursesCompleted: number;
  averageScore: number;
  learningStreakDays: number;
  activeCourses: number;
  totalQuizAttempts: number;
  totalAssignmentsSubmitted: number;
  certificatesEarned: number;
  averageCompletionPercent: number;
  performanceTrend: PerformanceTrendItem[];
}

interface PerformanceTrendItem {
  date: string;
  score: number;
  type: string;
  label: string;
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
  templateUrl: './student-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAnalyticsComponent implements OnInit {
  private apiClient = inject(ApiClient);
  private errorService = inject(ErrorHandlingService);

  isLoading = signal<boolean>(true);
  selectedPeriod = signal(30);

  analytics = signal<StudentAnalyticsData>({
    totalStudyTimeHours: 0,
    coursesCompleted: 0,
    averageScore: 0,
    learningStreakDays: 0,
    activeCourses: 0,
    totalQuizAttempts: 0,
    totalAssignmentsSubmitted: 0,
    certificatesEarned: 0,
    averageCompletionPercent: 0,
    performanceTrend: []
  });

  learningGoals = signal<LearningGoal[]>([
    {
      id: 'goal-1',
      title: 'Hoàn thành chứng chỉ STCW',
      description: 'Đạt được chứng chỉ an toàn hàng hải quốc tế',
      targetDate: new Date('2026-12-31'),
      progress: 60,
      category: 'certification',
      milestones: [
        { id: 'm1', title: 'Hoàn thành khóa An toàn', completed: true, completedAt: new Date('2026-01-15') },
        { id: 'm2', title: 'Thi đậu bài kiểm tra', completed: true, completedAt: new Date('2026-02-01') },
        { id: 'm3', title: 'Thực hành tại cảng', completed: false },
        { id: 'm4', title: 'Nộp hồ sơ chứng chỉ', completed: false }
      ]
    }
  ]);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  private async loadAnalytics(): Promise<void> {
    try {
      this.isLoading.set(true);
      const response = await firstValueFrom(
        this.apiClient.get<any>(STUDENT_ENDPOINTS.ANALYTICS)
      );
      const data = response.data || response;
      this.analytics.set({
        totalStudyTimeHours: data.totalStudyTimeHours ?? 0,
        coursesCompleted: data.coursesCompleted ?? 0,
        averageScore: data.averageScore ?? 0,
        learningStreakDays: data.learningStreakDays ?? 0,
        activeCourses: data.activeCourses ?? 0,
        totalQuizAttempts: data.totalQuizAttempts ?? 0,
        totalAssignmentsSubmitted: data.totalAssignmentsSubmitted ?? 0,
        certificatesEarned: data.certificatesEarned ?? 0,
        averageCompletionPercent: data.averageCompletionPercent ?? 0,
        performanceTrend: data.performanceTrend ?? []
      });
    } catch (error) {
      this.errorService.handleApiError(error, 'analytics');
    } finally {
      this.isLoading.set(false);
    }
  }

  updateAnalytics(): void {
    this.loadAnalytics();
  }

  exportReport(): void {
    const reportData = {
      analytics: this.analytics(),
      goals: this.learningGoals(),
      period: this.selectedPeriod(),
      generatedAt: new Date()
    };

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
