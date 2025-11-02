import { Injectable, signal, computed } from '@angular/core';

export interface LearningProgress {
  userId: string;
  courseId: string;
  courseName: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  timeSpent: number; // in minutes
  lastAccessed: Date;
  averageScore: number;
  completionDate?: Date;
}

export interface QuizPerformance {
  userId: string;
  quizId: string;
  quizName: string;
  attempts: number;
  bestScore: number;
  averageScore: number;
  timeSpent: number; // in minutes
  lastAttempt: Date;
  improvement: number; // percentage improvement
}

export interface UserEngagement {
  userId: string;
  totalLoginDays: number;
  totalSessionTime: number; // in minutes
  averageSessionDuration: number; // in minutes
  mostActiveDay: string;
  mostActiveHour: number;
  coursesEnrolled: number;
  coursesCompleted: number;
  assignmentsSubmitted: number;
  quizzesCompleted: number;
  lastActivity: Date;
}

export interface CourseAnalytics {
  courseId: string;
  courseName: string;
  totalEnrollments: number;
  completionRate: number;
  averageScore: number;
  averageTimeToComplete: number; // in days
  dropOutRate: number;
  mostDifficultLesson: string;
  mostEngagingLesson: string;
  studentSatisfaction: number; // 1-5 scale
  instructorRating: number; // 1-5 scale
}

export interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  totalLessons: number;
  totalQuizzes: number;
  totalAssignments: number;
  systemUptime: number; // percentage
  averageResponseTime: number; // in milliseconds
  errorRate: number; // percentage
  storageUsed: number; // in GB
  bandwidthUsed: number; // in GB
}

