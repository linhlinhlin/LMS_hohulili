# Implementation Plan

## Phase 1: Core Distribution (Backend & Frontend Foundation)

- [x] 1. Set up data models and utilities




  - [ ] 1.1 Create allocation utility functions
    - Create `fe/src/app/features/teacher/assignment-hub/utils/allocation-utils.ts`
    - Implement `getAllocatedStudents()` function for ALL_STUDENTS distribution
    - Implement `getSpecificStudents()` function for SPECIFIC_STUDENTS distribution


    - Implement `isStudentAllocated()` function to check allocation status
    - _Requirements: 1.2, 1.3, 6.3, 6.4_
  - [ ]* 1.2 Write property tests for allocation utilities
    - **Property 1: All Students Distribution Completeness**


    - **Property 2: Specific Students Distribution Accuracy**
    - **Validates: Requirements 1.2, 1.3, 6.3, 6.4**

  - [ ] 1.3 Create task status utility functions
    - Create `fe/src/app/features/student/my-tasks/utils/task-utils.ts`
    - Implement `calculateTaskStatus()` function based on submission state and deadline



    - Implement `sortTasksByDueDate()` function for task ordering
    - Implement `isTaskOverdue()` function for overdue detection




    - _Requirements: 3.2, 3.3, 3.6_
  - [ ]* 1.4 Write property tests for task utilities
    - **Property 4: Task Status Consistency**
    - **Property 5: Task Sort Order**
    - **Validates: Requirements 3.2, 3.3, 3.6**



- [ ] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.



## Phase 2: Distribution UI in Assignment Hub

- [ ] 3. Implement distribution selector component
  - [x] 3.1 Create DistributionSelectorComponent



    - Create `fe/src/app/features/teacher/assignment-hub/components/distribution-selector.component.ts`
    - Implement radio buttons for "All Students" / "Specific Students"




    - Add multi-select dropdown with search for specific students
    - Display preview of selected student count
    - Default to "All Students" on initialization
    - _Requirements: 1.1, 1.2, 1.3_

  - [-] 3.2 Integrate distribution selector into Assignment Creation/Editor

    - Update `fe/src/app/features/teacher/assignment-hub/components/assignment-overview.component.ts`
    - Add distribution settings section to assignment form
    - Save distribution type and studentIds with assignment
    - _Requirements: 1.4_


  - [ ] 3.3 Create DistributionService
    - Create `fe/src/app/core/services/distribution.service.ts`
    - Implement `createAllocation()` method


    - Implement `getAllocatedStudents()` method
    - Implement `getStudentTasks()` method
    - Add signal-based state management



    - _Requirements: 1.4, 6.2_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Student My Tasks Dashboard

- [ ] 5. Implement Student My Tasks Dashboard


  - [ ] 5.1 Create MyTasksDashboardComponent
    - Create `fe/src/app/features/student/my-tasks/my-tasks-dashboard.component.ts`
    - Implement Kanban-style view with columns: To Do | In Progress | Completed
    - Add filter by course and status
    - Add sort by due date (nearest first)
    - _Requirements: 3.1, 3.6_
  - [ ] 5.2 Create TaskCardComponent
    - Create `fe/src/app/features/student/my-tasks/task-card.component.ts`
    - Display assignment title, course name, due date
    - Show status badge (Pending, Submitted, Graded, Overdue)
    - Add overdue visual indicator
    - Implement click navigation to assignment detail
    - _Requirements: 3.2, 3.3, 3.4_
  - [ ] 5.3 Set up student routes
    - Create `fe/src/app/features/student/my-tasks/my-tasks.routes.ts`




    - Add route `/student/my-tasks`
    - Update student sidebar navigation
    - _Requirements: 3.1_



- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Deadline Override System



