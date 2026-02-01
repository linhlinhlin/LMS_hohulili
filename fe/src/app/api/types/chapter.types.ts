/**
 * Chapter Types - Aligned with PostgreSQL `chapters` table
 * @see V1__lms_consolidated_schema.sql (lines 118-128)
 */

// ============================================
// Entity Types
// ============================================

/**
 * Chapter - matches `chapters` table
 */
export interface Chapter {
    id: string;                        // UUID PRIMARY KEY
    courseId: string;                  // UUID NOT NULL (FK courses)
    title: string;                     // VARCHAR(500) NOT NULL
    description: string | null;        // VARCHAR(1000) NULLABLE
    orderIndex: number;                // INTEGER NOT NULL DEFAULT 0
    createdAt: string;                 // TIMESTAMPTZ NOT NULL
    updatedAt: string | null;          // TIMESTAMPTZ NULLABLE
}

/**
 * Chapter with relations
 */
export interface ChapterWithLessons extends Chapter {
    lessons: LessonSummary[];
    lessonsCount: number;
}

/**
 * Lesson summary for chapter lists
 */
export interface LessonSummary {
    id: string;
    title: string;
    lessonType: LessonType;
    orderIndex: number;
    durationMinutes: number | null;
    isPreview: boolean;
}

// ============================================
// Lesson Types - matches `lessons` table
// ============================================

/** PostgreSQL: lesson_type VARCHAR(50) CHECK (...) */
export type LessonType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'MIXED';

/**
 * Lesson - matches `lessons` table
 */
export interface Lesson {
    id: string;                        // UUID PRIMARY KEY
    chapterId: string;                 // UUID NOT NULL (FK chapters)
    title: string;                     // VARCHAR(500) NOT NULL
    description: string | null;        // TEXT NULLABLE
    lessonType: LessonType | null;     // VARCHAR(50) NULLABLE
    content: string | null;            // TEXT NULLABLE
    contentBlocks: Record<string, unknown> | null; // JSONB NULLABLE
    videoUrl: string | null;           // VARCHAR(1000) NULLABLE
    durationMinutes: number | null;    // INTEGER NULLABLE
    orderIndex: number;                // INTEGER NOT NULL DEFAULT 0
    isPreview: boolean;                // BOOLEAN DEFAULT false
    isFree: boolean;                   // BOOLEAN DEFAULT false
    isRequired: boolean;               // BOOLEAN DEFAULT true
    createdAt: string;                 // TIMESTAMPTZ NOT NULL
    updatedAt: string | null;          // TIMESTAMPTZ NULLABLE
}

/**
 * Lesson with full details
 */
export interface LessonDetail extends Lesson {
    sections: SectionSummary[];
    attachments: LessonAttachment[];
    chapterTitle: string;
    courseId: string;
    courseTitle: string;
}

// ============================================
// Section Types - matches `sections` table
// ============================================

/** PostgreSQL: type VARCHAR(50) CHECK (...) in sections table */
export type SectionType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE' | 'ASSIGNMENT';

/**
 * Section - matches `sections` table
 */
export interface Section {
    id: string;                        // UUID PRIMARY KEY
    lessonId: string;                  // UUID NOT NULL (FK lessons)
    title: string;                     // VARCHAR(500) NOT NULL
    description: string | null;        // VARCHAR(1000) NULLABLE
    type: SectionType;                 // VARCHAR(50) NOT NULL
    content: string | null;            // TEXT NULLABLE
    structuredContent: Record<string, unknown> | null; // JSONB NULLABLE
    videoUrl: string | null;           // VARCHAR(1000) NULLABLE
    videoType: string | null;          // VARCHAR(50) NULLABLE
    cfObjectKey: string | null;        // VARCHAR(500) NULLABLE (Cloudflare)
    fileUrl: string | null;            // VARCHAR(1000) NULLABLE
    duration: number | null;           // INTEGER NULLABLE
    durationSeconds: number | null;    // INTEGER NULLABLE
    orderIndex: number;                // INTEGER NOT NULL DEFAULT 0
    isRequired: boolean;               // BOOLEAN NOT NULL DEFAULT true
    createdAt: string;                 // TIMESTAMPTZ NOT NULL
    updatedAt: string | null;          // TIMESTAMPTZ NULLABLE
}

export interface SectionSummary {
    id: string;
    title: string;
    type: SectionType;
    duration: number | null;
    orderIndex: number;
    isRequired: boolean;
}

// ============================================
// Attachment Types
// ============================================

export interface LessonAttachment {
    id: string;
    lessonId: string;
    fileName: string;
    originalFileName: string;
    fileUrl: string;
    fileType: string;
    contentType: string;
    fileSize: number;
    displayOrder: number;
    uploadedAt: string;
}

// ============================================
// Request DTOs
// ============================================

export interface CreateChapterRequest {
    title: string;
    description?: string;
    orderIndex?: number;
}

export interface UpdateChapterRequest {
    courseId: string;
    title?: string;
    description?: string;
    orderIndex?: number;
}

export interface CreateLessonRequest {
    title: string;
    description?: string;
    lessonType?: LessonType;
    content?: string;
    videoUrl?: string;
    durationMinutes?: number;
    orderIndex?: number;
    isPreview?: boolean;
    isRequired?: boolean;
}

export interface UpdateLessonRequest {
    courseId: string;
    chapterId: string;
    title?: string;
    description?: string;
    lessonType?: LessonType;
    content?: string;
    videoUrl?: string;
    durationMinutes?: number;
    orderIndex?: number;
    isPreview?: boolean;
    isRequired?: boolean;
}

export interface CreateSectionRequest {
    lessonId: string;
    title: string;
    type: SectionType;
    content?: string;
    videoUrl?: string;
    duration?: number;
    orderIndex?: number;
    isRequired?: boolean;
}

export interface UpdateSectionRequest {
    title?: string;
    type?: SectionType;
    content?: string;
    videoUrl?: string;
    duration?: number;
    orderIndex?: number;
    isRequired?: boolean;
}

export interface ReorderRequest {
    itemIds: string[];
}
