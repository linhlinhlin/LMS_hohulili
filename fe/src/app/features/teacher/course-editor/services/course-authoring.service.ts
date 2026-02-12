import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

export interface SectionDraftDTO { // Renamed from TopicDraftDTO
    id: string;
    title: string;
    type: string;
    content?: string;
    videoUrl?: string;
    fileUrl?: string;
    duration?: number;
    orderIndex: number;
    isRequired?: boolean;
    // [NEW] Quiz Data for hydration - SOTA 2025
    quizData?: {
        quizId?: string;
        timeLimitMinutes?: number;
        passingScore?: number;
        maxAttempts?: number;
        shuffleQuestions?: boolean;
        shuffleOptions?: boolean;
        showResultsImmediately?: boolean;
        questions?: { id: string; content: string }[];
    };
}

export interface LessonDraftDTO {
    id: string;
    title: string;
    type: string;
    orderIndex: number;
    contentUrl?: string; // Fallback
    contentText?: string; // Fallback
    content?: string; // Fallback
    videoUrl?: string; // Fallback
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

    // Level 3 Sections
    sections: SectionDraftDTO[]; // Renamed from topics
}

export interface ChapterDraftDTO {
    id: string;
    title: string;
    description?: string;
    orderIndex: number;
    lessons: LessonDraftDTO[];
}

export interface CourseSettings {
    visibility: 'public' | 'private';
    allowSelfEnrollment: boolean;
    maxStudents: number | null;
    autoCertificate: boolean;
    progressionMode: 'free' | 'linear';
    dripType: 'instant' | 'date' | 'complete';
    dateBatchSize: number;
    completeBatchSize: number;
    dateIntervalDays: number;
    completeIntervalDays: number;
}

export interface CategoryDTO {
    id: string;
    code: string;
    name: string;
    prefix: string;
}

export type DeliveryMode = 'SELF_PACED' | 'INSTRUCTOR_LED';

export interface CourseDraftDTO {
    id: string;
    code: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    // New fields
    instructorId?: string;
    categoryId?: string;
    categoryName?: string;
    tags?: string[];
    welcomeMessage?: string;
    courseInformation?: string;
    benefits?: string;
    introVideoUrl?: string;
    credits?: number;
    visibility?: 'PUBLIC' | 'PRIVATE';
    priceType?: 'FREE' | 'PAID';
    price?: number;
    salePrice?: number;
    deliveryMode?: DeliveryMode;

    unlockMode?: string;
    settings?: CourseSettings;
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
    thumbnailUrl?: string;
    instructorId?: string;
    categoryId?: string;
    categoryName?: string;
    tags?: string[];
    welcomeMessage?: string;
    courseInformation?: string;
    benefits?: string;
    introVideoUrl?: string;
    credits?: number;
    visibility?: string;
    priceType?: string;
    price?: number;
    salePrice?: number;
    deliveryMode?: string;
    settings?: CourseSettings;
}

interface ChapterResponse { // Was SectionWithLessons
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
        // Sections (Level 3) - renamed from topics
        sections?: {
            id: string;
            title: string;
            type: string;
            content?: string;
            videoUrl?: string;
            fileUrl?: string; // [NEW] For FILE type sections - SOTA 2025
            duration?: number;
            orderIndex: number;
            isRequired?: boolean;
            // [NEW] Quiz Data for hydration - SOTA 2025
            quizData?: {
                quizId?: string;
                timeLimitMinutes?: number;
                passingScore?: number;
                maxAttempts?: number;
                shuffleQuestions?: boolean;
                shuffleOptions?: boolean;
                showResultsImmediately?: boolean;
                questions?: { id: string; content: string }[];
            };
        }[];
        // Legacy support
        topics?: {
            id: string;
            title: string;
            type: string;
            content?: string;
            videoUrl?: string;
            fileUrl?: string;
            duration?: number;
            orderIndex: number;
            isRequired?: boolean;
            quizData?: {
                quizId?: string;
                timeLimitMinutes?: number;
                passingScore?: number;
                maxAttempts?: number;
                shuffleQuestions?: boolean;
                shuffleOptions?: boolean;
                showResultsImmediately?: boolean;
                questions?: { id: string; content: string }[];
            };
        }[];
    }[];
}

