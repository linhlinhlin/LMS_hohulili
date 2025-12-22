import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { CHAPTER_ENDPOINTS } from '../endpoints/chapter.endpoints';
import { ApiResponse } from '../types/common.types';
import { CreateChapterRequest, ChapterDetail, UpdateChapterRequest } from '../types/course.types';

@Injectable({ providedIn: 'root' })
export class ChapterApi {
    private api = inject(ApiClient);

    createChapter(courseId: string, payload: CreateChapterRequest) {
        return this.api.postWithResponse<ChapterDetail>(CHAPTER_ENDPOINTS.CREATE(courseId), payload);
    }

    updateChapter(chapterId: string, payload: UpdateChapterRequest) {
        return this.api.put<ApiResponse<ChapterDetail>>(CHAPTER_ENDPOINTS.UPDATE(chapterId), payload);
    }

    deleteChapter(chapterId: string) {
        return this.api.delete<ApiResponse<string>>(CHAPTER_ENDPOINTS.DELETE(chapterId));
    }

    // Flat listing helpers
    listChaptersFlat(courseId: string) {
        return this.api.getWithResponse<any>(CHAPTER_ENDPOINTS.LIST_FLAT(courseId));
    }
}

