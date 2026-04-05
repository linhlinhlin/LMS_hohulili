import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';
import { Question } from './question.api';
import { Observable, catchError, map } from 'rxjs';
import { QUIZ_ENDPOINTS } from './quiz.endpoints';

export type QuizAssessmentType = 'PRACTICE' | 'ASSESSMENT' | 'EXAM';

// ============================================
// Request DTOs
// ============================================

export interface CreateQuizRequest {
  title?: string;
  quizType?: QuizAssessmentType;
  countsTowardCertificate?: boolean;
  questionIds: string[];
  timeLimitMinutes?: number;
  maxAttempts?: number;
  passingScore?: number;
  maxScoreScale?: number;
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

// BE expects List<AttemptAnswer> with { questionId, selectedOption, studentAnswer }
export interface AttemptAnswer {
  questionId: string;
  selectedOption?: string;                    // Legacy: single choice
  selectedOptionId?: string;                  // Legacy alias
  studentAnswer?: Record<string, unknown>;    // New: flexible answer format
}

export interface CreateLessonQuizRequest {
  title: string;
  description?: string;
  quizType?: QuizAssessmentType;
  countsTowardCertificate?: boolean;
  timeLimitMinutes?: number;
  maxAttempts: number;
  passingScore: number;
  maxScoreScale?: number;
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
  quizType?: QuizAssessmentType;
  countsTowardCertificate?: boolean;
  timeLimitMinutes?: number;
  maxAttempts: number;
  passingScore: number;
  maxScoreScale?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  startDate?: string;
  endDate?: string;
  chapterId?: string;
  classId?: string;
  questionIds: string[];
  publishImmediately: boolean;
}

// ============================================
// Response DTOs
// ============================================

export interface QuizResponse {
  id: string;
  lessonId: string;
  title?: string;
  description?: string;
  quizType?: QuizAssessmentType;
  countsTowardCertificate?: boolean;
  allowOffline?: boolean;
  assignmentScope?: 'LESSON' | 'COURSE' | 'CLASS';
  courseId?: string;
  courseTitle?: string;
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED' | string;
  classId?: string;
  className?: string;
  assignedAt?: string | null;
  questionIds?: string;
  timeLimitMinutes: number;
  maxAttempts: number;
  passingScore: number;
  maxScoreScale?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  availableFrom?: string | null;
  dueAt?: string | null;
  lockAt?: string | null;
  status?: string;
  questionCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  startDate?: string;
  endDate?: string;
}

export interface QuizAttemptResponse {
  id: string;
  quizId: string;
  studentId?: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'TIMEOUT' | 'EXPIRED';
  startTime: string;
  endTime?: string;
  createdAt?: string;
  timeSpentSeconds?: number;
  score?: number;
  maxScore?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  isPassed?: boolean;
}

export interface SectionQuizResponse {
  id: string;
  quizId: string;
  lessonId: string;
  sectionId: string;
  title: string;
  quizType?: QuizAssessmentType;
  countsTowardCertificate?: boolean;
  allowOffline?: boolean;
  timeLimitMinutes?: number | null;
  maxAttempts: number;
  passingScore: number;
  maxScoreScale?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  questionCount: number;
  questions: Question[];
}

export interface SectionQuizSubmitResponse {
  id: string;
  quizId: string;
  lessonId: string;
  sectionId: string;
  quizType?: QuizAssessmentType;
  countsTowardCertificate?: boolean;
  status: 'SUBMITTED';
  score?: number | null;
  correctAnswers?: number | null;
  totalQuestions: number;
  isPassed?: boolean | null;
  items?: Array<Record<string, unknown>>;
  message?: string | null;
  submittedAt?: string;
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
  quizType?: QuizAssessmentType;
  countsTowardCertificate?: boolean;
  allowOffline?: boolean;
  assignmentScope?: 'LESSON' | 'COURSE' | 'CLASS';
  classId?: string;
  className?: string;
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED' | string;
  timeLimitMinutes?: number;
  maxAttempts: number;
  passingScore: number;
  maxScoreScale?: number;
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
  classId?: string;
  className?: string;
  startDate?: string;
  endDate?: string;
}

export type QuizResponseV3 = LessonQuizResponse | AssignmentQuizResponse;

// ============================================
// Quiz API Service - V3
// ============================================

@Injectable({ providedIn: 'root' })
export class QuizApi {
  private readonly apiClient = inject(ApiClient);

