import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../client/api-client';

export interface RubricDTO {
  id: string;
  teacherId: string | null;
  assignmentId: string | null;
  title: string;
  description: string | null;
  maxPoints: number;
  criteria: RubricCriterionDTO[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RubricCriterionDTO {
  name: string;
  description: string | null;
  maxPoints: number | null;
  levels: RubricLevelDTO[];
}

export interface RubricLevelDTO {
  label: string;
  description: string | null;
  points: number | null;
}

export interface CreateRubricRequest {
  title: string;
  description?: string;
  maxPoints?: number;
  criteria: {
    name: string;
    description?: string;
    maxPoints?: number;
    levels: { label: string; description?: string; points?: number }[];
  }[];
}

export interface UpdateRubricRequest extends CreateRubricRequest {}

const BASE = '/api/v3/rubrics';

@Injectable({ providedIn: 'root' })
export class RubricApi {
  private api = inject(ApiClient);

  list(): Observable<any> {
    return this.api.get(BASE);
  }

  getById(id: string): Observable<any> {
    return this.api.get(`${BASE}/${id}`);
  }

  create(request: CreateRubricRequest): Observable<any> {
    return this.api.post(BASE, request);
  }

  update(id: string, request: UpdateRubricRequest): Observable<any> {
    return this.api.put(`${BASE}/${id}`, request);
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`${BASE}/${id}`);
  }

  assignToAssignment(rubricId: string, assignmentId: string): Observable<any> {
    return this.api.post(`${BASE}/${rubricId}/assign/${assignmentId}`, {});
  }

  getByAssignment(assignmentId: string): Observable<any> {
    return this.api.get(`${BASE}/assignment/${assignmentId}`);
  }
}
