export interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  instructorId: string;
  questions: Question[];
  timeLimit: number; // in minutes
  passingScore: number; // percentage
  maxAttempts: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  instructions?: string;
  totalPoints: number;
}

export interface Question {
  id: string;
  quizId: string;
  type: QuestionType;
  text: string;
  options?: string[]; // for multiple choice
  correctAnswer: string | string[];
  points: number;
  explanation?: string;
  order: number;
  isRequired: boolean;
  timeLimit?: number; // in seconds
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple-choice',
  TRUE_FALSE = 'true-false',
  FILL_BLANK = 'fill-blank',
  SHORT_ANSWER = 'short-answer',
  ESSAY = 'essay'
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: Answer[];
  startTime: Date;
  endTime?: Date;
  timeSpent: number; // in seconds
  score: number;
  percentage: number;
  isPassed: boolean;
  status: AttemptStatus;
  submittedAt?: Date;
}

export enum AttemptStatus {
  IN_PROGRESS = 'in-progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  EXPIRED = 'expired'
}

export interface Answer {
  id: string;
  questionId: string;
  attemptId: string;
  answer: string | string[];
  isCorrect: boolean;
  points: number;
  timeSpent: number; // in seconds
  submittedAt: Date;
}

export interface QuizResult {
  attemptId: string;
  quizId: string;
  userId: string;
  score: number;
  percentage: number;
  isPassed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeSpent: number;
  submittedAt: Date;
  feedback?: string;
}

export interface QuizSettings {
  allowReview: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  allowRetake: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  requirePassword: boolean;
  password?: string;
  ipRestriction?: string[];
  browserRestriction?: boolean;
}

export interface QuizFilter {
  courseId?: string;
  instructorId?: string;
  isActive?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimit?: {
    min?: number;
    max?: number;
  };
  points?: {
    min?: number;
    max?: number;
  };
}

export interface QuizStats {
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;
  completionRate: number;
  mostMissedQuestions: string[];
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
}
