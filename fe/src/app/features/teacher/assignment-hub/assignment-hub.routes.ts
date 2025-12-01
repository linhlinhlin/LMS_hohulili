import { Routes } from '@angular/router';

/**
 * Assignment Hub Routes
 * 
 * Unified routing for Assignment-Grading Hub following expert recommendations.
 * Clean RESTful URL structure with lazy loading.
 * 
 * Routes:
 * - /assignments (list)
 * - /assignments/create
 * - /assignments/:id (redirect to overview)
 * - /assignments/:id/overview
 * - /assignments/:id/submissions
 * - /assignments/:id/settings
 * - /assignments/:id/rubric
 * - /assignments/:id/audit-log
 * - /assignments/:id/grade/:submissionId (SpeedGrader)
 * - /assignments/rubrics (Rubric Library)
 */
export const assignmentHubRoutes: Routes = [
  // Assignment List
  {
    path: '',
    loadComponent: () => import('./components/assignment-list.component').then(m => m.AssignmentListComponent),
    title: 'Quan ly Bai tap'
  },
  
  // Create Assignment
  {
    path: 'create',
    loadComponent: () => import('../assignments/assignment-creation.component').then(m => m.AssignmentCreationComponent),
    title: 'Tao bai tap moi'
  },
  
  // Rubric Library (Global)
  {
    path: 'rubrics',
    loadComponent: () => import('../grading/rubric-manager.component').then(m => m.RubricManagerComponent),
    title: 'Thu vien Rubric'
  },
  {
    path: 'rubrics/create',
    loadComponent: () => import('../grading/rubric-creator.component').then(m => m.RubricCreatorComponent),
    title: 'Tao Rubric moi'
  },
  {
    path: 'rubrics/edit/:rubricId',
    loadComponent: () => import('../grading/rubric-editor.component').then(m => m.RubricEditorComponent),
    title: 'Chinh sua Rubric'
  },
  
  // Assignment Detail with Tabs
  {
    path: ':id',
    loadComponent: () => import('./components/assignment-detail-layout.component').then(m => m.AssignmentDetailLayoutComponent),
    children: [
      // Default redirect to overview
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      },
      
      // Overview Tab
      {
        path: 'overview',
        loadComponent: () => import('./components/assignment-overview.component').then(m => m.AssignmentOverviewComponent),
        title: 'Tong quan bai tap'
      },
      
      // Submissions Tab
      {
        path: 'submissions',
        loadComponent: () => import('./components/submission-list.component').then(m => m.SubmissionListComponent),
        title: 'Danh sach bai nop'
      },
      
      // Settings Tab
      {
        path: 'settings',
        loadComponent: () => import('../assignments/assignment-editor.component').then(m => m.AssignmentEditorComponent),
        title: 'Cai dat bai tap'
      },
      
      // Rubric Tab (Assignment-specific)
      {
        path: 'rubric',
        loadComponent: () => import('./components/assignment-rubric.component').then(m => m.AssignmentRubricComponent),
        title: 'Rubric bai tap'
      },
      
      // Audit Log Tab (STCW Compliance)
      {
        path: 'audit-log',
        loadComponent: () => import('./components/assignment-audit-log.component').then(m => m.AssignmentAuditLogComponent),
        title: 'Lich su thao tac'
      }
    ]
  },
  
  // SpeedGrader (Full screen mode)
  {
    path: ':id/grade/:submissionId',
    loadComponent: () => import('./components/speed-grader.component').then(m => m.SpeedGraderComponent),
    title: 'Cham diem'
  },
  
  // Legacy route: /assignments/:id/edit -> redirect to settings
  {
    path: ':id/edit',
    redirectTo: ':id/settings',
    pathMatch: 'full'
  }
];

