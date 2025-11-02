/**
 * Student Feature Types
 *
 * Centralized type definitions for the Student feature module
 * Following modern Angular practices with proper TypeScript typing
 */

import { EnrolledCourse as SharedEnrolledCourse } from '../../../shared/types/course.types';

// Re-export shared types for convenience
export type EnrolledCourse = SharedEnrolledCourse;

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course: string;
  dueDate: string;
  type: 'quiz' | 'assignment' | 'project';
  status: 'pending' | 'submitted' | 'graded';
  priority: 'low' | 'medium' | 'high';
}

export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number;
  category: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: 'course' | 'quiz' | 'streak' | 'social';
}

export interface StudentStats {
  enrolledCourses: number;
  completedCourses: number;
  totalStudyTime: number;
  averageGrade: string;
  currentStreak: number;
  currentLevel: number;
}

export interface StudentNavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badge?: number;
  children?: StudentNavigationItem[];
}

export interface StudentDashboardData {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  stats: StudentStats;
  enrolledCourses: EnrolledCourse[];
  pendingAssignments: Assignment[];
  learningGoals: LearningGoal[];
  achievements: Achievement[];
  upcomingDeadlines: EnrolledCourse[];
}