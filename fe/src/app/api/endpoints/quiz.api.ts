import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';
import { Question } from './question.api';
import { Observable } from 'rxjs';
import { QUIZ_ENDPOINTS } from './quiz.endpoints';

// ============================================
// Request DTOs
// ============================================

export interface CreateQuizRequest {
  title?: string;
  questionIds: string[];
  timeLimitMinutes?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
  showCorrectAnswers?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface UpdateQuizQuestionsRequest {
  questionIds: string[];
}

export interface SubmitAttemptRequest {
  answers: Record<string, string>;
}

// BE expects List<AttemptAnswer> with { questionId, selectedOptionId }
export interface AttemptAnswer {
  questionId: string;
  selectedOptionId: string;
}

export interface CreateLessonQuizRequest {
  title: string;
  description?: string;
  timeLimitMinutes?: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  questionIds: string[];
  publishImmediately: boolean;
}

export interface CreateAssignmentQuizRequest {
  title: string;
  description?: string;
  timeLimitMinutes?: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  startDate?: string;
  endDate?: string;
  classId?: string;
  questionIds: string[];
  publishImmediately: boolean;
}

export interface AssignQuizRequest {
  studentIds: string[];
  dueDate?: string;
}

// ============================================
// Response DTOs
// ============================================

export interface QuizResponse {
  id: string;
  lessonId: string;
  title?: string;
  questionIds: string;
  timeLimitMinutes: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  startDate?: string;
  endDate?: string;
}

export interface QuizAttemptResponse {
  id: string;
  quizId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  startTime: string;
  endTime?: string;
  timeSpentSeconds?: number;
  score?: number;
  totalQuestions: number;
  correctAnswers: number;
  isPassed?: boolean;
}

export interface QuizResult {
  attemptId: string;
  quizTitle: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  isPassed: boolean;
  passingScore: number;
  startTime: string;
  endTime: string;
  timeSpentSeconds: number;
  showCorrectAnswers: boolean;
  resultItems: QuizResultItem[];
}

export interface QuizResultItem {
  questionId: string;
  questionContent: string;
  selectedOption?: string;
  correctOption: string;
  isCorrect: boolean;
  options: QuestionOption[];
  timeSpentSeconds?: number;
}

export interface QuestionOption {
  id: string;
  optionKey: string;
  content: string;
  displayOrder: number;
}

export interface QuizStatistics {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  passRate: number;
  passingScore: number;
  questionStatistics: QuestionStatistic[];
}

export interface QuestionStatistic {
  questionId: string;
  questionContent: string;
  totalAttempts: number;
  correctAttempts: number;
  correctRate: number;
}

// V3 Response Types
interface BaseQuizResponse {
  id: string;
  title: string;
  description?: string;
  type: 'LESSON_QUIZ' | 'ASSIGNMENT';
  timeLimitMinutes?: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  questionCount: number;
  createdBy: string;
  createdByName: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonQuizResponse extends BaseQuizResponse {
  type: 'LESSON_QUIZ';
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
}

export interface AssignmentQuizResponse extends BaseQuizResponse {
  type: 'ASSIGNMENT';
  courseId: string;
  courseTitle: string;
  startDate?: string;
  endDate?: string;
}

export type QuizResponseV3 = LessonQuizResponse | AssignmentQuizResponse;

export interface QuizAssignmentResponse {
  id: string;
  quizId: string;
  quizTitle: string;
  questionCount: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  assignedAt: string;
  dueDate?: string;
  completedAt?: string;
  attemptCount: number;
  maxAttempts: number;
  bestScore?: number;
  isPassed?: boolean;
}

// ============================================
// Quiz API Service - V3
// ============================================

@Injectable({ providedIn: 'root' })
export class QuizApi {
  private readonly apiClient = inject(ApiClient);

  // ============================================
  // Quiz CRUD Operations
  // ============================================

  /**
   * Create quiz for lesson
   */
  createQuiz(lessonId: string, request: CreateQuizRequest) {
    return this.apiClient.post<QuizResponse>(
      QUIZ_ENDPOINTS.QUIZZES_BY_LESSON(lessonId),
      request
    );
  }

  /**
   * Get quiz by lesson ID
   */
  getQuizByLessonId(lessonId: string) {
    return this.apiClient.get<QuizResponse>(
      QUIZ_ENDPOINTS.QUIZZES_BY_LESSON(lessonId)
    );
  }

  /**
   * Update quiz questions (by quizId)
   */
  updateQuizQuestions(quizId: string, request: UpdateQuizQuestionsRequest) {
    return this.apiClient.put<QuizResponse>(
      QUIZ_ENDPOINTS.QUIZ_QUESTIONS(quizId),
      request
    );
  }

  /**
   * Get quiz questions (by quizId)
   */
  getQuizQuestions(quizId: string) {
    return this.apiClient.get<Question[]>(
      QUIZ_ENDPOINTS.QUIZ_QUESTIONS(quizId)
    );
  }

  /**
   * Add question to existing quiz (by quizId)
   * BE expects: { questionId: UUID, displayOrder: number }
   */
  addQuestionToQuiz(quizId: string, questionId: string, displayOrder: number = 0) {
    return this.apiClient.post<QuizResponse>(
      QUIZ_ENDPOINTS.ADD_QUESTION(quizId),
      { questionId, displayOrder }
    );
  }

  /**
   * Remove question from quiz (by quizId)
   */
  removeQuestionFromQuiz(quizId: string, questionId: string) {
    return this.apiClient.delete<{ message: string }>(
      QUIZ_ENDPOINTS.REMOVE_QUESTION(quizId, questionId)
    );
  }

