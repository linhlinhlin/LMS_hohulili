import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';
import { Question } from './question.api';

export interface UpdateQuizQuestionsRequest {
  questionIds: string[];
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

@Injectable({ providedIn: 'root' })
export class QuizApi {
  private readonly apiClient = inject(ApiClient);

  updateQuizQuestions(lessonId: string, request: UpdateQuizQuestionsRequest) {
    return this.apiClient.put<QuizResponse>(
      `/quizzes/lessons/${lessonId}/questions`,
      request
    );
  }

  getQuizByLessonId(lessonId: string) {
    return this.apiClient.get<QuizResponse>(`/quizzes/lessons/${lessonId}`);
  }

  getQuizQuestions(lessonId: string) {
    return this.apiClient.get<Question[]>(`/quizzes/lessons/${lessonId}/questions`);
  }
}
