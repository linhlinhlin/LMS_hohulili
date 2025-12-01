# Implementation Plan

## Phase 1: Foundation & Core Services

- [ ] 1. Set up project structure and core utilities
  - [x] 1.1 Create assignment validators utility



    - Create `fe/src/app/features/teacher/assignments/utils/assignment-validators.ts`
    - Implement `validateAssignmentCreation()` function for required fields validation
    - Implement `validateMaxScore()` function for range validation (1-1000)
    - Implement `validateGrade()` function for grade range validation (0-maxScore)
    - _Requirements: 2.2, 2.4, 5.2_
  - [x]* 1.2 Write property tests for assignment validators


    - **Property 3: Assignment Creation Validation**
    - **Property 4: Max Score Range Validation**



    - **Property 7: Grade Range Validation**
    - **Validates: Requirements 2.2, 2.4, 5.2**
  - [x] 1.3 Create submission utilities

    - Create `fe/src/app/features/teacher/assignments/utils/submission-utils.ts`
    - Implement `isLateSubmission()` function to detect late submissions
    - Implement `sortSubmissionsByDueDate()` function for pending submissions
    - _Requirements: 4.3, 7.2_
  - [x]* 1.4 Write property tests for submission utilities



    - **Property 6: Late Submission Detection**
    - **Property 11: Pending Submissions Sort Order**
    - **Validates: Requirements 4.3, 7.2**

- [x] 2. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Assignment List & Filtering

- [x] 3. Implement assignment list utilities

  - [ ] 3.1 Create assignment filter and sort utilities
    - Create `fe/src/app/features/teacher/assignments/utils/assignment-list-utils.ts`


    - Implement `filterAssignments()` function for status, course, keyword filtering
    - Implement `sortAssignments()` function for column-based sorting
    - _Requirements: 1.2, 1.3_
  - [x]* 3.2 Write property tests for assignment list utilities


    - **Property 1: Assignment List Filter Consistency**
    - **Property 2: Assignment List Sort Order**

    - **Validates: Requirements 1.2, 1.3**
  - [ ] 3.3 Refactor AssignmentManagementComponent
    - Update `fe/src/app/features/teacher/assignments/assignment-management.component.ts`
    - Replace mock data with real API integration
    - Use new filter and sort utilities


    - Add loading and error states
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Assignment CRUD Operations



- [ ] 5. Enhance assignment creation and editing
  - [x] 5.1 Create AssignmentStateService

    - Create `fe/src/app/features/teacher/assignments/services/assignment-state.service.ts`


    - Implement signal-based state management
    - Add methods for CRUD operations
    - Implement caching and optimistic updates
    - _Requirements: 2.1, 3.2_
  - [x]* 5.2 Write property test for assignment data round-trip


    - **Property 5: Assignment Data Round-Trip**
    - **Validates: Requirements 3.1, 3.2**

  - [ ] 5.3 Enhance AssignmentCreationComponent
    - Update `fe/src/app/features/teacher/assignments/assignment-creation.component.ts`
    - Integrate with AssignmentStateService
    - Add proper validation feedback


    - Improve file upload UX

    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ] 5.4 Enhance AssignmentEditorComponent
    - Update `fe/src/app/features/teacher/assignments/assignment-editor.component.ts`
    - Load assignment data properly
    - Add status change functionality


    - Improve validation and error handling
    - _Requirements: 3.1, 3.2, 3.3, 3.4_


- [x] 6. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Submissions Management

- [ ] 7. Enhance submissions management
  - [x] 7.1 Enhance AssignmentSubmissionsComponent

    - Update `fe/src/app/features/teacher/assignments/assignment-submissions.component.ts`
    - Replace mock data with real API integration
    - Add late submission indicators
    - Add inline PDF/Image preview capability
    - Support maritime file metadata display
    - Improve submission list display
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [x] 7.2 Implement Split-View Layout for Grading (SpeedGraderLayout)


    - Create `fe/src/app/features/teacher/grading/speed-grader-layout.component.ts`
    - Implement split-view: Left panel (file viewer with independent scroll), Right panel (grading form - fixed)
    - Use `@defer` for lazy loading PDF Viewer (Angular v20 optimization)
    - Handle CSS/Layout for ultrawide monitors (maritime lab environments)
    - Add score input with validation
    - Add feedback textarea
    - _Requirements: 5.1, 5.2, 5.3, 5.7_




  - [x] 7.3 Implement Auto-Save Mechanism for Draft Grades

    - Add auto-save functionality to GradingStateService
    - Save draft grades periodically (every 30 seconds or on rubric selection change)
    - Handle offline scenarios gracefully
    - _Requirements: 5.6_
  - [x]* 7.4 Write property test for grade persistence

    - **Property 8: Grade Persistence**
    - **Validates: Requirements 5.3, 5.5**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 5: Rubric System

