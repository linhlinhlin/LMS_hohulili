import { Injectable, signal, computed } from '@angular/core';
import { 
  LearningPath, 
  LearningPathCourse, 
  LearningPathLesson, 
  LearningGoal, 
  LearningMilestone,
  AdaptiveLearningRecommendation,
  LearningAnalytics,
  LearningPathProgress,
  SkillDevelopment
} from '../../shared/types/learning-path.types';

@Injectable({
  providedIn: 'root'
})
export class LearningPathService {
  // Signals for reactive state management
  private learningPaths = signal<LearningPath[]>([]);
  private learningGoals = signal<LearningGoal[]>([]);
  private recommendations = signal<AdaptiveLearningRecommendation[]>([]);
  private analytics = signal<LearningAnalytics>({
    totalStudyTime: 0,
    averageSessionTime: 0,
    completionRate: 0,
    learningVelocity: 0,
    preferredLearningTime: 'morning',
    preferredLearningDay: 'monday',
    learningStreak: 0,
    totalLessonsCompleted: 0,
    totalCoursesCompleted: 0,
    averageQuizScore: 0,
    learningPathProgress: [],
    skillDevelopment: [],
    learningPatterns: []
  });

  // Computed values
  recommendedPaths = computed(() => 
    this.learningPaths().filter(path => path.isRecommended)
  );
  
  inProgressPaths = computed(() => 
    this.learningPaths().filter(path => path.progress > 0 && !path.isCompleted)
  );
  
  completedPaths = computed(() => 
    this.learningPaths().filter(path => path.isCompleted)
  );

  activeGoals = computed(() => 
    this.learningGoals().filter(goal => !goal.isCompleted)
  );

  highPriorityRecommendations = computed(() => 
    this.recommendations().filter(rec => rec.priority === 'high' && !rec.isAccepted)
  );

  constructor() {
    this.initializeLearningPaths();
    this.initializeLearningGoals();
    this.generateRecommendations();
  }

