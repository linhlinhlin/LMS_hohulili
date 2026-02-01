import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
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
      'Luáº­t HĂ ng háº£i Quá»‘c táº¿',
      'Quáº£n lĂ½ Rá»§i ro',
      'Ká»¹ thuáº­t Äiá»‡n tá»­ TĂ u'
    ],
    strongAreas: [
      'An toĂ n HĂ ng háº£i',
      'Äiá»u khiá»ƒn TĂ u',
      'Ká»¹ thuáº­t CÆ¡ khĂ­ TĂ u'
    ],
    recommendedCourses: [
      'Luáº­t HĂ ng háº£i Quá»‘c táº¿ NĂ¢ng cao',
      'Quáº£n lĂ½ Rá»§i ro HĂ ng háº£i',
      'Ká»¹ thuáº­t Äiá»‡n tá»­ TĂ u CÆ¡ báº£n'
    ],
    studyPatterns: [
      {
        dayOfWeek: 'Thá»© 2',
        averageHours: 2.5,
        peakHours: ['19:00-21:00'],
        preferredSubjects: ['An toĂ n', 'Ká»¹ thuáº­t']
      },
      {
        dayOfWeek: 'Thá»© 3',
        averageHours: 3.2,
        peakHours: ['20:00-22:00'],
        preferredSubjects: ['Äiá»u khiá»ƒn', 'Luáº­t']
      },
      {
        dayOfWeek: 'Thá»© 4',
        averageHours: 1.8,
        peakHours: ['18:00-20:00'],
        preferredSubjects: ['Ká»¹ thuáº­t']
      },
      {
        dayOfWeek: 'Thá»© 5',
        averageHours: 2.9,
        peakHours: ['19:00-21:00'],
        preferredSubjects: ['An toĂ n', 'Quáº£n lĂ½']
      },
      {
        dayOfWeek: 'Thá»© 6',
        averageHours: 4.1,
        peakHours: ['19:00-23:00'],
        preferredSubjects: ['Táº¥t cáº£']
      },
      {
        dayOfWeek: 'Thá»© 7',
        averageHours: 3.5,
        peakHours: ['14:00-18:00'],
        preferredSubjects: ['Ká»¹ thuáº­t', 'Äiá»u khiá»ƒn']
      },
      {
        dayOfWeek: 'Chá»§ nháº­t',
        averageHours: 2.1,
        peakHours: ['10:00-12:00'],
        preferredSubjects: ['Luáº­t', 'Quáº£n lĂ½']
      }
    ],
    performanceTrend: [
      { date: '2024-09-01', score: 8.2, timeSpent: 2.5, course: 'An toĂ n HĂ ng háº£i' },
      { date: '2024-09-05', score: 8.5, timeSpent: 3.0, course: 'Ká»¹ thuáº­t TĂ u biá»ƒn' },
      { date: '2024-09-10', score: 8.8, timeSpent: 2.8, course: 'Äiá»u khiá»ƒn TĂ u' },
      { date: '2024-09-15', score: 8.9, timeSpent: 3.2, course: 'Quáº£n lĂ½ Cáº£ng' },
      { date: '2024-09-20', score: 8.7, timeSpent: 2.9, course: 'Luáº­t HĂ ng háº£i' }
    ],
    skillDevelopment: [
      {
        skill: 'An toĂ n HĂ ng háº£i',
        currentLevel: 8,
        targetLevel: 10,
        progress: 80,
        lastUpdated: new Date('2024-09-20')
      },
      {
        skill: 'Ká»¹ thuáº­t TĂ u biá»ƒn',
        currentLevel: 7,
        targetLevel: 9,
        progress: 78,
        lastUpdated: new Date('2024-09-18')
      },
      {
        skill: 'Äiá»u khiá»ƒn TĂ u',
        currentLevel: 6,
        targetLevel: 8,
        progress: 75,
        lastUpdated: new Date('2024-09-15')
      },
      {
        skill: 'Luáº­t HĂ ng háº£i',
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
      title: 'HoĂ n thĂ nh chá»©ng chá»‰ STCW',
      description: 'Äáº¡t Ä‘Æ°á»£c chá»©ng chá»‰ an toĂ n hĂ ng háº£i quá»‘c táº¿',
      targetDate: new Date('2024-12-31'),
      progress: 60,
      category: 'certification',
      milestones: [
        { id: 'm1', title: 'HoĂ n thĂ nh khĂ³a An toĂ n', completed: true, completedAt: new Date('2024-08-15') },
        { id: 'm2', title: 'Thi Ä‘áº­u bĂ i kiá»ƒm tra', completed: true, completedAt: new Date('2024-09-01') },
        { id: 'm3', title: 'Thá»±c hĂ nh táº¡i cáº£ng', completed: false },
        { id: 'm4', title: 'Ná»™p há»“ sÆ¡ chá»©ng chá»‰', completed: false }
      ]
    },
    {
      id: 'goal-2',
      title: 'Há»c 100 giá» trong nÄƒm',
      description: 'Má»¥c tiĂªu há»c táº­p hĂ ng nÄƒm',
      targetDate: new Date('2024-12-31'),
      progress: 45,
      category: 'study',
      milestones: [
        { id: 'm1', title: 'Há»c 25 giá» quĂ½ 1', completed: true, completedAt: new Date('2024-03-31') },
        { id: 'm2', title: 'Há»c 25 giá» quĂ½ 2', completed: true, completedAt: new Date('2024-06-30') },
        { id: 'm3', title: 'Há»c 25 giá» quĂ½ 3', completed: false },
        { id: 'm4', title: 'Há»c 25 giá» quĂ½ 4', completed: false }
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
      
      console.log('đŸ”§ Student Analytics - Component initialized');
      console.log('đŸ”§ Student Analytics - Analytics data loaded:', this.analytics());
      console.log('đŸ”§ Student Analytics - Learning goals:', this.learningGoals().length);
      
      this.errorService.showSuccess('PhĂ¢n tĂ­ch há»c táº­p Ä‘Ă£ Ä‘Æ°á»£c táº£i thĂ nh cĂ´ng!', 'analytics');
      
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
    console.log('đŸ”§ Student Analytics - Updating analytics for period:', this.selectedPeriod());
    this.errorService.showInfo(`Äang cáº­p nháº­t phĂ¢n tĂ­ch cho ${this.selectedPeriod()} ngĂ y qua`, 'analytics');
    // In real implementation, this would fetch new data based on selected period
  }

  exportReport(): void {
    // Export analytics report
    console.log('đŸ”§ Student Analytics - Exporting analytics report');
    
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
    
    this.errorService.showSuccess('BĂ¡o cĂ¡o Ä‘Ă£ Ä‘Æ°á»£c táº£i xuá»‘ng thĂ nh cĂ´ng!', 'export');
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }

  getCompletedMilestones(milestones: Milestone[]): number {
    return milestones.filter(m => m.completed).length;
  }
}

