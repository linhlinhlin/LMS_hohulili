import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClassSummary, CreateClassRequest, UpdateClassRequest } from '../shared/types/course.types';
import { ApiResponse, Page } from '../api/types/common.types';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

export interface PublicationSummary {
    id: string;
    publicationNumber: number;
    contentVersion: number;
    publishedAt: string | null;
    publishedById: string | null;
    publishedByName: string | null;
    releaseNotes: string | null;
    pinnedClassCount: number;
    effectiveClassCount: number;
    isLatest: boolean;
}

export interface AdoptResult {
    classId: string;
    courseVersionId: string | null;
    publicationNumber: number | null;
    versionMode: 'PINNED' | 'FOLLOW_LATEST';
}

export interface ClassStudentRow {
    enrollmentId: string;
    studentId: string;
    studentName: string | null;
    studentEmail: string | null;
    status: 'ACTIVE' | 'DROPPED' | 'COMPLETED' | string;
    completionPercent: number;
    enrolledAt: string | null;
    lastAccessedAt: string | null;
}

export interface BulkAdoptResult {
    publicationId: string;
    publicationNumber: number;
    scope: 'OPEN_ONLY' | 'ALL';
    affectedClassCount: number;
    totalClassCount: number;
    skippedClassNames: string[];
}

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

    getClassStudents(classId: string): Observable<ClassStudentRow[]> {
        // BE wraps the roster in PageResponse<ClassStudentResponse> — extract content[].
        return this.http.get<ApiResponse<{ content: any[] } | any[]>>(`${this.API_URL}/classes/${classId}/students`)
            .pipe(map(response => {
                const data = response.data;
                const rows = Array.isArray(data) ? data : (data?.content ?? []);
                return rows.map(this.mapClassStudentRow);
            }));
    }

    private mapClassStudentRow(row: any): ClassStudentRow {
        return {
            enrollmentId: row?.enrollmentId ?? row?.id ?? '',
            studentId: row?.studentId ?? '',
            studentName: row?.studentName ?? row?.fullName ?? null,
            studentEmail: row?.studentEmail ?? row?.email ?? null,
            status: row?.status ?? 'ACTIVE',
            completionPercent: typeof row?.completionPercent === 'number' ? row.completionPercent : 0,
            enrolledAt: row?.enrolledAt ?? null,
            lastAccessedAt: row?.lastAccessedAt ?? null
        };
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

    // ============ Version Management (Coursera Sessions / edX Course Runs pattern) ============

    listPublications(courseId: string): Observable<PublicationSummary[]> {
        return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/teacher/courses/${courseId}/publications`)
            .pipe(map(response => (response.data || []).map((p: any) => ({
                id: p.id,
                publicationNumber: p.publicationNumber,
                contentVersion: p.contentVersion,
                publishedAt: p.publishedAt,
                publishedById: p.publishedById,
                publishedByName: p.publishedByName,
                releaseNotes: p.releaseNotes,
                pinnedClassCount: p.pinnedClassCount ?? 0,
                effectiveClassCount: p.effectiveClassCount ?? 0,
                isLatest: p.isLatest === true
            }) as PublicationSummary)));
    }

    adoptPublication(classId: string, publicationId: string): Observable<AdoptResult> {
        return this.http.post<ApiResponse<AdoptResult>>(
            `${this.API_URL}/classes/${classId}/adopt-publication`,
            { publicationId, mode: 'PINNED' }
        ).pipe(map(response => response.data));
    }

    followLatestPublication(classId: string): Observable<AdoptResult> {
        return this.http.post<ApiResponse<AdoptResult>>(
            `${this.API_URL}/classes/${classId}/adopt-publication`,
            { mode: 'FOLLOW_LATEST' }
        ).pipe(map(response => response.data));
    }

    bulkAdoptPublication(courseId: string, publicationId: string, scope: 'OPEN_ONLY' | 'ALL' = 'OPEN_ONLY'): Observable<BulkAdoptResult> {
        return this.http.post<ApiResponse<BulkAdoptResult>>(
            `${this.API_URL}/teacher/courses/${courseId}/publications/${publicationId}/adopt-all`,
            { scope }
        ).pipe(map(response => response.data));
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
            courseVersionId: item?.courseVersionId ?? null,
            publicationNumber: item?.publicationNumber ?? null,
            status: item?.status,
            latestPublicationNumber: item?.latestPublicationNumber ?? null,
            updateAvailable: item?.updateAvailable ?? false,
            capacityPercent: item?.capacityPercent ?? 0
        };
    }
}