- [x] 7. Implement deadline override functionality
  - [x] 7.1 Create deadline override utilities



    - Create `fe/src/app/features/teacher/assignment-hub/utils/deadline-utils.ts`
    - Implement `getEffectiveDeadline()` function that checks for override




    - Implement `createDeadlineOverride()` function
    - Implement `validateOverrideDate()` function
    - _Requirements: 4.3, 4.4_
  - [x]* 7.2 Write property tests for deadline utilities
    - **Property 3: Deadline Override Priority**
    - **Property 7: Override Audit Trail Completeness**
    - **Validates: Requirements 4.3, 4.4, 4.5**
  - [x] 7.3 Create DeadlineOverrideModalComponent


    - Create `fe/src/app/features/teacher/assignment-hub/components/deadline-override-modal.component.ts`
    - Implement date picker for new deadline
    - Add textarea for reason
    - Add validation (date must be in future)


    - _Requirements: 4.1, 4.2_
  - [x] 7.4 Integrate override into submission list
    - Update `fe/src/app/features/teacher/assignment-hub/components/submission-list.component.ts`



    - Add "Extend Deadline" action button for each student
    - Display custom deadline indicator for students with override




    - _Requirements: 4.1, 4.6_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Individual Assignment from Student Detail



- [ ] 9. Implement individual assignment feature
  - [x] 9.1 Create StudentAssignmentsTabComponent



    - Create `fe/src/app/features/teacher/students/student-assignments.component.ts`

    - Display list of assignments for the student


    - Show assignment title, due date, status, grade


    - Add "Assign Task" button


    - _Requirements: 2.1, 2.5_


  - [ ] 9.2 Create AssignTaskModalComponent
    - Create `fe/src/app/features/teacher/students/assign-task-modal.component.ts`
    - Display available assignments from student's courses
    - Allow selection and confirmation
    - Create individual allocation on confirm
    - _Requirements: 2.2, 2.3_
  - [ ] 9.3 Integrate into Student Detail page
    - Update `fe/src/app/features/teacher/students/student-detail.component.ts`
    - Add "Individual Assignments" tab
    - Wire up modal and refresh logic
    - _Requirements: 2.1_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Notification System

- [ ] 11. Implement notification system
  - [ ] 11.1 Create notification utilities
    - Create `fe/src/app/core/services/notification.service.ts`
    - Implement `sendAssignmentNotification()` method
    - Implement `sendReminderNotification()` method
    - Implement `sendGradeNotification()` method
    - Implement `markAsRead()` method
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 11.2 Write property tests for notification utilities
    - **Property 8: Notification Delivery Guarantee**
    - **Validates: Requirements 1.5, 7.1**
  - [ ] 11.3 Create NotificationBellComponent
    - Create `fe/src/app/shared/components/notification-bell.component.ts`
    - Display unread count badge
    - Dropdown list of recent notifications
    - Click to navigate to relevant page
    - _Requirements: 7.4, 7.5_
  - [ ] 11.4 Integrate notifications into header
    - Update app header component
    - Add notification bell
    - Wire up real-time updates
    - _Requirements: 7.4_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Reminder System & Final Integration

- [x] 13. Implement reminder system




  - [ ] 13.1 Create reminder utilities
    - Create `fe/src/app/core/services/reminder.service.ts`
    - Implement `calculateReminderDates()` function (D-3, D-1, D+0)
    - Implement `shouldSendReminder()` function
    - Handle deadline override in reminder calculations
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x]* 13.2 Write property tests for reminder utilities


    - **Property 6: Reminder Timing Accuracy**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**



  - [-] 13.3 Create reminder notification content

    - Implement reminder message templates


    - Include assignment title, course name, deadline


    - _Requirements: 5.5_






- [ ] 14. Final integration and cleanup
  - [ ] 14.1 Update Assignment Hub overview
    - Add allocation statistics display
    - Show total assigned, submitted, pending counts
    - _Requirements: 6.1_
  - [ ] 14.2 Update sidebar navigation
    - Add "My Tasks" link for students
    - Ensure proper icons and labels in Vietnamese
  - [ ] 14.3 Add loading states and error handling
    - Ensure consistent UX across all new components
    - Add proper error messages in Vietnamese
  - [ ] 14.4 Update audit log for deadline overrides
    - Log all deadline extensions with full details
    - _Requirements: 4.5_

- [ ] 15. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