  /**
   * Update quiz settings
   */
  updateQuizSettings(quizId: string, settings: {
    title?: string;
    timeLimitMinutes?: number | null;
    maxAttempts?: number;
    passingScore?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResultsImmediately?: boolean;
    showCorrectAnswers?: boolean;
  }) {
    return this.apiClient.put<QuizResponse>(
      QUIZ_ENDPOINTS.QUIZ_SETTINGS(quizId),
      settings
    );
  }

  // ============================================
  // Quiz Attempt Operations (Student)
  // ============================================

  /**
   * Start quiz attempt
   */
  startAttempt(quizId: string) {
    return this.apiClient.post<QuizAttemptResponse>(
      QUIZ_ENDPOINTS.START_ATTEMPT(quizId),
      {}
    );
  }

  /**
   * Submit quiz attempt
   * BE expects List<AttemptAnswer> (array), not { answers: Record }
   */
  submitAttempt(attemptId: string, request: SubmitAttemptRequest | AttemptAnswer[]) {
    // Convert Record<questionId, optionId> to AttemptAnswer[] if needed
    const body = Array.isArray(request)
      ? request
      : Object.entries(request.answers).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId
        }));
    return this.apiClient.post<QuizAttemptResponse>(
      QUIZ_ENDPOINTS.SUBMIT_ATTEMPT(attemptId),
      body
    );
  }

  /**
   * Get student attempts for a quiz
   */
  getStudentAttempts(quizId: string) {
    return this.apiClient.get<QuizAttemptResponse[]>(
      QUIZ_ENDPOINTS.QUIZ_ATTEMPTS(quizId)
    );
  }

  /**
   * Get quiz result detail
   */
  getQuizResult(attemptId: string) {
    return this.apiClient.get<QuizResult>(
      QUIZ_ENDPOINTS.ATTEMPT_RESULT(attemptId)
    );
  }

  // ============================================
  // Quiz Management (Teacher)
  // ============================================

  /**
   * Get quiz attempts (for teacher view)
   */
  getQuizAttempts(lessonId: string) {
    return this.apiClient.get<QuizAttemptResponse[]>(
      QUIZ_ENDPOINTS.LESSON_ATTEMPTS(lessonId)
    );
  }

  /**
   * Get quiz statistics
   */
  getQuizStatistics(lessonId: string) {
    return this.apiClient.get<QuizStatistics>(
      QUIZ_ENDPOINTS.QUIZ_STATISTICS(lessonId)
    );
  }

  /**
   * Get all quizzes for teacher
   */
  getTeacherQuizzes() {
    return this.apiClient.get<QuizResponse[]>(
      QUIZ_ENDPOINTS.TEACHER_QUIZZES
    );
  }

  /**
   * Get all assignment quizzes for teacher
   */
  getTeacherAssignments(): Observable<AssignmentQuizResponse[]> {
    return this.apiClient.get<AssignmentQuizResponse[]>(
      QUIZ_ENDPOINTS.TEACHER_ASSIGNMENTS
    );
  }

  // ============================================
  // Quiz Assignments
  // ============================================

  /**
   * Assign quiz to students
   */
  assignQuizToStudents(quizId: string, request: AssignQuizRequest): Observable<QuizAssignmentResponse[]> {
    return this.apiClient.post<QuizAssignmentResponse[]>(
      QUIZ_ENDPOINTS.QUIZ_ASSIGNMENTS(quizId),
      request
    );
  }

  /**
   * Get quiz assignments
   */
  getQuizAssignments(quizId: string): Observable<QuizAssignmentResponse[]> {
    return this.apiClient.get<QuizAssignmentResponse[]>(
      QUIZ_ENDPOINTS.QUIZ_ASSIGNMENTS(quizId)
    );
  }

  // ============================================
  // Quiz Auto-populate & Sample Questions
  // ============================================

  /**
   * Auto-populate quiz with available questions
   */
  autoPopulateQuizQuestions(lessonId: string) {
    return this.apiClient.post<any>(
      QUIZ_ENDPOINTS.AUTO_POPULATE(lessonId),
      {}
    );
  }

  /**
   * Create sample questions for quiz
   */
  createSampleQuestions(lessonId: string) {
    return this.apiClient.post<any>(
      QUIZ_ENDPOINTS.CREATE_SAMPLE(lessonId),
      {}
    );
  }

  // ============================================
  // V3 DDD API Methods
  // ============================================

  /**
   * Create lesson-bound quiz (V3 DDD API)
   */
  createLessonQuizV3(lessonId: string, request: CreateLessonQuizRequest): Observable<LessonQuizResponse> {
    return this.apiClient.post<LessonQuizResponse>(
      `/api/v3/quizzes/lessons/${lessonId}`,
      request
    );
  }

  /**
   * Create section-bound quiz (V3 DDD API)
   */
  createSectionQuiz(sectionId: string, request: CreateLessonQuizRequest): Observable<LessonQuizResponse> {
    return this.apiClient.post<LessonQuizResponse>(
      `/api/v3/quizzes/sections/${sectionId}`,
      request
    );
  }

  /**
   * Create assignment quiz (V3 DDD API)
   */
  createAssignmentQuizV3(courseId: string, request: CreateAssignmentQuizRequest): Observable<AssignmentQuizResponse> {
    return this.apiClient.post<AssignmentQuizResponse>(
      `/api/v3/quizzes/courses/${courseId}`,
      request
    );
  }
}
