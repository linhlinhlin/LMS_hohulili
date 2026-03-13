import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';
import { map } from 'rxjs/operators';

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

export type QuestionTypeEnum = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'SHORT_ANSWER' | 'ESSAY';

export interface Question {
  id: string;
  content: string;
  questionType: QuestionTypeEnum;
  correctOption: string | null;
  answerKey: Record<string, unknown> | null;
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
  questionType?: QuestionTypeEnum;
  correctOption?: string;
  answerKey?: Record<string, unknown>;
  options: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string;
  courseId?: string;
  packageId?: string;
  categoryId?: string;
  blocks?: any[];
  optionBlocks?: any[];
}

export interface CreateQuestionResponse {
  id: string;
}

export interface UpdateQuestionRequest {
  content: string;
  questionType?: QuestionTypeEnum;
  correctOption?: string;
  answerKey?: Record<string, unknown>;
  options: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  blocks?: any[];
  optionBlocks?: any[];
}

@Injectable({ providedIn: 'root' })
export class QuestionApi {
  private readonly apiClient = inject(ApiClient);

  getQuestionsByIds(request: GetQuestionsByIdsRequest) {
    return this.apiClient.post<Question[]>('/api/v3/questions/by-ids', request);
  }

  getQuestions(status?: string, difficulty?: string, tags?: string) {
    const params: any = {};
    if (status) params.status = status;
    if (difficulty) params.difficulty = difficulty;
    if (tags) params.tags = tags;

    return this.apiClient.get<Question[]>('/api/v3/questions', { params });
  }

  getQuestionById(id: string) {
    return this.apiClient.get<{ success: boolean; data: Question; message?: string }>(`/api/v3/questions/${id}`)
      .pipe(
        map((response: any) => {
          if (response && response.data) {
            return response.data as Question;
          }
          return response as Question;
        })
      );
  }

  getMyQuestions(status?: string) {
    const params: any = {};
    if (status) params.status = status;
    return this.apiClient.get<{ success: boolean; data: Question[]; message?: string }>('/api/v3/questions/my-questions', { params })
      .pipe(
        map((response: any) => {
          if (response && response.data) {
            return response.data;
          }
          return [];
        })
      );
  }

  createQuestion(request: CreateQuestionRequest) {
    return this.apiClient
      .post<any>('/api/v3/questions', request)
      .pipe(
        map((response: any) => {
          if (typeof response === 'string') {
            return { id: response } as CreateQuestionResponse;
          }

          if (typeof response?.data === 'string') {
            return { id: response.data } as CreateQuestionResponse;
          }

          if (response?.data?.id) {
            return { id: response.data.id } as CreateQuestionResponse;
          }

          if (response?.id) {
            return { id: response.id } as CreateQuestionResponse;
          }

          throw new Error('Unexpected create question response shape');
        })
      );
  }

  updateQuestion(id: string, request: UpdateQuestionRequest) {
    return this.apiClient.put<Question>(`/api/v3/questions/${id}`, request);
  }

  deleteQuestion(id: string) {
    return this.apiClient.delete<{ message: string }>(`/api/v3/questions/${id}`);
  }

  // Get questions by course
  getQuestionsByCourse(courseId: string, status?: string) {
    const params: any = {};
    if (status) params.status = status;
    return this.apiClient.get<{ success: boolean; data: Question[]; message?: string }>(`/api/v3/questions/course/${courseId}`, { params });
  }

  // Import questions from Excel file
  importFromExcel(file: File, packageId: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('packageId', packageId);
    formData.append('difficulty', difficulty);

    return this.apiClient.post<QuestionImportResult>('/api/v3/questions/import/excel', formData)
      .pipe(
        map((response: any) => {
          const result = response?.data || response;
          // Ensure errors array exists to prevent null pointer
          return {
            ...result,
            errors: result.errors || []
          } as QuestionImportResult;
        })
      );
  }
}

// Import result interface
export interface QuestionImportResult {
  successCount: number;
  failedCount: number;
  totalProcessed: number;
  errors: string[];
  message: string;
}
