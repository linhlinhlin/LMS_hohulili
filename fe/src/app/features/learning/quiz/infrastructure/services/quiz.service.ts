import { Injectable } from '@angular/core';
import { QuizRepository, IQuizRepository } from '../../domain/repositories/quiz.repository';

/**
 * Quiz Infrastructure Service
 *
 * Provides the concrete implementation of the quiz repository
 * This is the infrastructure layer that connects to data sources
 */
@Injectable({
  providedIn: 'root'
})
export class QuizInfrastructureService {
  private repository: IQuizRepository;

  constructor() {
    // In a real application, this would be injected or configured
    // For now, we'll use the concrete implementation directly
    this.repository = new QuizRepository();
  }

  /**
   * Get the quiz repository instance
   */
  getRepository(): IQuizRepository {
    return this.repository;
  }
}