- [x] 9. Implement rubric utilities and components

  - [ ] 9.1 Create rubric calculator utility
    - Create `fe/src/app/features/teacher/grading/utils/rubric-calculator.ts`
    - Implement `calculateRubricScore()` function (idempotent)
    - Implement `validateRubricDeletion()` function
    - Implement `validateRubricWeightSum()` function (must equal 100%)
    - _Requirements: 6.4, 6.5, 6.6, 6.7_
  - [x]* 9.2 Write property tests for rubric utilities




    - **Property 9: Rubric Score Calculation**
    - **Property 10: Rubric Deletion Guard**
    - **Property 13: Rubric Weight Sum Integrity**


    - **Property 14: Grading Idempotency**

    - **Validates: Requirements 6.4, 6.5, 6.6, 6.7**
  - [ ] 9.3 Implement RubricManagerComponent
    - Update `fe/src/app/features/teacher/grading/rubric-manager.component.ts`

    - Display rubric list with statistics

    - Add create/edit/delete actions
    - _Requirements: 6.2, 6.5_
  - [x] 9.4 Implement RubricCreatorComponent

    - Update `fe/src/app/features/teacher/grading/rubric-creator.component.ts`
    - Build dynamic criteria form
    - Add point value configuration
    - Add preview mode
    - _Requirements: 6.1_
  - [x] 9.5 Implement RubricEditorComponent

    - Update `fe/src/app/features/teacher/grading/rubric-editor.component.ts`
    - Load existing rubric data
    - Allow criteria modification
    - _Requirements: 6.3_
  - [x] 9.6 Create RubricGraderComponent


    - Create `fe/src/app/features/teacher/grading/rubric-grader.component.ts`
    - Display rubric criteria in grading context
    - Allow level selection for each criterion
    - Auto-calculate total score
    - _Requirements: 6.4_

- [x] 10. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Grading Dashboard & Advanced Features

- [ ] 11. Implement grading dashboard
  - [x] 11.1 Create GradingStateService

    - Create `fe/src/app/features/teacher/grading/services/grading-state.service.ts`
    - Implement pending submissions tracking
    - Add statistics computation
    - _Requirements: 7.1, 7.2_
  - [x] 11.2 Implement GradingDashboardComponent


    - Update `fe/src/app/features/teacher/grading/advanced-grading-system.component.ts`
    - Display summary statistics
    - Show pending submissions list sorted by due date
    - Add quick navigation to grading
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 11.3 Integrate SpeedGraderLayout with Dashboard

    - Connect SpeedGraderLayout to grading dashboard navigation
    - Implement full submission view with file preview
    - Integrate rubric grading component
    - Add feedback editor with rich text support
    - Ensure auto-save integration
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 6.4_

- [x] 12. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Export & Final Integration

- [ ] 13. Implement export functionality
  - [x] 13.1 Create export utility


    - Create `fe/src/app/features/teacher/assignments/utils/export-utils.ts`
    - Implement `prepareExportData()` function
    - Ensure all required fields are included
    - _Requirements: 8.1, 8.3_
  - [x]* 13.2 Write property test for export data completeness


    - **Property 12: Export Data Completeness**
    - **Validates: Requirements 8.1, 8.3**
  - [x] 13.3 Add export button to AssignmentSubmissionsComponent

    - Integrate export functionality
    - Add download trigger
    - _Requirements: 8.1, 8.2_

- [ ] 14. Final integration and cleanup
  - [x] 14.1 Update teacher routes if needed



    - Verify all routes are correctly configured
    - Add any missing routes
  - [x] 14.2 Update sidebar navigation


    - Ensure grading and rubric links are visible
    - Add proper icons and labels
  - [x] 14.3 Add loading states and error handling

    - Ensure consistent UX across all components
    - Add proper error messages in Vietnamese

- [x] 15. Final Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.