  private unwrapApiData<T>(response: T | { data?: T }): T {
    return ((response as any)?.data ?? response) as T;
  }

  private pickPrimaryQuiz(response: QuizResponse | QuizResponse[] | { data?: QuizResponse | QuizResponse[] }): QuizResponse {
    const payload = this.unwrapApiData(response as any);
    const quizzes = Array.isArray(payload) ? [...payload] : payload ? [payload] : [];

    if (quizzes.length === 0) {
      throw new Error('Quiz không tồn tại hoặc chưa được tạo cho bài học này');
    }

    return quizzes.sort((left, right) => {
      const leftTime = Date.parse(left.createdAt ?? '') || 0;
      const rightTime = Date.parse(right.createdAt ?? '') || 0;
      return rightTime - leftTime;
    })[0];
  }

  private normalizeQuestionList(response: Question[] | { data?: Question[] }): Question[] {
    const payload = this.unwrapApiData(response as any);
    return Array.isArray(payload) ? payload : [];
  }

  // ============================================
  // Quiz CRUD Operations
  // ============================================

  /**
   * Get quiz by ID
   */
  getQuizById(quizId: string) {
    return this.apiClient.get<QuizResponse | { data?: QuizResponse }>(
      QUIZ_ENDPOINTS.QUIZ_BY_ID(quizId)
    ).pipe(
      map(response => this.pickPrimaryQuiz(response as any))
    );
  }

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
    return this.apiClient.get<QuizResponse[] | { data?: QuizResponse[] }>(
      QUIZ_ENDPOINTS.QUIZZES_BY_LESSON(lessonId)
    ).pipe(
      map(response => this.pickPrimaryQuiz(response as any))
    );
  }

  getQuizByReference(referenceId: string) {
    return this.getQuizById(referenceId).pipe(
      catchError(() => this.getQuizByLessonId(referenceId))
    );
  }

  getSectionQuiz(lessonId: string, sectionId: string) {
    return this.apiClient.get<SectionQuizResponse | { data?: SectionQuizResponse }>(
      QUIZ_ENDPOINTS.SECTION_QUIZ(lessonId, sectionId)
    ).pipe(
      map(response => this.unwrapApiData(response as any))
    );
  }

  resolveQuizIdByLessonId(lessonId: string) {
    return this.getQuizByLessonId(lessonId).pipe(
      map(quiz => quiz.id)
    );
  }

