/**
 * Student Feature Module
 *
 * Barrel export for the Student feature following modern Angular practices
 * Provides clean imports and better tree-shaking
 */

// Components
export { StudentLayoutSimpleComponent } from './shared/student-layout-simple.component';
export { StudentDashboardComponent } from './dashboard/student-dashboard.component';

// Routes
export { studentRoutes } from './student.routes';

// Types
export * from './types';

// Services (if any)
// export { StudentService } from './services/student.service';