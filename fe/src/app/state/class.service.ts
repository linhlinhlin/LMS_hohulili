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
    private readonly API_URL = `${environment.apiUrl}/api/v3`;

    getClassesByCourse(courseId: string): Observable<ClassSummary[]> {
        return this.http.get<ApiResponse<ClassSummary[]>>(`${this.API_URL}/classes/by-course/${courseId}`)
            .pipe(map(response => (response.data || []).map(item => this.mapClassSummary(item))));
    }

    searchClasses(courseId: string, search: string = '', status: string = '', semester: string = '', page: number = 0, limit: number = 10): Observable<Page<ClassSummary>> {
        let params = `?page=${page}&size=${limit}`;
        if (search) params += `&search=${encodeURIComponent(search)}`;
        if (status) params += `&status=${status}`;
        if (semester) params += `&semester=${encodeURIComponent(semester)}`;

        return this.http.get<ApiResponse<any>>(
            `${this.API_URL}/classes/by-course/${courseId}/search${params}`
        ).pipe(map(response => {
            const pageData = response.data || {};
            const number = pageData.pageNumber ?? page;
            const totalPages = pageData.totalPages ?? 0;
            const content = (pageData.content || []).map((item: unknown) => this.mapClassSummary(item));

            return {
                content,
                totalElements: pageData.totalElements ?? content.length,
                totalPages,
                size: pageData.pageSize ?? limit,
                number,
                first: number === 0,
                last: totalPages === 0 || number >= totalPages - 1,
                empty: content.length === 0
            } as Page<ClassSummary>;
        }));
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

    enrollStudent(classId: string, email: string): Observable<void> {
        return this.http.post<ApiResponse<void>>(`${this.API_URL}/classes/${classId}/enrollments`, { email })
            .pipe(map(() => void 0));
    }

    getClassStudents(classId: string): Observable<any[]> {
        return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/classes/${classId}/students`)
            .pipe(map(response => response.data));
    }

    removeStudentFromClass(classId: string, studentId: string): Observable<void> {
        return this.http.delete<ApiResponse<void>>(`${this.API_URL}/classes/${classId}/enrollments/${studentId}`)
            .pipe(map(() => void 0));
    }

    importStudentsExcel(classId: string, file: File, preview: boolean = false): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<any>(`${this.API_URL}/classes/${classId}/enrollments/import?preview=${preview}`, formData);
    }

    getPaidUnenrolledStudents(courseId: string): Observable<any[]> {
        return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/classes/by-course/${courseId}/paid-unenrolled`)
            .pipe(map(response => response.data || []));
    }

    enrollPaidStudents(classId: string, studentIds: string[]): Observable<void> {
        return this.http.post<ApiResponse<void>>(`${this.API_URL}/classes/${classId}/enroll-paid`, { studentIds })
            .pipe(map(() => void 0));
    }

    private mapClassSummary(item: any): ClassSummary {
        return {
            id: item?.id ?? '',
            name: item?.name ?? '',
            code: item?.code ?? '',
            teacherId: item?.teacherId ?? undefined,
            teacherName: item?.teacherName ?? '',
            startDate: item?.startDate ?? '',
            endDate: item?.endDate ?? '',
            maxStudents: item?.maxStudents ?? 0,
            studentCount: item?.studentCount ?? 0,
            scheduleType: item?.scheduleType ?? (item?.semester ? 'SEMESTER' : 'CUSTOM'),
            semester: item?.semester ?? '',
            versionMode: item?.versionMode ?? 'PINNED',
            publicationNumber: item?.publicationNumber ?? null,
            status: item?.status,
            latestPublicationNumber: item?.latestPublicationNumber ?? null,
            updateAvailable: item?.updateAvailable ?? false,
            capacityPercent: item?.capacityPercent ?? 0
        };
    }
}
