import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';

export interface QuestionOption {
  id: string;
  optionKey: string;
  content: string;
  displayOrder: number;
}

export interface Question {
  id: string;
  content: string;
  correctOption: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  options: QuestionOption[];
  usageCount: number;
  correctRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetQuestionsByIdsRequest {
  questionIds: string[];
}

@Injectable({ providedIn: 'root' })
export class QuestionApi {
  private readonly apiClient = inject(ApiClient);

  getQuestionsByIds(request: GetQuestionsByIdsRequest) {
    return this.apiClient.post<Question[]>('/questions/by-ids', request);
  }

  getQuestions(status?: string, difficulty?: string, tags?: string) {
    const params: any = {};
    if (status) params.status = status;
    if (difficulty) params.difficulty = difficulty;
    if (tags) params.tags = tags;
    
    return this.apiClient.get<Question[]>('/questions', { params });
  }

  getQuestionById(id: string) {
    return this.apiClient.get<Question>(`/questions/${id}`);
  }
}
