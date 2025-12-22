import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/common.types';

export type DistributionType = 'ALL_STUDENTS' | 'SPECIFIC_STUDENTS';

export interface CreateAllocationRequest {
  distributionType: DistributionType;
  studentIds?: string[];
  isIndividual?: boolean;
}

export interface AssignIndividualRequest {
  studentId: string;
  customDeadline?: string; // ISO string
  note?: string;
}

export interface UpdateDeadlineRequest {
  newDeadline: string; // ISO string
}

export interface AllocatedStudentInfo {
  studentId: string;
  studentName: string;
  customDeadline?: string;
  note?: string;
  assignedAt: string;
}

export interface AllocationResponse {
  id?: string;
  assignmentId: string;
  distributionType: DistributionType;
  isIndividual: boolean;
  studentIds?: string[];
  allocatedStudents?: AllocatedStudentInfo[];
  createdAt?: string;
}

export interface AllocationStatsResponse {
  totalAllocated: number;
  distributionType: string;
  isIndividual: boolean;
}

/**
 * API client for Assignment Allocation endpoints
 */
@Injectable({ providedIn: 'root' })
export class AllocationApi {
  private api = inject(ApiClient);

  /**
   * Create or update allocation for an assignment
   */
  createOrUpdateAllocation(assignmentId: string, request: CreateAllocationRequest): Observable<ApiResponse<AllocationResponse>> {
    return this.api.postWithResponse<AllocationResponse>(
      `/api/v3/assignments/${assignmentId}/allocation`,
      request
    );
  }

  /**
   * Get allocation for an assignment
   */
  getAllocation(assignmentId: string): Observable<ApiResponse<AllocationResponse>> {
    return this.api.getWithResponse<AllocationResponse>(
      `/api/v3/assignments/${assignmentId}/allocation`
    );
  }

  /**
   * Get allocation statistics
   */
  getAllocationStats(assignmentId: string, totalEnrolledStudents: number): Observable<ApiResponse<AllocationStatsResponse>> {
    return this.api.getWithResponse<AllocationStatsResponse>(
      `/api/v3/assignments/${assignmentId}/allocation/stats`,
      { params: { totalEnrolledStudents: totalEnrolledStudents.toString() } }
    );
  }

  /**
   * Assign individual task to a student
   */
  assignIndividual(assignmentId: string, request: AssignIndividualRequest): Observable<ApiResponse<AllocationResponse>> {
    return this.api.postWithResponse<AllocationResponse>(
      `/api/v3/assignments/${assignmentId}/allocation/individual`,
      request
    );
  }

  /**
   * Remove student from allocation
   */
  removeStudentFromAllocation(assignmentId: string, studentId: string): Observable<ApiResponse<string>> {
    return this.api.deleteWithResponse<string>(
      `/api/v3/assignments/${assignmentId}/allocation/students/${studentId}`
    );
  }

  /**
   * Update deadline for a specific student
   */
  updateStudentDeadline(assignmentId: string, studentId: string, request: UpdateDeadlineRequest): Observable<ApiResponse<string>> {
    return this.api.patchWithResponse<string>(
      `/api/v3/assignments/${assignmentId}/allocation/students/${studentId}/deadline`,
      request
    );
  }

  /**
   * Get assignments allocated to a student
   */
  getStudentAllocatedAssignments(studentId: string, courseId: string): Observable<ApiResponse<string[]>> {
    return this.api.getWithResponse<string[]>(
      `/api/v3/students/${studentId}/allocated-assignments`,
      { params: { courseId } }
    );
  }
}

