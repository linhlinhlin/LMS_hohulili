/**
 * Quiz & Question Types - Aligned with PostgreSQL tables
 * @see V1__lms_consolidated_schema.sql - Section 6: Question Bank & Quizzes
 */

// ============================================
// PostgreSQL ENUM Types
// ============================================

/** PostgreSQL: difficulty VARCHAR(20) CHECK (...) */
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

/** PostgreSQL: status VARCHAR(50) CHECK (...) in questions table */
export type QuestionStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

/** PostgreSQL: type VARCHAR(50) CHECK (...) in quizzes table */
export type QuizType = 'LESSON_QUIZ' | 'ASSIGNMENT';

/** PostgreSQL: status VARCHAR(50) CHECK (...) in quizzes table */
export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** PostgreSQL: question_type VARCHAR(30) CHECK (...) in questions table */
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'SHORT_ANSWER' | 'ESSAY';

/** PostgreSQL: status VARCHAR(50) CHECK (...) in quiz_attempts table */
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

/** PostgreSQL: status VARCHAR(50) CHECK (...) in quiz_assignments table */
export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

/** PostgreSQL: visibility VARCHAR(50) CHECK (...) in packages table */
export type PackageVisibility = 'PUBLIC' | 'PRIVATE';

// ============================================
// Entity Types
// ============================================

/**
 * Question Package - matches `packages` table
 */
export interface QuestionPackage {
    id: string;                        // UUID
    ownerId: string;                   // UUID NOT NULL (FK users)
    name: string;                      // VARCHAR(500) NOT NULL
    description: string | null;        // TEXT NULLABLE
    subject: string | null;            // VARCHAR(200) NULLABLE
    visibility: PackageVisibility;     // VARCHAR(50) NOT NULL
    capacity: number | null;           // INTEGER NULLABLE
    durationDays: number | null;       // INTEGER NULLABLE
    isActive: boolean;                 // BOOLEAN DEFAULT true
    price: number | null;              // NUMERIC(12,2) NULLABLE
    createdAt: string;                 // TIMESTAMPTZ
    updatedAt: string;                 // TIMESTAMPTZ
}

/**
 * Question - matches `questions` table
 */
export interface Question {
    id: string;                        // UUID
    createdBy: string;                 // UUID NOT NULL (FK users)
    packageId: string | null;          // UUID NULLABLE (FK packages)
    courseId: string | null;           // UUID NULLABLE (FK courses)
    content: string | null;            // TEXT NULLABLE
    contentBlocks: Record<string, unknown> | null; // JSONB NULLABLE
    questionType: QuestionType;        // VARCHAR(30) NOT NULL DEFAULT 'SINGLE_CHOICE'
    correctOption: string | null;      // VARCHAR(10) NULLABLE (legacy, replaced by answerKey)
    answerKey: Record<string, unknown> | null; // JSONB NULLABLE (flexible answer definition)
    difficulty: QuestionDifficulty;    // VARCHAR(20) NOT NULL
    status: QuestionStatus;            // VARCHAR(50) NOT NULL
    tags: string | null;               // TEXT NULLABLE
    usageCount: number;                // INTEGER NOT NULL DEFAULT 0
    correctRate: number | null;        // NUMERIC(5,2) NULLABLE
    createdAt: string;                 // TIMESTAMPTZ
    updatedAt: string | null;          // TIMESTAMPTZ NULLABLE
}

/**
 * Question Option - matches `question_options` table
 */
export interface QuestionOption {
    id: string;
    questionId: string;
    optionKey: string;                 // VARCHAR(10) NOT NULL (A, B, C, D)
    content: Record<string, unknown>;  // JSONB NOT NULL
    contentBlocks: Record<string, unknown> | null;
    isCorrect: boolean;
    displayOrder: number;
    orderIndex: number | null;
}

/**
 * Quiz - matches `quizzes` table
 */
export interface Quiz {
    id: string;                        // UUID
    createdBy: string;                 // UUID NOT NULL
    courseId: string | null;           // UUID NULLABLE
    lessonId: string | null;           // UUID NULLABLE UNIQUE
    sectionId: string | null;          // UUID NULLABLE UNIQUE
    classId: string | null;            // UUID NULLABLE
    title: string | null;              // VARCHAR(500) NULLABLE
    description: string | null;        // TEXT NULLABLE
    type: QuizType;                    // VARCHAR(50) NOT NULL
    status: QuizStatus;                // VARCHAR(50) NOT NULL
    timeLimitMinutes: number | null;   // INTEGER NULLABLE
    maxAttempts: number;               // INTEGER NOT NULL DEFAULT 1
    passingScore: number;              // INTEGER NOT NULL DEFAULT 60
    shuffleQuestions: boolean;         // BOOLEAN NOT NULL DEFAULT false
    shuffleOptions: boolean;           // BOOLEAN NOT NULL DEFAULT false
    showCorrectAnswers: boolean;       // BOOLEAN NOT NULL DEFAULT false
    showResultsImmediately: boolean;   // BOOLEAN NOT NULL DEFAULT true
    randomCount: number | null;        // INTEGER NULLABLE
    randomTags: string | null;         // TEXT NULLABLE
    randomDifficulties: string | null; // TEXT NULLABLE
    questionIds: string | null;        // TEXT NULLABLE (comma-separated)
    startDate: string | null;          // TIMESTAMPTZ NULLABLE
    endDate: string | null;            // TIMESTAMPTZ NULLABLE
    publishedAt: string | null;        // TIMESTAMPTZ NULLABLE
    createdAt: string;                 // TIMESTAMPTZ
    updatedAt: string | null;          // TIMESTAMPTZ NULLABLE
}

