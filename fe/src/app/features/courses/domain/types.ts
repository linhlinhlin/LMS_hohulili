// Domain Types for Courses Feature
// Following Domain-Driven Design principles

export type CourseId = string & { readonly __brand: 'CourseId' };
export type InstructorId = string & { readonly __brand: 'InstructorId' };
export type StudentId = string & { readonly __brand: 'StudentId' };
export type EnrollmentId = string & { readonly __brand: 'EnrollmentId' };
export type ModuleId = string & { readonly __brand: 'ModuleId' };
export type LessonId = string & { readonly __brand: 'LessonId' };

// Course Status
export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// Course Level
export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

// Certificate Type
export enum CertificateType {
  STCW = 'STCW',
  IMO = 'IMO',
  PROFESSIONAL = 'Professional',
  COMPLETION = 'Completion'
}

// Enrollment Status
export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

// Lesson Type
export enum LessonType {
  VIDEO = 'video',
  TEXT = 'text',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment'
}

// Validation Results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Filter Options
export interface CourseFilters {
  status?: CourseStatus[];
  level?: CourseLevel[];
  category?: string[];
  instructorId?: InstructorId[];
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Sort Options
export interface CourseSortOptions {
  field: 'title' | 'price' | 'rating' | 'students' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

// Pagination
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];       // Phải là `content` từ Backend
  page: number;     // ánh xạ từ `pageNumber`
  limit: number;    // ánh xạ từ `pageSize`
  total: number;    // ánh xạ từ `totalElements`
  totalPages: number; // ánh xạ từ `totalPages`
  hasNext: boolean; // Tính toán từ thông tin phân trang
  hasPrev: boolean; // Tính toán từ thông tin phân trang
}