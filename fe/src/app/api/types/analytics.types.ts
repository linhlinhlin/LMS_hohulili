/**
 * Analytics Types
 * Types for student analytics, learning patterns, performance tracking
 * PostgreSQL Tables: quiz_attempts, assignments, enrollments, video_progress
 */

// =======================
// Student Analytics Types
// =======================

export interface LearningAnalytics {
    userId: string;
    totalStudyTime: number;
    averageSessionTime: number;
    completedLessons: number;
    completedCourses: number;
    quizzesTaken: number;
    averageQuizScore: number;
    assignmentsSubmitted: number;
    learningStreak: number;
    lastActive: string; // ISO 8601
}

export interface StudyPattern {
    dayOfWeek: number;
    hour: number;
    duration: number;
    count: number;
}

export interface PerformanceData {
    period: string;
    date: string; // ISO 8601
    lessonsCompleted: number;
    quizScore: number;
    studyTime: number;
    assignmentsSubmitted: number;
}

export interface SkillProgress {
    skillId: string;
    skillName: string;
    category: string;
    level: number;
    progress: number;
    lastUpdated: string; // ISO 8601
}

export interface LearningGoal {
    id: string;
    title: string;
    description?: string;
    targetDate: string; // ISO 8601
    progress: number;
    completed: boolean;
    milestones: Milestone[];
}

export interface Milestone {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: string; // ISO 8601
    order: number;
}

// =======================
// Course Analytics Types
// =======================

export interface CourseAnalytics {
    courseId: string;
    enrollmentCount: number;
    completionRate: number;
    averageRating: number;
    totalRevenue: number;
    averageProgress: number;
    activeStudents: number;
}

export interface LessonAnalytics {
    lessonId: string;
    viewCount: number;
    averageWatchTime: number;
    completionRate: number;
    dropOffPoint?: number;
}

// =======================
// Teacher Analytics Types
// =======================

export interface TeacherAnalytics {
    teacherId: string;
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
    completionRate: number;
}

// =======================
// Report Types
// =======================

export interface AnalyticsReport {
    id: string;
    title: string;
    type: 'enrollment' | 'revenue' | 'engagement' | 'completion';
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    data: any[];
    generatedAt: string; // ISO 8601
}

