import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LearningSession } from '../../domain/entities/learning-session.entity';
import { SessionDuration } from '../../domain/value-objects/session-duration';
import { LearningSessionId, StudentId, CourseId, LessonId, SessionType, LearningSessionStatus } from '../../domain/types';

/**
 * Use Case: Start Learning Session
 * Orchestrates the creation of a new learning session
 *
 * Note: This is a simplified implementation for demonstration.
 * In a real application, this would inject repository implementations and handle progress updates.
 */
@Injectable({
  providedIn: 'root'
})
export class StartLearningSessionUseCase {

  /**
   * Execute the use case - Start a new learning session
   */
  execute(request: StartSessionRequest): Observable<LearningSessionResult> {
    // Generate unique session ID
    const sessionId = this.generateSessionId();

    // Create session duration (expected duration)
    const duration = new SessionDuration(request.expectedDurationMinutes || 30);

    // Create learning session
    const session = new LearningSession(
      sessionId,
      request.studentId,
      request.courseId,
      request.lessonId,
      request.sessionType,
      LearningSessionStatus.ACTIVE,
      duration,
      new Date(),
      {
        resumeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    );

    // In a real implementation, this would save to repository
    // For now, return the created session
    return of({
      session,
      message: 'Phiên học đã bắt đầu thành công'
    });
  }

  private generateSessionId(): LearningSessionId {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `session-${timestamp}-${random}` as LearningSessionId;
  }
}

/**
 * Input data for starting a learning session
 */
export interface StartSessionRequest {
  studentId: StudentId;
  courseId: CourseId;
  lessonId: LessonId;
  sessionType: SessionType;
  expectedDurationMinutes?: number;
}

/**
 * Result of starting a learning session
 */
export interface LearningSessionResult {
  session: LearningSession;
  message: string;
}

/**
 * Result with progress information
 */
export interface LearningSessionWithProgressResult extends LearningSessionResult {
  progress: any; // Would be Progress entity in full implementation
}