/**
 * Quiz Question - matches `quiz_questions` table
 */
export interface QuizQuestion {
    id: string;
    quizId: string;
    questionId: string;
    question: string;                  // TEXT NOT NULL
    type: QuestionType;
    correctAnswer: string | null;
    explanation: string | null;
    options: Record<string, unknown> | null; // JSONB
    contentBlocks: Record<string, unknown> | null; // JSONB
    points: number;                    // INTEGER DEFAULT 1
    displayOrder: number;
    orderIndex: number | null;
    createdAt: string;
}

/**
 * Quiz Attempt - matches `quiz_attempts` table
 */
export interface QuizAttempt {
    id: string;
    quizId: string;
    studentId: string;
    assignmentId: string | null;
    status: AttemptStatus;
    score: number | null;              // DOUBLE PRECISION NULLABLE
    maxScore: number | null;           // DOUBLE PRECISION NULLABLE
    correctAnswers: number;            // INTEGER NOT NULL DEFAULT 0
    totalQuestions: number;            // INTEGER NOT NULL DEFAULT 0
    passed: boolean;                   // BOOLEAN NOT NULL DEFAULT false
    answers: Record<string, unknown> | null; // JSONB NULLABLE
    questionOrder: string | null;      // TEXT NULLABLE
    optionOrders: string | null;       // TEXT NULLABLE
    timeSpentSeconds: number | null;   // BIGINT NULLABLE
    startTime: string;                 // TIMESTAMPTZ NOT NULL
    startedAt: string | null;          // TIMESTAMPTZ NULLABLE
    endTime: string | null;            // TIMESTAMPTZ NULLABLE
    submittedAt: string | null;        // TIMESTAMPTZ NULLABLE
    createdAt: string;
    updatedAt: string | null;
}

// ============================================
// Request DTOs
// ============================================

export interface CreateQuizRequest {
    title: string;
    description?: string;
    type?: QuizType;
    timeLimitMinutes?: number;
    maxAttempts?: number;
    passingScore?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showCorrectAnswers?: boolean;
    showResultsImmediately?: boolean;
    questionIds: string[];
    startDate?: string;
    endDate?: string;
    publishImmediately?: boolean;
}

export interface CreateQuestionRequest {
    content?: string;
    contentBlocks?: Record<string, unknown>;
    questionType?: QuestionType;          // New: defaults to SINGLE_CHOICE
    correctOption?: string;               // Legacy: optional if answerKey provided
    answerKey?: Record<string, unknown>;  // New: flexible answer key
    difficulty: QuestionDifficulty;
    tags?: string;
    packageId?: string;
    options: CreateQuestionOptionRequest[];
}

export interface CreateQuestionOptionRequest {
    optionKey: string;
    content: Record<string, unknown>;
    isCorrect?: boolean;
}

export interface SubmitQuizRequest {
    answers: SubmitQuizAnswer[];
}

export interface SubmitQuizAnswer {
    questionId: string;
    selectedOption?: string;                    // Legacy: single choice
    studentAnswer?: Record<string, unknown>;    // New: flexible answer format
}

// ============================================
// Response DTOs
// ============================================

export interface QuizSummary {
    id: string;
    title: string | null;
    type: QuizType;
    status: QuizStatus;
    questionCount: number;
    timeLimitMinutes: number | null;
    maxAttempts: number;
    passingScore: number;
}

export interface QuizAttemptResult {
    attemptId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    correctAnswers: number;
    totalQuestions: number;
    timeSpentSeconds: number;
    completedAt: string;
}

export interface QuestionSummary {
    id: string;
    content: string | null;
    difficulty: QuestionDifficulty;
    tags: string | null;
    usageCount: number;
    correctRate: number | null;
}

// ============================================
// Form Types (UI)
// ============================================

/**
 * Quiz form configuration
 * Controls which fields are shown and default values
 */
export interface QuizFormConfig {
    showDates: boolean;  // Show start/end date fields for Assignment
    defaults: {
        timeLimitMinutes?: number;
        maxAttempts: number;
        passingScore: number;
        shuffleQuestions: boolean;
        shuffleOptions: boolean;
        showResultsImmediately: boolean;
        showCorrectAnswers: boolean;
        publishImmediately: boolean;
    };
}

/**
 * Quiz form data submitted from UI
 */
export interface QuizFormData {
    title: string;
    description?: string;
    timeLimitMinutes?: number;
    maxAttempts: number;
    passingScore: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showResultsImmediately: boolean;
    showCorrectAnswers: boolean;
    startDate?: string;   // ISO 8601
    endDate?: string;     // ISO 8601
    questionIds: string[];
    publishImmediately: boolean;
}
