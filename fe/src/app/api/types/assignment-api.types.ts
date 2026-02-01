/**
 * Assignment API Types
 * Types for assignments, submissions, grading, exports
 * PostgreSQL Tables: assignments, assignment_submissions, assignment_grades
 */

// =======================
// Submission Types
// =======================

/** Base submission data for API responses */
export interface SubmissionData {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail?: string;
    submittedAt?: string;      // ISO 8601
    status: SubmissionStatus;
    grade?: number;
    feedback?: string;
}

/** Submission with due date context for late detection */
export interface SubmissionWithDueDate extends SubmissionData {
    dueDate: string;  // ISO 8601
}

/** Pending submission display */
export interface PendingSubmission {
    studentId: string;
    studentName: string;
    studentEmail: string;
    dueDate: string;  // ISO 8601
}

/** Late submission result for UI */
export interface LateSubmissionResult {
    isLate: boolean;
    lateDuration?: {
        days: number;
        hours: number;
        minutes: number;
    };
    submittedAt: string;  // ISO 8601
    dueDate: string;      // ISO 8601
}

/** Extended submission with content and attachments */
export interface AssignmentSubmission extends SubmissionData {
    content?: string;
    fileUrl?: string;
    fileName?: string;
    attachments?: AttachmentInfo[];
}

/** Submission status enum */
export type SubmissionStatus = 'pending' | 'submitted' | 'graded' | 'late' | 'resubmitted';

// =======================
// Attachment Types
// =======================

/** File attachment information */
export interface AttachmentInfo {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string;
    fileSize?: number;
    metadata?: AttachmentMetadata;
}

/** Attachment metadata for specialized files */
export interface AttachmentMetadata {
    scale?: string;
    coordinates?: { latitude: number; longitude: number };
    captureDate?: string;  // ISO 8601
    originalFileName?: string;
    uploadedAt?: string;   // ISO 8601
}

// =======================
// Assignment Detail Types
// =======================

/** Assignment detail for teacher view */
export interface AssignmentDetailView {
    id: string;
    title: string;
    description: string;
    instructions: string;
    dueDate?: string;       // ISO 8601
    maxScore: number;
    status: AssignmentPublishStatus;
    submissionCount: number;
    totalStudents: number;
    courseTitle?: string;
    courseId?: string;
    createdAt?: string;     // ISO 8601
    updatedAt?: string;     // ISO 8601
}

/** Assignment publish status */
export type AssignmentPublishStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

// =======================
// Assignment List Types
// =======================

/** Assignment list item for display */
export interface AssignmentListItem {
    id: string;
    title: string;
    courseId: string;
    courseName?: string;
    dueDate?: string;        // ISO 8601
    status: AssignmentPublishStatus;
    submissionCount: number;
    totalStudents: number;
    averageScore?: number;
    createdAt: string;       // ISO 8601
}

/** Filter criteria for assignment lists */
export interface AssignmentFilterCriteria {
    courseId?: string;
    status?: AssignmentPublishStatus;
    searchQuery?: string;
    dueDateFrom?: string;    // ISO 8601
    dueDateTo?: string;      // ISO 8601
    hasSubmissions?: boolean;
}

/** Sort configuration */
export interface AssignmentSortConfig {
    field: 'title' | 'dueDate' | 'createdAt' | 'submissionCount';
    direction: 'asc' | 'desc';
}

// =======================
// Assignment Creation Types
// =======================

/** Data for creating assignment */
export interface AssignmentCreationData {
    title: string;
    description?: string;
    instructions?: string;
    courseId: string;
    dueDate?: string;        // ISO 8601
    maxScore: number;
    allowLateSubmission?: boolean;
    latePenaltyPercent?: number;
    rubricId?: string;
    templateId?: string;
    targetStudentIds?: string[];
}

/** Assignment template for quick creation */
export interface AssignmentTemplate {
    id: string;
    name: string;
    description: string;
    instructions: string;
    maxScore: number;
    category?: string;
    tags?: string[];
}

// =======================
// Validation Types
// =======================

/** Validation result object */
export interface AssignmentValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

/** Single validation error */
export interface ValidationError {
    field: string;
    message: string;
    code?: string;
}

// =======================
// Export Types
// =======================

/** Submission for export */
export interface ExportableSubmission {
    studentId: string;
    studentName: string;
    studentEmail: string;
    submittedAt?: string;    // ISO 8601
    status: SubmissionStatus;
    grade?: number;
    feedback?: string;
    isLate: boolean;
    lateDuration?: string;
}

/** Export data bundle */
export interface ExportData {
    assignmentTitle: string;
    courseTitle: string;
    exportDate: string;      // ISO 8601
    submissions: ExportableSubmission[];
    summary: ExportSummary;
}

/** Export summary stats */
export interface ExportSummary {
    totalSubmissions: number;
    gradedCount: number;
    pendingCount: number;
    lateCount: number;
    averageGrade?: number;
}

/** Export row for CSV/Excel */
export interface ExportRow {
    'Mã sinh viên': string;
    'Họ tên': string;
    'Email': string;
    'Ngày nộp': string;
    'Trạng thái': string;
    'Điểm': string;
    'Phản hồi': string;
    'Nộp muộn': string;
}

/** Export validation */
export interface ExportValidationResult {
    isValid: boolean;
    errorMessage?: string;
    rowCount: number;
}

// =======================
// Grading Types
// =======================

/** Grade submission request */
export interface GradeSubmissionRequest {
    submissionId: string;
    grade: number;
    feedback?: string;
    rubricScores?: Record<string, number>;
}

/** Rubric item for grading */
export interface RubricItem {
    id: string;
    title: string;
    description?: string;
    maxPoints: number;
    criteria?: RubricCriterion[];
}

/** Rubric criterion level */
export interface RubricCriterion {
    level: number;
    description: string;
    points: number;
}
