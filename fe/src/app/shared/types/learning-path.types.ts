export interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration: number; // in weeks
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: string[];
  learningObjectives: string[];
  courses: LearningPathCourse[];
  progress: number;
  isCompleted: boolean;
  isRecommended: boolean;
  estimatedTime: number; // in hours
  skills: string[];
  targetAudience: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningPathCourse {
  id: string;
  title: string;
  description: string;
  order: number;
  isRequired: boolean;
  estimatedTime: number; // in hours
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: string[];
  learningObjectives: string[];
  lessons: LearningPathLesson[];
  progress: number;
  isCompleted: boolean;
  isUnlocked: boolean;
}

export interface LearningPathLesson {
  id: string;
  title: string;
  description: string;
  order: number;
  type: 'video' | 'reading' | 'quiz' | 'assignment' | 'project';
  estimatedTime: number; // in minutes
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: string[];
  learningObjectives: string[];
  progress: number;
  isCompleted: boolean;
  isUnlocked: boolean;
  resources: LearningResource[];
}

export interface LearningResource {
  id: string;
  title: string;
  type: 'video' | 'document' | 'link' | 'quiz' | 'assignment';
  url: string;
  description: string;
  duration?: number; // in minutes
  isRequired: boolean;
}

export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  type: 'skill' | 'certification' | 'career' | 'personal';
  targetDate: Date;
  progress: number;
  isCompleted: boolean;
  learningPaths: string[];
  milestones: LearningMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningMilestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number;
  isCompleted: boolean;
  learningPathId: string;
  courseId?: string;
  lessonId?: string;
  reward: string;
}

export interface AdaptiveLearningRecommendation {
  id: string;
  type: 'course' | 'lesson' | 'path' | 'resource';
  title: string;
  description: string;
  reason: string;
  confidence: number; // 0-1
  priority: 'low' | 'medium' | 'high';
  estimatedTime: number; // in minutes
  difficulty: 1 | 2 | 3 | 4 | 5;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  isAccepted: boolean;
  createdAt: Date;
}

export interface LearningAnalytics {
  totalStudyTime: number; // in minutes
  averageSessionTime: number; // in minutes
  completionRate: number; // 0-1
  learningVelocity: number; // lessons per week
  preferredLearningTime: string; // time of day
  preferredLearningDay: string; // day of week
  learningStreak: number; // days
  totalLessonsCompleted: number;
  totalCoursesCompleted: number;
  averageQuizScore: number;
  learningPathProgress: LearningPathProgress[];
  skillDevelopment: SkillDevelopment[];
  learningPatterns: LearningPattern[];
}

export interface LearningPathProgress {
  learningPathId: string;
  title: string;
  progress: number;
  completedCourses: number;
  totalCourses: number;
  completedLessons: number;
  totalLessons: number;
  estimatedTimeRemaining: number; // in hours
  lastAccessed: Date;
}

export interface SkillDevelopment {
  skill: string;
  level: 1 | 2 | 3 | 4 | 5;
  progress: number; // 0-1
  lessonsCompleted: number;
  totalLessons: number;
  lastUpdated: Date;
}

export interface LearningPattern {
  pattern: string;
  description: string;
  frequency: number;
  effectiveness: number; // 0-1
  recommendations: string[];
}