/**
 * Quiz Feature Types
 *
 * Centralized type definitions for the Quiz feature module
 * Following modern Angular practices with proper TypeScript typing
 */

// Question Types
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple-choice',
  TRUE_FALSE = 'true-false',
  FILL_BLANK = 'fill-blank',
  ESSAY = 'essay'
}

// Quiz Status
export enum QuizStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

// Quiz Attempt Status
export enum QuizAttemptStatus {
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  TIMED_OUT = 'timed-out',
  ABANDONED = 'abandoned'
}

// Quiz Difficulty
export enum QuizDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

// Core Entities
export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  timeLimit?: number; // in seconds
  order: number;
  tags?: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  instructorId: string;
  questions: Question[];
  timeLimit?: number; // in minutes
  passingScore: number; // percentage
  maxAttempts: number;
  difficulty: QuizDifficulty;
  status: QuizStatus;
  tags: string[];
  totalPoints: number;
  instructions?: string;
  dueDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  startTime: Date;
  endTime?: Date;
  answers: QuizAnswer[];
  score: number;
  percentage: number;
  isPassed: boolean;
  status: QuizAttemptStatus;
  timeSpent: number; // in seconds
  submittedAt?: Date;
}

export interface QuizAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  points: number;
  timeSpent: number; // in seconds
}

// DTOs for API communication
export interface CreateQuizDto {
  title: string;
  description: string;
  courseId: string;
  questions: Omit<Question, 'id' | 'order'>[];
  timeLimit?: number;
  passingScore: number;
  maxAttempts: number;
  difficulty: QuizDifficulty;
  tags: string[];
  instructions?: string;
  dueDate?: Date;
}

export interface UpdateQuizDto extends Partial<CreateQuizDto> {
  id: string;
  status?: QuizStatus;
}

export interface QuizAttemptDto {
  quizId: string;
  answers: {
    questionId: string;
    answer: string | string[];
    timeSpent: number;
  }[];
  timeSpent: number;
}

// Filter and Search
export interface QuizFilter {
  courseId?: string;
  status?: QuizStatus;
  difficulty?: QuizDifficulty;
  tags?: string[];
  instructorId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface QuizSearchParams {
  query?: string;
  filter?: QuizFilter;
  sortBy?: 'createdAt' | 'title' | 'difficulty' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Results and Analytics
export interface QuizResult {
  attemptId: string;
  quizId: string;
  studentId: string;
  score: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  isPassed: boolean;
  submittedAt: Date;
  detailedResults: QuestionResult[];
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  explanation?: string;
}

export interface QuizStatistics {
  quizId: string;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;
  questionStats: QuestionStatistics[];
  attemptsOverTime: {
    date: Date;
    attempts: number;
    averageScore: number;
  }[];
}

export interface QuestionStatistics {
  questionId: string;
  questionText: string;
  totalAttempts: number;
  correctAttempts: number;
  averageTimeSpent: number;
  difficulty: number; // 0-1 scale
}

// UI State Types
export interface QuizState {
  currentQuiz: Quiz | null;
  currentAttempt: QuizAttempt | null;
  currentQuestionIndex: number;
  timeRemaining: number;
  isActive: boolean;
  isCompleted: boolean;
  answers: Map<string, QuizAnswer>;
}

export interface QuizNavigationItem {
  index: number;
  answered: boolean;
  current: boolean;
  flagged?: boolean;
}

// Form Types
export interface QuizFormData {
  title: string;
  description: string;
  courseId: string;
  timeLimit?: number;
  passingScore: number;
  maxAttempts: number;
  difficulty: QuizDifficulty;
  tags: string[];
  instructions?: string;
  dueDate?: Date;
}

export interface QuestionFormData {
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  timeLimit?: number;
  tags?: string[];
}

// Error Types
export interface QuizError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

// Constants
export const QUIZ_TIME_LIMITS = {
  SHORT: 15, // 15 minutes
  MEDIUM: 30, // 30 minutes
  LONG: 60, // 60 minutes
  EXTRA_LONG: 120 // 120 minutes
} as const;

export const QUIZ_PASSING_SCORES = {
  EASY: 60,
  MEDIUM: 70,
  HARD: 80,
  EXPERT: 90
} as const;

export const QUIZ_MAX_ATTEMPTS = {
  UNLIMITED: 0,
  LIMITED: 3,
  SINGLE: 1
} as const;