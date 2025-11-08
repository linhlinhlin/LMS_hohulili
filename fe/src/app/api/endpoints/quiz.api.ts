import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';
import { Question } from './question.api';
import { Observable } from 'rxjs';

export interface CreateQuizRequest {
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

@Injectable({ providedIn: 'root' })
export class QuizApi {
  private readonly apiClient = inject(ApiClient);

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
    return this.apiClient.post<QuizResponse>(`/api/v1/quizzes/lessons/${lessonId}/questions/add`, { questionId });
  }
}
