import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';
import { map } from 'rxjs/operators';

export interface PackageDTO {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  ownerId: string;
  ownerName: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  capacity: number | null;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackageRequest {
  name: string;
  description?: string;
  subject?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  capacity?: number;
}

export interface UpdatePackageRequest {
  name: string;
  description?: string;
  subject?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  capacity?: number;
}

export interface MoveQuestionsRequest {
  questionIds: string[];
  targetPackageId: string;
}

@Injectable({ providedIn: 'root' })
export class PackageApi {
  private readonly apiClient = inject(ApiClient);

  // Get all packages accessible by current user
  getMyPackages() {
    return this.apiClient.get<PackageDTO[]>('/api/v1/packages/my-packages')
      .pipe(
        map((response: any) => {
          if (response && response.data) {
            return response.data;
          }
          return response || [];
        })
      );
  }

  // Get package by ID
  getPackageById(id: string) {
    return this.apiClient.get<PackageDTO>(`/api/v1/packages/${id}`)
      .pipe(
        map((response: any) => {
          if (response && response.data) {
            return response.data;
          }
          return response;
        })
      );
  }

  // Create new package
  createPackage(request: CreatePackageRequest) {
    return this.apiClient.post<PackageDTO>('/api/v1/packages', request)
      .pipe(
        map((response: any) => {
          if (response && response.data) {
            return response.data;
          }
          return response;
        })
      );
  }

  // Update package
  updatePackage(id: string, request: UpdatePackageRequest) {
    return this.apiClient.put<PackageDTO>(`/api/v1/packages/${id}`, request)
      .pipe(
        map((response: any) => {
          if (response && response.data) {
            return response.data;
          }
          return response;
        })
      );
  }

  // Delete package
  deletePackage(id: string) {
    return this.apiClient.delete<{ message: string }>(`/api/v1/packages/${id}`);
  }

  // Get questions in a package
  getQuestionsInPackage(packageId: string) {
    return this.apiClient.get<any[]>(`/api/v1/packages/${packageId}/questions`)
      .pipe(
        map((response: any) => {
          if (response && response.data) {
            return response.data;
          }
          return response || [];
        })
      );
  }

  // Move questions to package
  moveQuestionsToPackage(request: MoveQuestionsRequest) {
    return this.apiClient.post<{ message: string }>('/api/v1/packages/move-questions', request);
  }

  // Search packages
  searchPackages(keyword: string) {
    return this.apiClient.get<PackageDTO[]>('/api/v1/packages/search', {
      params: { keyword }
    }).pipe(
      map((response: any) => {
        if (response && response.data) {
          return response.data;
        }
        return response || [];
      })
    );
  }
}