  resolveQuizId(referenceId: string) {
    return this.getQuizByReference(referenceId).pipe(
      map(quiz => quiz.id)
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
    return this.apiClient.get<Question[] | { data?: Question[] }>(
      QUIZ_ENDPOINTS.QUIZ_QUESTIONS(quizId)
    ).pipe(
      map(response => this.normalizeQuestionList(response as any))
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
    quizType?: QuizAssessmentType;
    countsTowardCertificate?: boolean;
    timeLimitMinutes?: number | null;
    maxAttempts?: number;
    passingScore?: number;
    maxScoreScale?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResultsImmediately?: boolean;
    showCorrectAnswers?: boolean;
    accessPassword?: string | null;
    /** ISO 8601 UTC — when students may first access the quiz */
    availableFrom?: string | null;
    /** ISO 8601 UTC — soft deadline shown to students */
    dueAt?: string | null;
    /** ISO 8601 UTC — hard cutoff; no new attempts accepted after this */
    lockAt?: string | null;
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
   * Get quiz preflight info (confirmation screen + resume check)
   */
  getAttemptPreflight(quizId: string) {
    return this.apiClient.get<any>(
      QUIZ_ENDPOINTS.ATTEMPT_PREFLIGHT(quizId)
    ).pipe(
      map(response => this.unwrapApiData(response as any))
    );
  }

  /**
   * Start quiz attempt
   */
  startAttempt(quizId: string, accessPassword?: string) {
    return this.apiClient.post<QuizAttemptResponse>(
      QUIZ_ENDPOINTS.START_ATTEMPT(quizId),
      accessPassword ? { accessPassword } : {}
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
      : Object.entries(request.answers).map(([questionId, selectedOption]) => ({
          questionId,
          selectedOption,
          studentAnswer: { selectedOption }
        }));
    return this.apiClient.post<QuizAttemptResponse>(
      QUIZ_ENDPOINTS.SUBMIT_ATTEMPT(attemptId),
      body
    );
  }

  submitSectionQuiz(lessonId: string, sectionId: string, answers: AttemptAnswer[]) {
    return this.apiClient.post<SectionQuizSubmitResponse | { data?: SectionQuizSubmitResponse }>(
      QUIZ_ENDPOINTS.SUBMIT_SECTION_QUIZ(lessonId, sectionId),
      answers
    ).pipe(
      map(response => this.unwrapApiData(response as any))
    );
  }

  /**
   * Save attempt progress (auto-save every 60s)
   */
  saveAttemptProgress(attemptId: string, answers: AttemptAnswer[]) {
    return this.apiClient.put<void>(
      QUIZ_ENDPOINTS.SAVE_ATTEMPT(attemptId),
      answers
    );
  }

  /**
   * Get student attempts for a quiz (paginated)
   */
  getStudentAttempts(quizId: string, page = 0, size = 20) {
    return this.apiClient.get<{ content: QuizAttemptResponse[]; totalElements: number; totalPages: number }>(
      `${QUIZ_ENDPOINTS.QUIZ_ATTEMPTS(quizId)}?page=${page}&size=${size}`
    );
  }

  /**
   * Get all attempts for current student across all quizzes (paginated)
   */
  getMyAttempts(page = 0, size = 20) {
    return this.apiClient.get<{ content: QuizAttemptResponse[]; totalElements: number; totalPages: number }>(
      `${QUIZ_ENDPOINTS.STUDENT_ATTEMPTS}?page=${page}&size=${size}`
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

  /**
   * Manual grade a question in an attempt (teacher essay grading)
   */
  manualGradeQuestion(attemptId: string, questionId: string, score: number, feedback?: string) {
    return this.apiClient.patch<QuizResult>(
      QUIZ_ENDPOINTS.MANUAL_GRADE(attemptId),
      { questionId, score, feedback }
    );
  }

  /**
   * Get enrolled students for a quiz (teacher — shows who hasn't taken it)
   */
  getEnrolledStudents(quizId: string) {
    return this.apiClient.get<{ enrolledStudents: any[]; enrolledCount: number; attemptedCount: number }>(
      QUIZ_ENDPOINTS.ENROLLED_STUDENTS(quizId)
    );
  }

  /**
   * Delete a student's quiz attempt (teacher moderation)
   */
  deleteAttempt(attemptId: string) {
    return this.apiClient.delete<void>(
      QUIZ_ENDPOINTS.ATTEMPT_RESULT(attemptId)
    );
  }

  // ============================================
  // Quiz Management (Teacher)
  // ============================================

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
   * Delete a quiz
   */
  deleteQuiz(quizId: string) {
    return this.apiClient.delete<void>(
      QUIZ_ENDPOINTS.DELETE_QUIZ(quizId)
    );
  }

  /**
   * Publish a quiz
   */
  publishQuiz(quizId: string) {
    return this.apiClient.post<void>(
      QUIZ_ENDPOINTS.PUBLISH_QUIZ(quizId),
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
   * Create chapter-anchored quiz lesson (V3 DDD API)
   */
  createChapterQuiz(chapterId: string, request: CreateLessonQuizRequest): Observable<LessonQuizResponse> {
    return this.apiClient.post<LessonQuizResponse>(
      `/api/v3/quizzes/chapters/${chapterId}`,
      request
    );
  }

  /**
   * Create assignment quiz (V3 DDD API)
   */
  createCourseQuizV3(courseId: string, request: CreateAssignmentQuizRequest): Observable<AssignmentQuizResponse> {
    return this.apiClient.post<AssignmentQuizResponse>(
      `/api/v3/quizzes/courses/${courseId}`,
      request
    );
  }

  createAssignmentQuizV3(courseId: string, request: CreateAssignmentQuizRequest): Observable<AssignmentQuizResponse> {
    return this.createCourseQuizV3(courseId, request);
  }
}