  private initializeLearningPaths(): void {
    const paths: LearningPath[] = [
      {
        id: 'maritime-basics',
        title: 'Cơ bản về Hàng hải',
        description: 'Khóa học cơ bản về ngành hàng hải cho người mới bắt đầu',
        category: 'beginner',
        duration: 8,
        difficulty: 2,
        prerequisites: [],
        learningObjectives: [
          'Hiểu biết cơ bản về ngành hàng hải',
          'Nắm vững các quy định an toàn',
          'Thực hành kỹ năng cơ bản'
        ],
        courses: [
          {
            id: 'maritime-intro',
            title: 'Giới thiệu về Hàng hải',
            description: 'Tổng quan về ngành hàng hải',
            order: 1,
            isRequired: true,
            estimatedTime: 20,
            difficulty: 1,
            prerequisites: [],
            learningObjectives: ['Hiểu biết cơ bản về ngành hàng hải'],
            lessons: [
              {
                id: 'maritime-history',
                title: 'Lịch sử Hàng hải',
                description: 'Tìm hiểu lịch sử phát triển của ngành hàng hải',
                order: 1,
                type: 'video',
                estimatedTime: 45,
                difficulty: 1,
                prerequisites: [],
                learningObjectives: ['Hiểu lịch sử hàng hải'],
                progress: 0,
                isCompleted: false,
                isUnlocked: true,
                resources: [
                  {
                    id: 'maritime-history-video',
                    title: 'Video Lịch sử Hàng hải',
                    type: 'video',
                    url: 'https://example.com/maritime-history',
                    description: 'Video giới thiệu lịch sử hàng hải',
                    duration: 45,
                    isRequired: true
                  }
                ]
              }
            ],
            progress: 0,
            isCompleted: false,
            isUnlocked: true
          }
        ],
        progress: 0,
        isCompleted: false,
        isRecommended: true,
        estimatedTime: 160,
        skills: ['Kiến thức hàng hải cơ bản', 'An toàn hàng hải'],
        targetAudience: ['Thủy thủ mới', 'Sinh viên hàng hải'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'advanced-maritime',
        title: 'Hàng hải Nâng cao',
        description: 'Khóa học nâng cao về kỹ thuật và quản lý hàng hải',
        category: 'advanced',
        duration: 12,
        difficulty: 4,
        prerequisites: ['maritime-basics'],
        learningObjectives: [
          'Nắm vững kỹ thuật hàng hải nâng cao',
          'Quản lý đội tàu hiệu quả',
          'Xử lý tình huống khẩn cấp'
        ],
        courses: [],
        progress: 0,
        isCompleted: false,
        isRecommended: false,
        estimatedTime: 240,
        skills: ['Kỹ thuật hàng hải nâng cao', 'Quản lý đội tàu'],
        targetAudience: ['Thuyền trưởng', 'Sĩ quan hàng hải'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.learningPaths.set(paths);
  }

  private initializeLearningGoals(): void {
    const goals: LearningGoal[] = [
      {
        id: 'maritime-certification',
        title: 'Chứng chỉ Hàng hải Cơ bản',
        description: 'Đạt được chứng chỉ hàng hải cơ bản trong 6 tháng',
        type: 'certification',
        targetDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
        progress: 0,
        isCompleted: false,
        learningPaths: ['maritime-basics'],
        milestones: [
          {
            id: 'complete-basics',
            title: 'Hoàn thành khóa học cơ bản',
            description: 'Hoàn thành tất cả bài học trong khóa cơ bản',
            targetDate: new Date(Date.now() + 2 * 30 * 24 * 60 * 60 * 1000), // 2 months
            progress: 0,
            isCompleted: false,
            learningPathId: 'maritime-basics',
            reward: 'Badge Cơ bản Hàng hải'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.learningGoals.set(goals);
  }

  private generateRecommendations(): void {
    const recommendations: AdaptiveLearningRecommendation[] = [
      {
        id: 'rec-1',
        type: 'path',
        title: 'Cơ bản về Hàng hải',
        description: 'Khóa học phù hợp với trình độ hiện tại của bạn',
        reason: 'Dựa trên kết quả đánh giá ban đầu',
        confidence: 0.9,
        priority: 'high',
        estimatedTime: 160,
        difficulty: 2,
        learningStyle: 'visual',
        isAccepted: false,
        createdAt: new Date()
      },
      {
        id: 'rec-2',
        type: 'course',
        title: 'An toàn Hàng hải',
        description: 'Khóa học quan trọng cho sự nghiệp hàng hải',
        reason: 'Kỹ năng cần thiết cho thủy thủ',
        confidence: 0.8,
        priority: 'medium',
        estimatedTime: 40,
        difficulty: 3,
        learningStyle: 'kinesthetic',
        isAccepted: false,
        createdAt: new Date()
      }
    ];

    this.recommendations.set(recommendations);
  }

  // Learning Path methods
  getLearningPath(id: string): LearningPath | undefined {
    return this.learningPaths().find(path => path.id === id);
  }

  updateLearningPathProgress(pathId: string, progress: number): void {
    const paths = this.learningPaths().map(path => 
      path.id === pathId 
        ? { ...path, progress: Math.min(100, Math.max(0, progress)), updatedAt: new Date() }
        : path
    );
    this.learningPaths.set(paths);
  }

  completeLearningPath(pathId: string): void {
    const paths = this.learningPaths().map(path => 
      path.id === pathId 
        ? { ...path, isCompleted: true, progress: 100, updatedAt: new Date() }
        : path
    );
    this.learningPaths.set(paths);
  }

  // Learning Goal methods
  getLearningGoal(id: string): LearningGoal | undefined {
    return this.learningGoals().find(goal => goal.id === id);
  }

  updateLearningGoalProgress(goalId: string, progress: number): void {
    const goals = this.learningGoals().map(goal => 
      goal.id === goalId 
        ? { ...goal, progress: Math.min(100, Math.max(0, progress)), updatedAt: new Date() }
        : goal
    );
    this.learningGoals.set(goals);
  }

  completeLearningGoal(goalId: string): void {
    const goals = this.learningGoals().map(goal => 
      goal.id === goalId 
        ? { ...goal, isCompleted: true, progress: 100, updatedAt: new Date() }
        : goal
    );
    this.learningGoals.set(goals);
  }

  // Recommendation methods
  acceptRecommendation(recommendationId: string): void {
    const recommendations = this.recommendations().map(rec => 
      rec.id === recommendationId 
        ? { ...rec, isAccepted: true }
        : rec
    );
    this.recommendations.set(recommendations);
  }

  rejectRecommendation(recommendationId: string): void {
    const recommendations = this.recommendations().filter(rec => rec.id !== recommendationId);
    this.recommendations.set(recommendations);
  }

  // Analytics methods
  updateAnalytics(analytics: Partial<LearningAnalytics>): void {
    const currentAnalytics = this.analytics();
    this.analytics.set({ ...currentAnalytics, ...analytics });
  }

  getLearningAnalytics(): LearningAnalytics {
    return this.analytics();
  }

  // Adaptive learning methods
  generatePersonalizedRecommendations(): AdaptiveLearningRecommendation[] {
    // This would use AI/ML algorithms in a real implementation
    const currentAnalytics = this.analytics();
    const completedPaths = this.completedPaths();
    
    // Simple recommendation logic based on progress and preferences
    const recommendations: AdaptiveLearningRecommendation[] = [];
    
    if (currentAnalytics.completionRate < 0.5) {
      recommendations.push({
        id: `rec-${Date.now()}`,
        type: 'course',
        title: 'Khóa học Cơ bản',
        description: 'Khóa học phù hợp với trình độ hiện tại',
        reason: 'Dựa trên tỷ lệ hoàn thành thấp',
        confidence: 0.7,
        priority: 'high',
        estimatedTime: 20,
        difficulty: 1,
        learningStyle: 'visual',
        isAccepted: false,
        createdAt: new Date()
      });
    }
    
    return recommendations;
  }

  // Progress tracking methods
  trackLessonCompletion(lessonId: string, pathId: string): void {
    const paths = this.learningPaths().map(path => {
      if (path.id === pathId) {
        const updatedCourses = path.courses.map(course => {
          const updatedLessons = course.lessons.map(lesson => 
            lesson.id === lessonId 
              ? { ...lesson, isCompleted: true, progress: 100 }
              : lesson
          );
          return { ...course, lessons: updatedLessons };
        });
        return { ...path, courses: updatedCourses };
      }
      return path;
    });
    
    this.learningPaths.set(paths);
    this.updatePathProgress(pathId);
  }

  private updatePathProgress(pathId: string): void {
    const path = this.getLearningPath(pathId);
    if (path) {
      const totalLessons = path.courses.reduce((sum, course) => 
        sum + course.lessons.length, 0
      );
      const completedLessons = path.courses.reduce((sum, course) => 
        sum + course.lessons.filter(lesson => lesson.isCompleted).length, 0
      );
      
      const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      this.updateLearningPathProgress(pathId, progress);
      
      if (progress === 100) {
        this.completeLearningPath(pathId);
      }
    }
  }
}