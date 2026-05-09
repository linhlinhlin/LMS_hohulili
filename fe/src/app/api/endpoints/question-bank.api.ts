import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '../client/api-client';
import {
  QuestionBankDTO,
  QuestionBankCategoryDTO,
  CreateBankRequest,
  UpdateBankRequest,
  AddCategoryRequest,
  UpdateCategoryRequest,
  MoveBankQuestionsRequest,
  BankQuestionDTO
} from '../types/question-bank.types';

@Injectable({ providedIn: 'root' })
export class QuestionBankApi {
  private readonly apiClient = inject(ApiClient);

  // ============ Bank CRUD ============

  getMyBanks(): Observable<QuestionBankDTO[]> {
    return this.apiClient.get<any>('/api/v3/question-banks/my-banks').pipe(
      map((response: any) => (response?.data ?? response) || [])
    );
  }

  getBankById(id: string): Observable<QuestionBankDTO> {
    return this.apiClient.get<any>(`/api/v3/question-banks/${id}`).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  createBank(request: CreateBankRequest): Observable<QuestionBankDTO> {
    return this.apiClient.post<any>('/api/v3/question-banks', request).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  updateBank(id: string, request: UpdateBankRequest): Observable<QuestionBankDTO> {
    return this.apiClient.put<any>(`/api/v3/question-banks/${id}`, request).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  archiveBank(id: string): Observable<void> {
    return this.apiClient.post<any>(`/api/v3/question-banks/${id}/archive`, {}).pipe(
      map(() => void 0)
    );
  }

  searchBanks(query: string): Observable<QuestionBankDTO[]> {
    return this.apiClient.get<any>('/api/v3/question-banks/search', {
      params: { query }
    }).pipe(
      map((response: any) => (response?.data ?? response) || [])
    );
  }

  // ============ Category CRUD ============

  getCategoryTree(bankId: string): Observable<QuestionBankCategoryDTO[]> {
    return this.apiClient.get<any>(`/api/v3/question-banks/${bankId}/categories`).pipe(
      map((response: any) => (response?.data ?? response) || [])
    );
  }

  addCategory(bankId: string, request: AddCategoryRequest): Observable<QuestionBankCategoryDTO> {
    return this.apiClient.post<any>(`/api/v3/question-banks/${bankId}/categories`, request).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  updateCategory(catId: string, request: UpdateCategoryRequest): Observable<QuestionBankCategoryDTO> {
    return this.apiClient.put<any>(`/api/v3/question-banks/categories/${catId}`, request).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  deleteCategory(catId: string): Observable<void> {
    return this.apiClient.delete<any>(`/api/v3/question-banks/categories/${catId}`).pipe(
      map(() => void 0)
    );
  }

  // ============ Questions ============

  getBankQuestions(bankId: string, categoryId?: string): Observable<BankQuestionDTO[]> {
    const params: any = {};
    if (categoryId) params.categoryId = categoryId;

    return this.apiClient.get<any>(`/api/v3/question-banks/${bankId}/questions`, { params }).pipe(
      map((response: any) => (response?.data ?? response) || [])
    );
  }

  moveQuestions(request: MoveBankQuestionsRequest): Observable<void> {
    return this.apiClient.post<any>('/api/v3/question-banks/move-questions', request).pipe(
      map(() => void 0)
    );
  }

  copyQuestionsToBank(questionIds: string[], targetBankId: string, targetCategoryId?: string): Observable<{ copiedCount: number; targetBankId: string }> {
    return this.apiClient.post<any>('/api/v3/question-banks/copy-questions', {
      questionIds,
      targetBankId,
      targetCategoryId: targetCategoryId || undefined
    }).pipe(map((r: any) => r?.data ?? r));
  }

  getPublicBanks(): Observable<QuestionBankDTO[]> {
    return this.apiClient.get<any>('/api/v3/question-banks/public').pipe(
      map((response: any) => (response?.data ?? response) || [])
    );
  }

  searchPublicBanks(query: string): Observable<QuestionBankDTO[]> {
    return this.apiClient.get<any>('/api/v3/question-banks/search', {
      params: { query: query || '' }
    }).pipe(
      map((response: any) => (response?.data ?? response) || [])
    );
  }

  assignQuestionCategory(questionId: string, bankId: string, categoryId: string | null): Observable<void> {
    return this.apiClient.post<any>('/api/v3/question-banks/move-questions', {
      questionIds: [questionId],
      targetBankId: bankId,
      targetCategoryId: categoryId || undefined
    }).pipe(map(() => void 0));
  }

  getImoStats(bankId: string): Observable<{
    stats: { imoCourseId: number | null; code: string | null; title: string; count: number }[];
    totalQuestions: number;
    coursesWithQuestions: number;
    totalCourses: number;
  }> {
    return this.apiClient.get<any>(`/api/v3/question-banks/${bankId}/imo-stats`)
      .pipe(map((r: any) => r?.data ?? r));
  }
}
