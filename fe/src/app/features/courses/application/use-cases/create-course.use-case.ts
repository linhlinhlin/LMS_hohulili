import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CourseRepositoryImpl } from '../../infrastructure/repositories/course.repository.impl';
import { Course } from '../../domain/entities/course.entity';
import { CourseSpecifications } from '../../domain/value-objects/course-specifications';
import { CourseId, InstructorId, CourseStatus, CourseLevel, CertificateType } from '../../domain/types';

/**
 * Use Case: Create Course
 * Orchestrates the creation of new courses with business rules validation
 */
@Injectable({
  providedIn: 'root'
})
export class CreateCourseUseCase {
  private courseRepository = inject(CourseRepositoryImpl);

  /**
   * Execute the use case - Create a new course
   */
  execute(courseData: CreateCourseData): Observable<Course> {
    // Generate unique ID
    const courseId = this.generateCourseId();

    // Create specifications value object
    const specifications = new CourseSpecifications(
      courseData.durationHours,
      courseData.level,
      courseData.maxStudents,
      courseData.price,
      courseData.prerequisites,
      courseData.certificateType,
      courseData.modulesCount,
      courseData.lessonsCount
    );

    // Create course entity
    const course = new Course(
      courseId,
      courseData.title,
      courseData.description,
      courseData.shortDescription,
      courseData.category,
      courseData.instructorId,
      specifications,
      CourseStatus.DRAFT, // New courses start as draft
      courseData.tags,
      courseData.skills,
      courseData.thumbnail,
      {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: courseData.instructorId,
        studentsCount: 0,
        rating: 0,
        reviewsCount: 0,
        isPopular: false,
        isNew: true,
        version: 1
      }
    );

    // Save to repository
    return this.courseRepository.save(course);
  }

  /**
   * Create course and publish immediately
   */
  createAndPublish(courseData: CreateCourseData): Observable<Course> {
    return this.execute(courseData).pipe(
      // In a real implementation, this would be a separate use case
      // For now, we'll handle it in the repository
    );
  }

  private generateCourseId(): CourseId {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `course-${timestamp}-${random}` as CourseId;
  }
}

/**
 * Input data for creating a course
 */
export interface CreateCourseData {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  instructorId: InstructorId;
  durationHours: number;
  level: CourseLevel;
  maxStudents: number;
  price: number;
  prerequisites: string[];
  certificateType: CertificateType;
  modulesCount: number;
  lessonsCount: number;
  tags: string[];
  skills: string[];
  thumbnail: string;
}