import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClassSummary, CreateClassRequest, UpdateClassRequest } from '../shared/types/course.types';
import { ApiResponse, Page } from '../api/types/common.types';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ClassService {
    private http = inject(HttpClient);
    // FIXED: Changed from /api/v1 to /api/v3
    private readonly API_URL = `${environment.apiUrl}/api/v3`;

    getClassesByCourse(courseId: string): Observable<ClassSummary[]> {
        return this.http.get<any>(`${this.API_URL}/courses/${courseId}/classes`).pipe(
            // Handle both wrapped and unwrapped responses (apiResponseInterceptor unwraps)
            map(response => (response as any)?.data ?? response ?? [])
        );
    }

    searchClasses(courseId: string, search: string = '', status: string = '', page: number = 0, limit: number = 10): Observable<Page<ClassSummary>> {
        let params = `?page=${page}&size=${limit}`;
        if (search) params += `&search=${encodeURIComponent(search)}`;
        if (status) params += `&status=${status}`;

        return this.http.get<any>(`${this.API_URL}/courses/${courseId}/classes/search${params}`).pipe(
            // Handle both wrapped and unwrapped responses
            map(response => (response as any)?.data ?? response ?? { content: [], totalElements: 0 })
        );
    }

    createClass(request: CreateClassRequest): Observable<ClassSummary> {
        return this.http.post<any>(`${this.API_URL}/classes`, request).pipe(
            map(response => (response as any)?.data ?? response)
        );
    }

    updateClass(classId: string, request: UpdateClassRequest): Observable<ClassSummary> {
        return this.http.put<any>(`${this.API_URL}/classes/${classId}`, request).pipe(
            map(response => (response as any)?.data ?? response)
        );
    }

    deleteClass(classId: string): Observable<void> {
        return this.http.delete<any>(`${this.API_URL}/classes/${classId}`).pipe(
            map(() => void 0)
        );
    }
}


