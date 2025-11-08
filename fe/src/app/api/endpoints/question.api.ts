import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';

export interface QuestionOption {
  id: string;
  optionKey: string;
  content: string;
  displayOrder: number;
}

export interface UserSummary {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  enabled: boolean;
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
  createdBy: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface GetQuestionsByIdsRequest {
  questionIds: string[];
}

export interface CreateQuestionRequest {
  content: string;
  correctOption: string;
  options: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string;
  courseId?: string;  // Optional courseId
}

export interface UpdateQuestionRequest {
  content: string;
  correctOption: string;
  options: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

@Injectable({ providedIn: 'root' })
export class QuestionApi {
  private readonly apiClient = inject(ApiClient);

  getQuestionsByIds(request: GetQuestionsByIdsRequest) {
    return this.apiClient.post<Question[]>('/api/v1/questions/by-ids', request);
  }

  getQuestions(status?: string, difficulty?: string, tags?: string) {
    const params: any = {};
    if (status) params.status = status;
    if (difficulty) params.difficulty = difficulty;
    if (tags) params.tags = tags;
    
    return this.apiClient.get<Question[]>('/api/v1/questions', { params });
  }

  getQuestionById(id: string) {
    return this.apiClient.get<Question>(`/api/v1/questions/${id}`);
  }

  getMyQuestions(status?: string) {
    const params: any = {};
    if (status) params.status = status;
    return this.apiClient.get<Question[]>('/api/v1/questions/my-questions', { params });
  }

  createQuestion(request: CreateQuestionRequest) {
    return this.apiClient.post<Question>('/api/v1/questions', request);
  }

  updateQuestion(id: string, request: UpdateQuestionRequest) {
    return this.apiClient.put<Question>(`/api/v1/questions/${id}`, request);
  }

  deleteQuestion(id: string) {
    return this.apiClient.delete<{ message: string }>(`/api/v1/questions/${id}`);
  }

  // Get questions by course
  getQuestionsByCourse(courseId: string, status?: string) {
    const params: any = {};
    if (status) params.status = status;
    return this.apiClient.get<{success: boolean; data: Question[]; message?: string}>(`/api/v1/questions/course/${courseId}`, { params });
  }

  // NEW: Get my questions in a specific course
  getMyQuestionsInCourse(courseId: string, status?: string) {
    const params: any = {};
    if (status) params.status = status;
    return this.apiClient.get<Question[]>(`/api/v1/questions/course/${courseId}/user`, { params });
  }
}
