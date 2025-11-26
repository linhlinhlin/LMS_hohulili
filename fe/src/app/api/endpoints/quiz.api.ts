import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';
import { Question } from './question.api';
import { Observable } from 'rxjs';

export interface CreateQuizRequest {
  title?: string; // Optional title for quiz
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

// ============================================
// V2 API - DDD Approach (NEW)
// ============================================

// ========== REQUEST DTOs ==========

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
  startDate?: string;  // Only for Assignment
  endDate?: string;    // Only for Assignment
  questionIds: string[];
  publishImmediately: boolean;
}

export interface AssignQuizRequest {
  studentIds: string[];
  dueDate?: string;
}

// ========== RESPONSE DTOs (Type-Safe with Union Types) ==========

// Base Interface
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

// Lesson Quiz Response (lessonId is mandatory)
export interface LessonQuizResponse extends BaseQuizResponse {
  type: 'LESSON_QUIZ';
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
}

// Assignment Quiz Response (courseId, dates are specific)
export interface AssignmentQuizResponse extends BaseQuizResponse {
  type: 'ASSIGNMENT';
  courseId: string;
  courseTitle: string;
  startDate?: string;
  endDate?: string;
}

// Union Type for type-safe handling
export type QuizResponseV2 = LessonQuizResponse | AssignmentQuizResponse;

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

@Injectable({ providedIn: 'root' })
export class QuizApi {
  private readonly apiClient = inject(ApiClient);

  // ============================================
  // V1 API Methods (Legacy - Backward Compatible)
  // ============================================

  // Create quiz for lesson
  createQuiz(lessonId: string, request: CreateQuizRequest) {
    return this.apiClient.post<QuizResponse>(`/api/v1/quizzes/lessons/${lessonId}`, request);
  }

  // Update quiz questions
  updateQuizQuestions(lessonId: string, request: UpdateQuizQuestionsRequest) {
    return this.apiClient.put<QuizResponse>(`/api/v1/quizzes/lessons/${lessonId}/questions`, request);
  }

  // Get quiz by lesson ID
  getQuizByLessonId(lessonId: string) {
    return this.apiClient.get<QuizResponse>(`/api/v1/quizzes/lessons/${lessonId}`);
  }

  // Get quiz questions
  getQuizQuestions(lessonId: string) {
    return this.apiClient.get<Question[]>(`/api/v1/quizzes/lessons/${lessonId}/questions`);
  }

  // Start quiz attempt
  startAttempt(lessonId: string) {
    return this.apiClient.post<QuizAttemptResponse>(`/api/v1/quizzes/${lessonId}/attempts`, {});
  }

  // Submit quiz attempt
  submitAttempt(attemptId: string, request: SubmitAttemptRequest) {
    return this.apiClient.post<QuizAttemptResponse>(`/api/v1/quizzes/attempts/${attemptId}/submit`, request);
  }

  // Get student attempts
  getStudentAttempts(lessonId: string) {
    return this.apiClient.get<QuizAttemptResponse[]>(`/api/v1/quizzes/${lessonId}/attempts`);
  }

  // Get quiz attempts (for teacher)
  getQuizAttempts(lessonId: string) {
    return this.apiClient.get<QuizAttemptResponse[]>(`/api/v1/quizzes/lessons/${lessonId}/attempts`);
  }

  // Get quiz result detail
  getQuizResult(attemptId: string) {
    return this.apiClient.get<QuizResult>(`/api/v1/quizzes/attempts/${attemptId}/result`);
  }

  // Get quiz statistics
  getQuizStatistics(lessonId: string) {
    return this.apiClient.get<QuizStatistics>(`/api/v1/quizzes/lessons/${lessonId}/statistics`);
  }

  // Get all quizzes for teacher
  getTeacherQuizzes() {
    return this.apiClient.get<QuizResponse[]>(`/api/v1/quizzes/teacher/quizzes`);
  }

  // Add question to existing quiz
  addQuestionToQuiz(lessonId: string, questionId: string) {
    const requestBody = { questionId: questionId };
    console.log('🔍 addQuestionToQuiz API call:');
    console.log('   lessonId:', lessonId);
    console.log('   questionId:', questionId);
    console.log('   requestBody:', JSON.stringify(requestBody));
    console.log('   requestBody type:', typeof requestBody);
    console.log('   questionId type:', typeof questionId);
    return this.apiClient.post<QuizResponse>(`/api/v1/quizzes/lessons/${lessonId}/questions/add`, requestBody);
  }

  // Update quiz settings
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
    return this.apiClient.put<QuizResponse>(`/api/v1/quizzes/${quizId}/settings`, settings);
  }

  // Remove question from quiz
  removeQuestionFromQuiz(lessonId: string, questionId: string) {
    return this.apiClient.delete<{ message: string }>(`/api/v1/quizzes/lessons/${lessonId}/questions/${questionId}`);
  }

  // ============================================
  // V2 API Methods - DDD Approach
  // ============================================

  /**
   * Create lesson-bound quiz (v2 API)
   * @param lessonId - Lesson ID
   * @param request - Quiz creation request
   * @returns Observable of LessonQuizResponse
   */
  createLessonQuizV2(lessonId: string, request: CreateLessonQuizRequest): Observable<LessonQuizResponse> {
    return this.apiClient.post<LessonQuizResponse>(
      `/api/v2/quizzes/lessons/${lessonId}`,
      request
    );
  }

  /**
   * Create assignment quiz (v2 API)
   * @param courseId - Course ID
   * @param request - Quiz creation request
   * @returns Observable of AssignmentQuizResponse
   */
  createAssignmentQuizV2(courseId: string, request: CreateAssignmentQuizRequest): Observable<AssignmentQuizResponse> {
    return this.apiClient.post<AssignmentQuizResponse>(
      `/api/v2/quizzes/courses/${courseId}`,
      request
    );
  }

  /**
   * Assign quiz to students
   * @param quizId - Quiz ID
   * @param request - Assignment request with student IDs and due date
   * @returns Observable of QuizAssignmentResponse array
   */
  assignQuizToStudents(quizId: string, request: AssignQuizRequest): Observable<QuizAssignmentResponse[]> {
    return this.apiClient.post<QuizAssignmentResponse[]>(
      `/api/v1/quizzes/${quizId}/assignments`,
      request
    );
  }

  /**
   * Get quiz assignments for a quiz
   * @param quizId - Quiz ID
   * @returns Observable of QuizAssignmentResponse array
   */
  getQuizAssignments(quizId: string): Observable<QuizAssignmentResponse[]> {
    return this.apiClient.get<QuizAssignmentResponse[]>(
      `/api/v1/quizzes/${quizId}/assignments`
    );
  }

  /**
   * Get all assignment quizzes for teacher
   * @returns Observable of AssignmentQuizResponse array
   */
  getTeacherAssignments(): Observable<AssignmentQuizResponse[]> {
    return this.apiClient.get<AssignmentQuizResponse[]>(
      `/api/v2/quizzes/assignments`
    );
  }

  /**
   * Auto-populate quiz with available questions
   * @param lessonId - Lesson ID
   * @returns Observable of result
   */
  autoPopulateQuizQuestions(lessonId: string) {
    return this.apiClient.post<any>(
      `/api/v1/quizzes/lessons/${lessonId}/auto-populate-questions`,
      {}
    );
  }

  /**
   * Create sample questions for quiz
   * @param lessonId - Lesson ID
   * @returns Observable of result
   */
  createSampleQuestions(lessonId: string) {
    return this.apiClient.post<any>(
      `/api/v1/quizzes/lessons/${lessonId}/create-sample-questions`,
      {}
    );
  }
}
