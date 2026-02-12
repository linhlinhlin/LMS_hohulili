import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KnowledgeStats, KnowledgeDocument, UploadResponse, JobStatus } from '../domain/knowledge.types';
import { environment } from '../../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AiKnowledgeService {
    private http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/api/v3/ai/admin/knowledge`;

    getStats(): Observable<KnowledgeStats> {
        return this.http.get<KnowledgeStats>(`${this.apiUrl}/stats`);
    }

    getDocuments(category?: string): Observable<KnowledgeDocument[]> {
        let params: any = {};
        if (category) {
            params.category = category;
        }
        return this.http.get<KnowledgeDocument[]>(`${this.apiUrl}/list`, { params });
    }

    uploadDocument(file: File, category: string): Observable<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData);
    }

    deleteDocument(documentId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${documentId}`);
    }

    getJobStatus(jobId: string): Observable<JobStatus> {
        return this.http.get<JobStatus>(`${this.apiUrl}/jobs/${jobId}`);
    }
}
