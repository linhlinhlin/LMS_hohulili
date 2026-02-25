import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';

export interface NoteResponse {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  content: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  courseId: string;
  lessonId?: string;
  title: string;
  content?: string;
  tags?: string[];
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class NoteApi {
  private readonly apiClient = inject(ApiClient);

  listNotes(courseId?: string) {
    const params = courseId ? `?courseId=${courseId}` : '';
    return this.apiClient.get<NoteResponse[]>(`/api/v3/notes${params}`);
  }

  createNote(request: CreateNoteRequest) {
    return this.apiClient.post<NoteResponse>('/api/v3/notes', request);
  }

  updateNote(id: string, request: UpdateNoteRequest) {
    return this.apiClient.put<NoteResponse>(`/api/v3/notes/${id}`, request);
  }

  deleteNote(id: string) {
    return this.apiClient.delete<void>(`/api/v3/notes/${id}`);
  }
}