export interface LearningPath {
  userId: string;
  recommendedCourses: string[];
  skillGaps: string[];
  nextSteps: string[];
  estimatedCompletionTime: number; // in days
  confidenceScore: number; // 0-1
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private _learningProgress = signal<LearningProgress[]>([]);
  private _quizPerformance = signal<QuizPerformance[]>([]);
  private _userEngagement = signal<UserEngagement[]>([]);
  private _courseAnalytics = signal<CourseAnalytics[]>([]);
  private _systemMetrics = signal<SystemMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    totalLessons: 0,
    totalQuizzes: 0,
    totalAssignments: 0,
    systemUptime: 0,
    averageResponseTime: 0,
    errorRate: 0,
    storageUsed: 0,
    bandwidthUsed: 0
  });
  private _learningPaths = signal<LearningPath[]>([]);

  // Readonly signals
  readonly learningProgress = this._learningProgress.asReadonly();
  readonly quizPerformance = this._quizPerformance.asReadonly();
  readonly userEngagement = this._userEngagement.asReadonly();
  readonly courseAnalytics = this._courseAnalytics.asReadonly();
  readonly systemMetrics = this._systemMetrics.asReadonly();
  readonly learningPaths = this._learningPaths.asReadonly();

  // Computed signals
  readonly totalProgress = computed(() => 
    this._learningProgress().reduce((sum, progress) => sum + progress.progressPercentage, 0) / this._learningProgress().length
  );
  readonly averageQuizScore = computed(() => 
    this._quizPerformance().reduce((sum, quiz) => sum + quiz.averageScore, 0) / this._quizPerformance().length
  );
  readonly totalEngagement = computed(() => 
    this._userEngagement().reduce((sum, user) => sum + user.totalSessionTime, 0)
  );
  readonly courseCompletionRate = computed(() => 
    this._courseAnalytics().reduce((sum, course) => sum + course.completionRate, 0) / this._courseAnalytics().length
  );

  constructor() {
    this.initializeMockData();
  }

  /**
   * Get learning progress for a user
   */
  getUserLearningProgress(userId: string): LearningProgress[] {
    return this._learningProgress().filter(progress => progress.userId === userId);
  }

  /**
   * Get quiz performance for a user
   */
  getUserQuizPerformance(userId: string): QuizPerformance[] {
    return this._quizPerformance().filter(quiz => quiz.userId === userId);
  }

  /**
   * Get user engagement data
   */
  getUserEngagement(userId: string): UserEngagement | undefined {
    return this._userEngagement().find(engagement => engagement.userId === userId);
  }

  /**
   * Get course analytics
   */
  getCourseAnalytics(courseId: string): CourseAnalytics | undefined {
    return this._courseAnalytics().find(course => course.courseId === courseId);
  }

  /**
   * Get learning path for a user
   */
  getUserLearningPath(userId: string): LearningPath | undefined {
    return this._learningPaths().find(path => path.userId === userId);
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    return this._systemMetrics();
  }

  /**
   * Get analytics dashboard data
   */
  getDashboardData(): {
    totalUsers: number;
    activeUsers: number;
    totalCourses: number;
    completionRate: number;
    averageScore: number;
    totalEngagement: number;
    systemHealth: number;
  } {
    const metrics = this._systemMetrics();
    return {
      totalUsers: metrics.totalUsers,
      activeUsers: metrics.activeUsers,
      totalCourses: metrics.totalCourses,
      completionRate: this.courseCompletionRate(),
      averageScore: this.averageQuizScore(),
      totalEngagement: this.totalEngagement(),
      systemHealth: metrics.systemUptime
    };
  }

  /**
   * Get learning trends
   */
  getLearningTrends(days: number = 30): {
    dailyProgress: Array<{ date: string; progress: number }>;
    dailyEngagement: Array<{ date: string; minutes: number }>;
    dailyCompletions: Array<{ date: string; count: number }>;
  } {
    const trends = {
      dailyProgress: [] as Array<{ date: string; progress: number }>,
      dailyEngagement: [] as Array<{ date: string; minutes: number }>,
      dailyCompletions: [] as Array<{ date: string; count: number }>
    };

    // Generate mock trend data for the last 30 days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      trends.dailyProgress.push({
        date: dateStr,
        progress: Math.random() * 100
      });

      trends.dailyEngagement.push({
        date: dateStr,
        minutes: Math.floor(Math.random() * 120) + 30
      });

      trends.dailyCompletions.push({
        date: dateStr,
        count: Math.floor(Math.random() * 10) + 1
      });
    }

    return trends;
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights(): {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    riskFactors: string[];
  } {
    return {
      strengths: [
        'Excellent completion rate in technical courses',
        'Strong performance in practical assignments',
        'Consistent daily engagement',
        'High quiz scores in maritime safety'
      ],
      weaknesses: [
        'Lower performance in theoretical courses',
        'Inconsistent attendance in live sessions',
        'Slow progress in advanced topics',
        'Limited participation in discussions'
      ],
      recommendations: [
        'Focus more on theoretical foundation courses',
        'Increase participation in live sessions',
        'Set daily learning goals',
        'Join study groups for difficult topics'
      ],
      riskFactors: [
        'Risk of dropping out due to slow progress',
        'Potential knowledge gaps in core concepts',
        'Low engagement in collaborative activities'
      ]
    };
  }

  /**
   * Generate learning recommendations
   */
  generateRecommendations(userId: string): {
    nextCourses: Array<{ courseId: string; courseName: string; reason: string; priority: number }>;
    skillGaps: Array<{ skill: string; importance: number; suggestedCourses: string[] }>;
    studyPlan: Array<{ week: number; focus: string; estimatedHours: number }>;
  } {
    return {
      nextCourses: [
        {
          courseId: 'course-4',
          courseName: 'Advanced Maritime Navigation',
          reason: 'Builds on your strong foundation in basic navigation',
          priority: 1
        },
        {
          courseId: 'course-5',
          courseName: 'Port Management Systems',
          reason: 'Complements your logistics knowledge',
          priority: 2
        }
      ],
      skillGaps: [
        {
          skill: 'Maritime Law and Regulations',
          importance: 8,
          suggestedCourses: ['course-6', 'course-7']
        },
        {
          skill: 'Advanced Weather Analysis',
          importance: 6,
          suggestedCourses: ['course-8']
        }
      ],
      studyPlan: [
        { week: 1, focus: 'Complete current course modules', estimatedHours: 15 },
        { week: 2, focus: 'Start Advanced Navigation course', estimatedHours: 20 },
        { week: 3, focus: 'Focus on practical applications', estimatedHours: 18 },
        { week: 4, focus: 'Review and assessment preparation', estimatedHours: 12 }
      ]
    };
  }

  /**
   * Initialize mock data
   */
  private initializeMockData(): void {
    // Mock learning progress data
    const mockProgress: LearningProgress[] = [
      {
        userId: 'user-1',
        courseId: 'course-1',
        courseName: 'Kỹ thuật Tàu biển Cơ bản',
        totalLessons: 12,
        completedLessons: 9,
        progressPercentage: 75,
        timeSpent: 180,
        lastAccessed: new Date(),
        averageScore: 85,
        completionDate: undefined
      },
      {
        userId: 'user-1',
        courseId: 'course-2',
        courseName: 'An toàn Hàng hải',
        totalLessons: 8,
        completedLessons: 8,
        progressPercentage: 100,
        timeSpent: 120,
        lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        averageScore: 92,
        completionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    // Mock quiz performance data
    const mockQuizPerformance: QuizPerformance[] = [
      {
        userId: 'user-1',
        quizId: 'quiz-1',
        quizName: 'Kiến thức cơ bản về Hàng hải',
        attempts: 3,
        bestScore: 95,
        averageScore: 87,
        timeSpent: 45,
        lastAttempt: new Date(),
        improvement: 15
      },
      {
        userId: 'user-1',
        quizId: 'quiz-2',
        quizName: 'An toàn Hàng hải',
        attempts: 2,
        bestScore: 88,
        averageScore: 85,
        timeSpent: 30,
        lastAttempt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        improvement: 8
      }
    ];

    // Mock user engagement data
    const mockEngagement: UserEngagement[] = [
      {
        userId: 'user-1',
        totalLoginDays: 25,
        totalSessionTime: 450,
        averageSessionDuration: 18,
        mostActiveDay: 'Tuesday',
        mostActiveHour: 14,
        coursesEnrolled: 3,
        coursesCompleted: 1,
        assignmentsSubmitted: 5,
        quizzesCompleted: 8,
        lastActivity: new Date()
      }
    ];

    // Mock course analytics data
    const mockCourseAnalytics: CourseAnalytics[] = [
      {
        courseId: 'course-1',
        courseName: 'Kỹ thuật Tàu biển Cơ bản',
        totalEnrollments: 150,
        completionRate: 78,
        averageScore: 82,
        averageTimeToComplete: 14,
        dropOutRate: 12,
        mostDifficultLesson: 'Hệ thống động lực nâng cao',
        mostEngagingLesson: 'Thực hành mô phỏng',
        studentSatisfaction: 4.2,
        instructorRating: 4.5
      },
      {
        courseId: 'course-2',
        courseName: 'An toàn Hàng hải',
        totalEnrollments: 200,
        completionRate: 85,
        averageScore: 88,
        averageTimeToComplete: 10,
        dropOutRate: 8,
        mostDifficultLesson: 'Quy định SOLAS',
        mostEngagingLesson: 'Xử lý tình huống khẩn cấp',
        studentSatisfaction: 4.6,
        instructorRating: 4.7
      }
    ];

    // Mock system metrics
    const mockSystemMetrics: SystemMetrics = {
      totalUsers: 1250,
      activeUsers: 890,
      totalCourses: 25,
      totalLessons: 180,
      totalQuizzes: 45,
      totalAssignments: 60,
      systemUptime: 99.8,
      averageResponseTime: 150,
      errorRate: 0.2,
      storageUsed: 45.6,
      bandwidthUsed: 120.3
    };

    // Mock learning paths
    const mockLearningPaths: LearningPath[] = [
      {
        userId: 'user-1',
        recommendedCourses: ['course-4', 'course-5', 'course-6'],
        skillGaps: ['Maritime Law', 'Advanced Navigation', 'Port Management'],
        nextSteps: ['Complete current course', 'Start advanced navigation', 'Join study group'],
        estimatedCompletionTime: 30,
        confidenceScore: 0.85
      }
    ];

    this._learningProgress.set(mockProgress);
    this._quizPerformance.set(mockQuizPerformance);
    this._userEngagement.set(mockEngagement);
    this._courseAnalytics.set(mockCourseAnalytics);
    this._systemMetrics.set(mockSystemMetrics);
    this._learningPaths.set(mockLearningPaths);
  }

  /**
   * Format time duration
   */
  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Calculate improvement percentage
   */
  calculateImprovement(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }

  /**
   * Get performance grade
   */
  getPerformanceGrade(score: number): { grade: string; color: string } {
    if (score >= 90) return { grade: 'A+', color: 'text-green-600' };
    if (score >= 80) return { grade: 'A', color: 'text-green-500' };
    if (score >= 70) return { grade: 'B', color: 'text-yellow-500' };
    if (score >= 60) return { grade: 'C', color: 'text-orange-500' };
    return { grade: 'D', color: 'text-red-500' };
  }
}
