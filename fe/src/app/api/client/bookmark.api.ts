import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/common.types';
import { map } from 'rxjs/operators';

export interface BookmarkResponse {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  title: string;
  url: string;
  position: number;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface CreateBookmarkRequest {
  courseId: string;
  lessonId?: string;
  title: string;
  url: string;
  position?: number;
  metadata?: Record<string, any>;
}

export interface UpdateBookmarkRequest {
  title: string;
  position?: number;
}

@Injectable({ providedIn: 'root' })
export class BookmarkApi {
  private api = inject(ApiClient);

  /** List bookmarks, optionally filtered by courseId */
  getBookmarks(courseId?: string) {
    const params: any = {};
    if (courseId) params.courseId = courseId;
    return this.api.getWithResponse<BookmarkResponse[]>('/api/v3/bookmarks', { params });
  }

  /** Create a new bookmark */
  createBookmark(request: CreateBookmarkRequest) {
    return this.api.postWithResponse<BookmarkResponse>('/api/v3/bookmarks', request);
  }

  /** Update a bookmark */
  updateBookmark(id: string, request: UpdateBookmarkRequest) {
    return this.api.putWithResponse<BookmarkResponse>(`/api/v3/bookmarks/${id}`, request);
  }

  /** Delete a bookmark */
  deleteBookmark(id: string) {
    return this.api.deleteWithResponse<void>(`/api/v3/bookmarks/${id}`);
  }
}
