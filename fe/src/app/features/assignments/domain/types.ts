// Domain Types for Assignments Feature
// Following Domain-Driven Design principles

export type AssignmentId = string & { readonly __brand: 'AssignmentId' };
export type SubmissionId = string & { readonly __brand: 'SubmissionId' };
export type StudentId = string & { readonly __brand: 'StudentId' };
export type CourseId = string & { readonly __brand: 'CourseId' };
export type InstructorId = string & { readonly __brand: 'InstructorId' };

// Assignment Types
export enum AssignmentType {
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  PROJECT = 'project',
  DISCUSSION = 'discussion'
}

// Assignment Status
export enum AssignmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

// Submission Status
export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  LATE = 'late',
  RETURNED = 'returned'
}

// Progress Status
export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue'
}

// Priority Levels
export enum PriorityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Deadline Status
export enum DeadlineStatus {
  UPCOMING = 'upcoming',
  DUE_SOON = 'due_soon',
  OVERDUE = 'overdue',
  COMPLETED = 'completed'
}

// Validation Results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Grade Information
export interface Grade {
  score: number;
  maxScore: number;
  percentage: number;
  letterGrade?: string;
  feedback?: string;
  gradedBy: InstructorId;
  gradedAt: Date;
}

// File Attachment
export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'other';
  size: number;
  uploadedAt: Date;
}

// Filter Options
export interface AssignmentFilters {
  status?: AssignmentStatus[];
  type?: AssignmentType[];
  priority?: PriorityLevel[];
  courseId?: CourseId[];
  instructorId?: InstructorId[];
  deadlineStatus?: DeadlineStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// Sort Options
export interface AssignmentSortOptions {
  field: 'title' | 'dueDate' | 'priority' | 'status' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

// Pagination
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}