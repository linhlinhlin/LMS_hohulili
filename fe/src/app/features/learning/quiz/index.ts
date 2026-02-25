/**
 * Quiz Feature Module - DDD Architecture
 *
 * Barrel export for the Quiz feature following clean architecture principles
 */

// Domain
export {
  QuizEntity,
  QuestionEntity,
  QuizAttemptEntity
} from './domain/entities/quiz.entity';
export type { IQuizRepository } from './domain/repositories/quiz.repository';

// Application
export * from './application/use-cases/get-quiz-list.use-case';
export * from './application/use-cases/take-quiz.use-case';

// Infrastructure
export * from './infrastructure/services/quiz.service';

// Presentation
export * from './presentation/components/quiz-list.component';
