import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { QuizInfrastructureService } from '../../infrastructure/services/quiz.service';
import { Quiz, QuizSearchParams } from '../../types';

/**
 * Get Quiz List Use Case
 *
 * Application service for retrieving quiz lists with filtering and pagination
 */
@Injectable({
  providedIn: 'root'
})
export class GetQuizListUseCase {
  private infrastructureService = inject(QuizInfrastructureService);
  private get quizRepository() {
    return this.infrastructureService.getRepository();
  }

  /**
   * Execute the use case to get all quizzes
   */
  execute(params?: QuizSearchParams): Observable<Quiz[]> {
    return this.quizRepository.findAll(params);
  }

  /**
   * Get quizzes by course ID
   */
  getByCourseId(courseId: string): Observable<Quiz[]> {
    return this.quizRepository.findByCourseId(courseId);
  }

  /**
   * Get active quizzes only
   */
  getActiveQuizzes(): Observable<Quiz[]> {
    return this.quizRepository.findAll().pipe(
      map(quizzes => quizzes.filter(quiz => quiz.isActive))
    );
  }

  /**
   * Get quizzes by instructor
   */
  getByInstructorId(instructorId: string): Observable<Quiz[]> {
    return this.quizRepository.findByInstructorId(instructorId);
  }

  /**
   * Search quizzes by query
   */
  search(query: string): Observable<Quiz[]> {
    return this.quizRepository.findAll({
      query,
      sortBy: 'title',
      sortOrder: 'asc'
    });
  }
}