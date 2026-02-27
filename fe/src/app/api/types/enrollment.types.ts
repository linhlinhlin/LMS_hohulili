/**
 * Enrollment Types - Aligned with PostgreSQL tables
 * @see V1__lms_consolidated_schema.sql - Section 4: Class-based Enrollment
 */

// ============================================
// PostgreSQL ENUM Types
// ============================================

/** PostgreSQL: status VARCHAR(50) CHECK (...) in enrollments table */
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'EXPIRED' | 'SUSPENDED';

/** PostgreSQL: status VARCHAR(50) CHECK (...) in learning_classes table */
export type ClassStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';

// ============================================
// Entity Types
// ============================================

/**
 * Learning Class - matches `learning_classes` table
 */
export interface LearningClass {
    id: string;                        // UUID
    name: string;                      // VARCHAR(500) NOT NULL
    code: string | null;               // VARCHAR(100) UNIQUE NULLABLE
    description: string | null;        // TEXT NULLABLE
    teacherId: string | null;          // UUID NULLABLE (FK users)
    courseId: string | null;           // UUID NULLABLE (FK courses)
    courseVersionId: string | null;    // UUID NULLABLE
    semester: string | null;           // VARCHAR(50) NULLABLE
    scheduleType: string;              // VARCHAR(50) DEFAULT 'CUSTOM'
    status: ClassStatus;               // VARCHAR(50) DEFAULT 'OPEN'
    maxStudents: number;               // INTEGER DEFAULT 9999
    startDate: string | null;          // TIMESTAMPTZ NULLABLE
    endDate: string | null;            // TIMESTAMPTZ NULLABLE
    createdAt: string;                 // TIMESTAMPTZ
    updatedAt: string | null;          // TIMESTAMPTZ NULLABLE
}

/**
 * Class-Course mapping - matches `class_courses` table
 */
export interface ClassCourse {
    id: string;
    classId: string;
    courseId: string;
    addedBy: string | null;
    orderIndex: number;
    isRequired: boolean;
    createdAt: string;
}

/**
 * Enrollment - matches `enrollments` table
 */
export interface Enrollment {
    id: string;                        // UUID
    studentId: string;                 // UUID NOT NULL (FK users)
    classId: string;                   // UUID NOT NULL (FK learning_classes)
    status: EnrollmentStatus;          // VARCHAR(50) DEFAULT 'ACTIVE'
    progress: Record<string, unknown> | null; // JSONB NULLABLE
    completionPercent: number;         // INTEGER DEFAULT 0
    enrolledAt: string;                // TIMESTAMPTZ
    joinedAt: string | null;           // TIMESTAMPTZ NULLABLE
    completedAt: string | null;        // TIMESTAMPTZ NULLABLE
    lastAccessedAt: string | null;     // TIMESTAMPTZ NULLABLE
    isPaid: boolean;                   // BOOLEAN DEFAULT false
    paidAt: string | null;             // TIMESTAMPTZ NULLABLE
    paymentId: string | null;          // UUID NULLABLE
}

// ============================================
// Summary Types (for lists)
// ============================================

export interface ClassSummary {
    id: string;
    name: string;
    code: string | null;
    teacherName: string;
    courseName: string | null;
    status: ClassStatus;
    studentCount: number;
    maxStudents: number;
    startDate: string | null;
    endDate: string | null;
}

export interface EnrollmentSummary {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    status: EnrollmentStatus;
    completionPercent: number;
    enrolledAt: string;
    lastAccessedAt: string | null;
}

export interface EnrolledCourse {
    id: string;
    courseId: string;
    courseTitle: string;
    classId: string;
    className: string;
    enrolledAt: string;
    completionPercent: number;
    status: EnrollmentStatus;
}

// ============================================
// Request DTOs
// ============================================

export interface CreateClassRequest {
    name: string;
    code?: string;
    description?: string;
    courseId?: string;
    semester?: string;
    maxStudents?: number;
    startDate?: string;
    endDate?: string;
}

export interface EnrollStudentRequest {
    studentId: string;
    classId: string;
}

export interface BulkEnrollRequest {
    studentIds: string[];
    classId: string;
}

// ============================================
// Response DTOs
// ============================================

export interface EnrollmentResult {
    enrollmentId: string;
    studentId: string;
    classId: string;
    enrolledAt: string;
}
