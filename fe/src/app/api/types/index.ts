/**
 * API Types Index
 * Central export point for all API types
 * 
 * Note: course.types.ts is the primary source for curriculum types
 * (Chapter, Lesson, Section). Do NOT export chapter.types.ts to avoid duplicates.
 */

// Core entity types - these are the primary definitions
export * from './user.types';
export * from './course.types';  // Includes Chapter, Lesson, Section types
export * from './enrollment.types';
export * from './quiz.types';
export * from './assignment.types';
export * from './auth.types';

// Note: chapter.types.ts is NOT exported here - use course.types.ts instead
// for Chapter, Lesson, Section and related types

// Content types
export * from './content-block.types';

// Common types
export * from './common.types';

// Feature-specific types
export * from './dashboard.types';
export * from './learning.types';
export * from './communication.types';
export * from './analytics.types';
export * from './profile.types';
export * from './category.types';

// Extended API types
export * from './assignment-api.types';
