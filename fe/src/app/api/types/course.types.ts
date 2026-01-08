export interface CreateCourseRequest {
  code: string;
  title: string;
  description?: string;
}

export interface CourseSummary {
  id: string;
  code: string;
  title: string;
  description: string;
  status: string;
  teacherName: string;
  enrolledCount: number;
  createdAt: string;
  enrolled?: boolean;
  isEnrolled?: boolean;
  // Price fields (Dec 2025)
  priceType?: 'FREE' | 'PAID' | 'SUBSCRIPTION';
  price?: number;
  salePrice?: number;
}

export interface CourseDetail {
  id: string;
  code: string;
  title: string;
  description: string;
  status: string;
  teacherId: string;
  teacherName: string;
  enrolledCount: number;
  chaptersCount: number;
  createdAt: string;
  updatedAt: string | null;

  // Extended fields from CourseDetailDTO (Dec 2025)
  instructorId?: string;
  categoryId?: string;
  categoryName?: string;
  welcomeMessage?: string;
  courseInformation?: string;
  benefits?: string;
  introVideoUrl?: string;
  credits?: number;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';

  // Price fields - CRITICAL for payment flow
  priceType?: 'FREE' | 'PAID' | 'SUBSCRIPTION';
  price?: number;
  salePrice?: number;

  // Collections loaded separately
  tags?: string[];
  teachingStaffIds?: string[];
}

// Course content for learning UI (old Section is now Chapter)
export interface CourseContentChapter {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: LessonSummary[];
}

// L3 Section (Renamed from Topic)
export interface SectionSummary {
  id: string;
  title: string;
  type: 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE';
  content?: string;
  videoUrl?: string;
  videoType?: 'YOUTUBE' | 'CLOUDFLARE';
  cfObjectKey?: string;
  fileUrl?: string;
  duration?: number;
  orderIndex: number;
  isRequired?: boolean;
}

export interface LessonSummary {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  content?: string; // Fallback
  videoUrl?: string; // Fallback
  sections?: SectionSummary[]; // Renamed from topics
}

// Renamed from SectionDetail (L1) to ChapterDetail
export interface ChapterDetail {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  courseId: string;
  courseTitle: string;
  lessonsCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface LessonDetail {
  id: string;
  title: string;
  description: string;
  content: string; // Deprecated/Fallback
  videoUrl: string; // Deprecated/Fallback
  durationMinutes: number;
  orderIndex: number;
  lessonType: 'LECTURE' | 'ASSIGNMENT' | 'QUIZ';
  sectionId: string; // This technically links to Chapter now (chapter_id), so maybe rename to chapterId? Backend returns chapterId if entity updated? 
  // Backend Lesson.java has @JoinColumn(name = "chapter_id"). 
  // But DTOs might still call it sectionId if not updated. 
  // Let's assume backend CourseController returns correct field if I updated it.
  // I did NOT update LessonDetail DTO in CourseController explicitly in my previous edit?
  // Wait, I updated CourseController. LessonSummary is inside convertToChapterResponse.
  // But there is NO LessonDetail DTO in CourseController I edited. 
  // Maybe LessonController returns LessonDetail?
  // I need to check LessonController later. For now, keep as is or rename if sure.
  sectionTitle: string; // chapterTitle
  courseId: string;
  courseTitle: string;
  createdAt: string;
  updatedAt: string | null;
  attachments?: LessonAttachment[];
  sections?: SectionSummary[]; // New
}

export interface LessonAttachment {
  id: string;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}

// Renamed L1 Requests
export interface CreateChapterRequest {
  title: string;
  description?: string;
  orderIndex?: number;
}

export interface UpdateChapterRequest {
  courseId: string; // Required by backend
  title?: string;
  description?: string;
  orderIndex?: number;
}

// NEW L3 Requests
export interface CreateSectionRequest {
  lessonId: string;
  title: string;
  type?: 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE';
  content?: string;
  videoUrl?: string;
  duration?: number;
  orderIndex?: number;
  isRequired?: boolean;
}

export interface UpdateSectionRequest {
  title?: string;
  type?: 'TEXT' | 'VIDEO' | 'QUIZ' | 'FILE'; // Usually type shouldn't change, but ok
  content?: string;
  videoUrl?: string;
  duration?: number;
  orderIndex?: number;
  isRequired?: boolean;
}

// L3 Detail
export interface SectionDetail { // New L3 Section
  id: string;
  title: string;
  type: string;
  content: string;
  videoUrl: string;
  videoType?: 'YOUTUBE' | 'CLOUDFLARE';
  cfObjectKey?: string;
  fileUrl: string;
  duration: number;
  orderIndex: number;
  lessonId: string;
  isRequired?: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateLessonRequest {
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  durationMinutes?: number;
  orderIndex?: number;
  lessonType?: 'LECTURE' | 'ASSIGNMENT' | 'QUIZ';
  quizTimeLimit?: number;
  quizMaxScore?: number;
  quizMaxAttempts?: number;
}

export interface UpdateLessonRequest {
  courseId: string;   // Required by backend
  chapterId: string;  // Required by backend
  title?: string;
  description?: string;
  lessonType?: string;  // Required by backend
  content?: string;
  videoUrl?: string;
  durationMinutes?: number;
  isRequired?: boolean;  // Required by backend
  isPreview?: boolean;   // Required by backend
  orderIndex?: number;
  quizTimeLimit?: number;
  quizPassingScore?: number;
  quizMaxAttempts?: number;
  assignmentDescription?: string;
  assignmentInstructions?: string;
  assignmentDueDate?: string;
  assignmentMaxScore?: number;
}

export interface FileUploadResponse {
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
}

export interface EnrollStudentRequest {
  email: string;
}
