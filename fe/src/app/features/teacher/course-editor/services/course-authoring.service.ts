import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

export interface LessonDraftDTO {
    id: string;
    title: string;
    type: string;
    orderIndex: number;
    contentUrl?: string;
    contentText?: string;
    content?: string;
    videoUrl?: string;
    durationSeconds?: number;
    isRequired: boolean;
    // Quiz fields
    quizTimeLimit?: number;
    quizPassingScore?: number;
    quizMaxAttempts?: number;
    // Assignment fields
    assignmentDescription?: string;
    assignmentInstructions?: string;
    assignmentDueDate?: string;
    assignmentMaxScore?: number;
}

export interface ChapterDraftDTO {
    id: string;
    title: string;
    description?: string;
    orderIndex: number;
    lessons: LessonDraftDTO[];
}

export interface CourseDraftDTO {
    id: string;
    code: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    price?: number;
    priceType?: string;
    unlockMode?: string;
    chapters: ChapterDraftDTO[];
}

// API Response types
interface ApiResponse<T> {
    data: T;
    message?: string;
}

interface CourseDetailResponse {
    id: string;
    code: string;
    title: string;
    description: string;
    status: string;
    teacherId: string;
    teacherName: string;
}

interface SectionWithLessons {
    id: string;
    title: string;
    description?: string;
    orderIndex: number;
    lessons: {
        id: string;
        title: string;
        description?: string;
        content?: string;
        videoUrl?: string;
        orderIndex: number;
        lessonType?: string;
        // Quiz fields
        quizTimeLimit?: number;
        quizMaxScore?: number;
        quizMaxAttempts?: number;
        // Assignment fields
        assignment?: {
            description?: string;
            instructions?: string;
            dueDate?: string;
            maxScore?: number;
        };
    }[];
}

@Injectable({
    providedIn: 'root'
})
export class CourseAuthoringService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/api/v1`;

    // --- Draft Operations ---
    // Sử dụng API hiện có thay vì /authoring endpoint

    getCourseDraft(courseId: string): Observable<CourseDraftDTO> {
        // Gọi 2 API song song: course detail + course content
        return forkJoin({
            course: this.http.get<ApiResponse<CourseDetailResponse>>(`${this.baseUrl}/courses/${courseId}`),
            content: this.http.get<ApiResponse<SectionWithLessons[]>>(`${this.baseUrl}/courses/${courseId}/content`)
        }).pipe(
            map(({ course, content }) => {
                const courseData = course.data;
                const sections = content.data || [];

                // Map sections to chapters format
                const chapters: ChapterDraftDTO[] = sections.map(section => ({
                    id: section.id,
                    title: section.title,
                    description: section.description,
                    orderIndex: section.orderIndex,
                    lessons: (section.lessons || []).map(lesson => ({
                        id: lesson.id,
                        title: lesson.title,
                        type: (lesson as any).lessonType || (lesson as any).type || 'LECTURE',
                        orderIndex: lesson.orderIndex,
                        isRequired: true,
                        content: lesson.content || (lesson as any).description || '',
                        videoUrl: lesson.videoUrl || '',
                        // Quiz fields
                        quizTimeLimit: lesson.quizTimeLimit || (lesson as any).timeLimit,
                        quizPassingScore: lesson.quizMaxScore || (lesson as any).passingScore,
                        quizMaxAttempts: lesson.quizMaxAttempts || (lesson as any).maxAttempts,
                        // Assignment fields
                        assignmentDescription: lesson.assignment?.description,
                        assignmentInstructions: lesson.assignment?.instructions,
                        assignmentDueDate: lesson.assignment?.dueDate,
                        assignmentMaxScore: lesson.assignment?.maxScore
                    }))
                }));

                return {
                    id: courseData.id,
                    code: courseData.code,
                    title: courseData.title,
                    description: courseData.description,
                    chapters
                } as CourseDraftDTO;
            })
        );
    }

    publishCourse(courseId: string): Observable<any> {
        // Sử dụng submit-for-approval endpoint hiện có
        return this.http.post(`${this.baseUrl}/courses/${courseId}/submit-for-approval`, {});
    }

    // --- Reordering ---

    reorderChapters(courseId: string, orderedIds: string[]): Observable<void> {
        return this.http.patch<void>(`${this.baseUrl}/sections/reorder`, { 
            courseId, 
            orderedIds 
        });
    }

    reorderLessons(chapterId: string, orderedIds: string[]): Observable<void> {
        return this.http.patch<void>(`${this.baseUrl}/lessons/reorder`, { 
            sectionId: chapterId, 
            orderedIds 
        });
    }

    // --- Updates ---

    updateCourseInfo(courseId: string, data: { title?: string; description?: string; thumbnailUrl?: string | null }): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/courses/${courseId}`, data);
    }

    updateLesson(lessonId: string, data: Partial<LessonDraftDTO>): Observable<void> {
        return this.http.patch<void>(`${this.baseUrl}/lessons/${lessonId}`, data);
    }

    // --- Uploads ---

    uploadFile(file: File): Observable<{ fileUrl: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<{ fileUrl: string }>(`${this.baseUrl}/documents/upload`, formData).pipe(
            map((res: any) => ({ fileUrl: res.data?.fileUrl || res.fileUrl }))
        );
    }
}