@Injectable({
    providedIn: 'root'
})
export class CourseAuthoringService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/api/v3`;

    // --- Draft Operations ---

    getCourseDraft(courseId: string): Observable<CourseDraftDTO> {
        return forkJoin({
            course: this.http.get<ApiResponse<CourseDetailResponse>>(`${this.baseUrl}/courses/${courseId}`),
            content: this.http.get<ApiResponse<ChapterResponse[]>>(`${this.baseUrl}/courses/${courseId}/content`)
        }).pipe(
            map(({ course, content }) => {
                const courseData = course.data;
                const backendChapters = content.data || [];

                // Map chapters
                const chapters: ChapterDraftDTO[] = backendChapters.map(ch => ({
                    id: ch.id,
                    title: ch.title,
                    description: ch.description,
                    orderIndex: ch.orderIndex,
                    lessons: (ch.lessons || []).map(lesson => ({
                        id: lesson.id,
                        title: lesson.title,
                        type: lesson.lessonType || 'LECTURE',
                        orderIndex: lesson.orderIndex,
                        isRequired: true,
                        content: lesson.content || '',
                        videoUrl: lesson.videoUrl || '',
                        // Quiz fields
                        quizTimeLimit: lesson.quizTimeLimit,
                        quizPassingScore: lesson.quizMaxScore, // API maps quizMaxScore -> quizPassingScore usually or vice versa. Check backend. Backend mapped quizMaxScore to DTO quizMaxScore. Frontend LessonDraft uses quizPassingScore. Adjusted.
                        quizMaxAttempts: lesson.quizMaxAttempts,
                        // Assignment fields
                        assignmentDescription: lesson.assignment?.description,
                        assignmentInstructions: lesson.assignment?.instructions,
                        assignmentDueDate: lesson.assignment?.dueDate,
                        assignmentMaxScore: lesson.assignment?.maxScore,

                        // Map Sections (Level 3)
                        sections: (lesson.sections || lesson.topics || []).map((t: any) => ({
                            id: t.id,
                            title: t.title,
                            type: t.type,
                            content: t.content,
                            videoUrl: t.videoUrl,
                            fileUrl: t.fileUrl,
                            duration: t.duration,
                            orderIndex: t.orderIndex,
                            isRequired: t.isRequired,
                            // [NEW] Quiz Data hydration - SOTA 2025
                            quizData: t.quizData ? {
                                quizId: t.quizData.quizId,
                                timeLimitMinutes: t.quizData.timeLimitMinutes,
                                passingScore: t.quizData.passingScore,
                                maxAttempts: t.quizData.maxAttempts,
                                shuffleQuestions: t.quizData.shuffleQuestions,
                                shuffleOptions: t.quizData.shuffleOptions,
                                showResultsImmediately: t.quizData.showResultsImmediately,
                                questions: t.quizData.questions || []
                            } : undefined
                        }))
                    }))
                }));

                return {
                    id: courseData.id,
                    code: courseData.code,
                    title: courseData.title,
                    description: courseData.description,
                    thumbnailUrl: courseData.thumbnailUrl,
                    instructorId: courseData.instructorId,
                    categoryId: courseData.categoryId,
                    categoryName: courseData.categoryName,
                    tags: courseData.tags,
                    welcomeMessage: courseData.welcomeMessage,
                    courseInformation: courseData.courseInformation,
                    benefits: courseData.benefits,
                    introVideoUrl: courseData.introVideoUrl,
                    credits: courseData.credits,
                    visibility: courseData.visibility as CourseDraftDTO['visibility'],
                    priceType: courseData.priceType as CourseDraftDTO['priceType'],
                    price: courseData.price,
                    salePrice: courseData.salePrice,
                    deliveryMode: (courseData.deliveryMode as DeliveryMode) || 'SELF_PACED',
                    settings: courseData.settings,
                    chapters
                } satisfies CourseDraftDTO;
            })
        );
    }

    publishCourse(courseId: string): Observable<any> {
        // BE: TeacherCoursesControllerV3 POST /api/v3/teacher/courses/{courseId}/submit-for-approval
        return this.http.post(`${this.baseUrl}/teacher/courses/${courseId}/submit-for-approval`, {});
    }

    // --- Reordering ---
    // BE: CourseAuthoringControllerV3 PATCH /api/v3/courses/chapters/reorder

    reorderChapters(courseId: string, orderedIds: string[]): Observable<void> {
        return this.http.patch<void>(`${this.baseUrl}/courses/chapters/reorder`, {
            courseId,
            orderedIds
        });
    }

    reorderLessons(chapterId: string, orderedIds: string[], courseId: string): Observable<void> {
        return this.http.patch<void>(`${this.baseUrl}/courses/lessons/reorder`, {
            courseId,
            chapterId,
            orderedIds
        });
    }

    reorderSections(lessonId: string, orderedIds: string[]): Observable<void> {
        return this.http.patch<void>(`${this.baseUrl}/courses/sections/reorder`, {
            lessonId,
            orderedIds
        });
    }

    // --- Updates ---

    updateCourseInfo(courseId: string, data: Partial<{
        title: string;
        description: string;
        thumbnailUrl: string | null;
        categoryId: string | null;
        tags: string[];
        welcomeMessage: string;
        courseInformation: string;
        benefits: string;
        introVideoUrl: string;
        credits: number;
        visibility: string;
        priceType: string;
        price: number;
        salePrice: number;
        deliveryMode: string;
    }>): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/courses/${courseId}`, data);
    }

    updateLesson(lessonId: string, data: Partial<LessonDraftDTO>): Observable<void> {
        // BE: CourseAuthoringControllerV3 PUT /api/v3/courses/lessons/{lessonId}
        return this.http.put<void>(`${this.baseUrl}/courses/lessons/${lessonId}`, data);
    }

    // --- Uploads ---

    uploadFile(file: File): Observable<{ fileUrl: string }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'course');
        return this.http.post<any>(`${this.baseUrl}/files/upload/editor`, formData).pipe(
            map((res: any) => ({ fileUrl: res.file?.url || '' }))
        );
    }

    getCategories(): Observable<CategoryDTO[]> {
        return this.http.get<ApiResponse<CategoryDTO[]>>(`${this.baseUrl}/categories`).pipe(
            map(res => res.data)
        );
    }

    getInstructors(): Observable<any[]> {
        return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/users/instructors`).pipe(
            map(res => res.data)
        );
    }
}
