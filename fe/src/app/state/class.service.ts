import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClassSummary, CreateClassRequest, UpdateClassRequest } from '../shared/types/course.types';
import { ApiResponse } from '../api/types/common.types';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ClassService {
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/api/v1`;

    getClassesByCourse(courseId: string): Observable<ClassSummary[]> {
        return this.http.get<ApiResponse<ClassSummary[]>>(`${this.API_URL}/courses/${courseId}/classes`)
            .pipe(map(response => response.data));
    }

    searchClasses(courseId: string, search: string = '', status: string = '', page: number = 0, limit: number = 10): Observable<import('../api/types/common.types').Page<ClassSummary>> {
        let params = `?page=${page}&size=${limit}`;
        if (search) params += `&search=${encodeURIComponent(search)}`;
        if (status) params += `&status=${status}`;

        return this.http.get<ApiResponse<import('../api/types/common.types').Page<ClassSummary>>>(
            `${this.API_URL}/courses/${courseId}/classes/search${params}`
        ).pipe(map(response => response.data));
    }

    createClass(request: CreateClassRequest): Observable<ClassSummary> {
        return this.http.post<ApiResponse<ClassSummary>>(`${this.API_URL}/classes`, request)
            .pipe(map(response => response.data));
    }

    updateClass(classId: string, request: UpdateClassRequest): Observable<ClassSummary> {
        return this.http.put<ApiResponse<ClassSummary>>(`${this.API_URL}/classes/${classId}`, request)
            .pipe(map(response => response.data));
    }

    deleteClass(classId: string): Observable<void> {
        return this.http.delete<ApiResponse<void>>(`${this.API_URL}/classes/${classId}`)
            .pipe(map(() => void 0));
    }
}
