// Course Domain Layer Exports
// Domain entities, value objects, repositories, and types

// Types
export type {
  CourseId,
  InstructorId,
  CourseStatus,
  CourseLevel,
  CertificateType,
  CourseFilters,
  CourseSortOptions,
  PaginationOptions,
  PaginatedResult
} from './types';

// Value Objects
export { CourseSpecifications } from './value-objects/course-specifications';

// Entities
export type { CourseMetadata } from './entities/course.entity';
export { Course } from './entities/course.entity';

// Repositories
export type { CourseRepository, CourseStatistics } from './repositories/course.repository';