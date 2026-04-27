/**
 * Learning Types
 * Types for student learning experience, video lessons, progress tracking
 * PostgreSQL Tables: courses, chapters, lessons, sections, video_progress, bookmarks
 */

// =======================
// Course Learning Types
// =======================

export interface CourseModule {
    id: string;
    title: string;
    description?: string;
    order: number;
    lessons: CourseLesson[];
    isCompleted?: boolean;
    progress?: number;
}

export interface CourseLesson {
    id: string;
    title: string;
    type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
    duration?: number;
    order: number;
    isCompleted?: boolean;
    isLocked?: boolean;
}

export interface CourseResource {
    id: string;
    title: string;
    type: 'PDF' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'LINK';
    url: string;
    size?: number;
    downloadable: boolean;
}

export interface CourseLearning {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    modules: CourseModule[];
    currentLessonId?: string;
    progress: number;
}

export interface LearningProgress {
    courseId: string;
    lessonId: string;
    progress: number;
    completedAt?: string;   // ISO 8601
    lastAccessedAt: string;  // ISO 8601
}

// =======================
// Video Learning Types
// =======================

export interface VideoLesson {
    id: string;
    title: string;
    videoUrl: string;
    duration: number;
    thumbnail?: string;
    transcript?: string;
    currentTime?: number;
    isCompleted?: boolean;
}

export interface VideoBookmark {
    id: string;
    lessonId: string;
    timestamp: number;
    title: string;
    note?: string;
    createdAt: string;  // ISO 8601
}

export interface VideoNote {
    id: string;
    lessonId: string;
    timestamp?: number;
    content: string;
    createdAt: string;   // ISO 8601
    updatedAt?: string;  // ISO 8601
}

// =======================
// Bookmark System Types
// =======================

export interface Bookmark {
    id: string;
    type: 'lesson' | 'course' | 'resource';
    targetId: string;
    title: string;
    description?: string;
    folderId?: string;
    createdAt: string;  // ISO 8601
    metadata?: Record<string, any>;
}

export interface BookmarkFolder {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    bookmarkCount: number;
    createdAt: string;  // ISO 8601
}

export interface BookmarkFilter {
    type?: 'lesson' | 'course' | 'resource';
    folderId?: string;
    searchQuery?: string;
}

// =======================
// Note Taking Types
// =======================

export interface Note {
    id: string;
    lessonId: string;
    courseId: string;
    title: string;
    content: string;
    timestamp?: number;
    tags?: string[];
    createdAt: string;   // ISO 8601
    updatedAt?: string;  // ISO 8601
}

export interface NoteFilter {
    courseId?: string;
    lessonId?: string;
    searchQuery?: string;
    tags?: string[];
}

// =======================
// Study Planning Types
// =======================

export interface StudySession {
    id: string;
    courseId: string;
    lessonId?: string;
    startTime: string; // ISO 8601
    endTime: string; // ISO 8601
    duration: number;
    completed: boolean;
    notes?: string;
}

export interface StudyGoal {
    id: string;
    title: string;
    targetDate: string; // ISO 8601
    courseId?: string;
    progress: number;
    completed: boolean;
}

export interface StudyPlan {
    id: string;
    title: string;
    description?: string;
    goals: StudyGoal[];
    sessions: StudySession[];
    createdAt: string; // ISO 8601
}

// =======================
// Calendar Types
// =======================

export interface CalendarEvent {
    id: string;
    title: string;
    type: 'lesson' | 'assignment' | 'quiz' | 'session';
    startDate: string; // ISO 8601
    endDate?: string; // ISO 8601
    courseId?: string;
    courseName?: string;
    metadata?: Record<string, any>;
}

export interface CalendarDay {
    date: string; // ISO 8601
    events: CalendarEvent[];
    isToday: boolean;
    isCurrentMonth: boolean;
}

// =======================
// Lesson Detail Types (Student)
// =======================

export interface LessonDetailForStudent {
    id: string;
    title: string;
    type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE';
    content?: string;
    videoUrl?: string;
    duration?: number;
    sections: LessonSection[];
    resources: LessonResource[];
    isCompleted: boolean;
    progress: number;
}

export interface LessonSection {
    id: string;
    type: 'VIDEO' | 'TEXT' | 'FILE' | 'QUIZ';
    title: string;
    content?: string;
    videoUrl?: string;
    fileUrl?: string;
    duration?: number;
    order: number;
}

export interface LessonResource {
    id: string;
    title: string;
    type: string;
    url: string;
    size?: number;
}

