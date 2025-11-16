# Implementation Plan - Teacher Module Integration

## Overview
Kế hoạch thực hiện sáp nhập Teacher Module từ ThamKhao vào dự án hiện tại theo 5 phases. Mỗi task được thiết kế để thực hiện độc lập và có thể test ngay sau khi hoàn thành.

---

## Phase 1: Analysis & Preparation

- [x] 1. Phân tích sự khác biệt giữa ThamKhao và code hiện tại



  - So sánh cấu trúc folder giữa `ThamKhao/frontend/fe/src/app/features/teacher/` và `src/app/features/teacher/`
  - Liệt kê tất cả files tồn tại trong ThamKhao nhưng chưa có trong current
  - Liệt kê tất cả files trùng tên cần merge
  - Xác định files có HTML/SCSS trong current (cần preserve UI)
  - Tạo file `COMPARISON_REPORT.md` với chi tiết phân tích
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Tạo backup và verify môi trường

  - Tạo git branch backup với tên `backup/teacher-integration-{timestamp}`
  - Push backup branch lên remote repository
  - Verify dự án hiện tại build thành công: `ng build`
  - Verify development server chạy được: `ng serve`
  - Document lại trạng thái hiện tại của các file quan trọng
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

---

## Phase 2: Foundation - Services & Types


- [x] 3. Merge Type Definitions

- [x] 3.1 Backup file types hiện tại

  - Copy `src/app/features/teacher/types/teacher.types.ts` sang `teacher.types.backup.ts`
  - _Requirements: 2.5_


- [ ] 3.2 So sánh và merge interfaces
  - Đọc `ThamKhao/frontend/fe/src/app/features/teacher/types/teacher.types.ts`
  - Đọc `src/app/features/teacher/types/teacher.types.ts`
  - Identify new interfaces trong ThamKhao: CreateCourseRequest, UpdateCourseRequest, Section, Lesson, Quiz, etc.
  - Identify updated interfaces: TeacherCourse với fields mới (code, teacherId, sections)
  - Merge tất cả interfaces vào file hiện tại
  - Add JSDoc comments cho clarity
  - _Requirements: 3.2_


- [ ] 3.3 Verify compilation
  - Run `ng build` để check TypeScript errors
  - Fix any compilation issues
  - _Requirements: 4.5_

- [x] 4. Copy NotificationService (NEW)



- [x] 4.1 Copy service file

  - Copy `ThamKhao/frontend/fe/src/app/features/teacher/services/notification.service.ts`
  - To `src/app/features/teacher/infrastructure/services/notification.service.ts`
  - _Requirements: 3.3_


- [ ] 4.2 Update imports
  - Fix import paths to match current project structure
  - Update type imports from `../types/teacher.types`
  - _Requirements: 3.5_


- [ ] 4.3 Verify service compiles
  - Run `ng build`
  - Fix any errors
  - _Requirements: 4.5_

- [-] 5. Merge TeacherService


- [x] 5.1 Backup current service

  - Copy `src/app/features/teacher/infrastructure/services/teacher.service.ts` to `teacher.service.backup.ts`
  - _Requirements: 2.5_


- [ ] 5.2 Compare service implementations
  - Read ThamKhao version: `ThamKhao/frontend/fe/src/app/features/teacher/services/teacher.service.ts`
  - Read current version: `src/app/features/teacher/infrastructure/services/teacher.service.ts`
  - List new methods in ThamKhao version
  - List updated methods with different logic
  - _Requirements: 3.1_


- [ ] 5.3 Merge service logic
  - Keep current file location (`infrastructure/services/`)
  - Add new methods from ThamKhao
  - Update existing methods with improved logic from ThamKhao
  - Preserve Angular Signals structure
  - Update API endpoints to match backend
  - Ensure all imports are correct

  - _Requirements: 3.1, 3.4_

- [x] 5.4 Verify service compiles and works


  - Run `ng build`
  - Fix compilation errors
  - Verify no runtime errors in console
  - _Requirements: 3.5, 4.5_

---

## Phase 3: Core Components - Dashboard & Courses

- [x] 6. Merge Dashboard Component




- [x] 6.1 Compare dashboard implementations

  - Read ThamKhao: `ThamKhao/frontend/fe/src/app/features/teacher/dashboard/teacher-dashboard.component.ts`
  - Read current: `src/app/features/teacher/dashboard/teacher-dashboard.component.ts`
  - Identify new properties, methods, and logic
  - _Requirements: 4.1_


- [ ] 6.2 Merge TypeScript logic
  - Update `src/app/features/teacher/dashboard/teacher-dashboard.component.ts`
  - Add new Signal declarations from ThamKhao
  - Add new computed properties
  - Update API calls to use merged TeacherService
  - Preserve existing lifecycle hooks
  - _Requirements: 4.1, 4.3_


- [ ] 6.3 Verify template compatibility
  - Check that all template bindings in HTML still work
  - Verify no missing properties or methods
  - Keep existing HTML and SCSS files (they have UI improvements)

  - _Requirements: 4.1, 4.4_

- [ ] 6.4 Test dashboard component
  - Run `ng serve`
  - Navigate to `/teacher/dashboard`
  - Verify component loads without errors
  - Check console for any warnings
  - _Requirements: 6.2, 6.3_

- [x] 7. Merge Course Management Components




- [x] 7.1 Merge course-management.component

  - Compare ThamKhao and current TypeScript files
  - Merge logic into `src/app/features/teacher/courses/course-management.component.ts`
  - Keep existing HTML and SCSS files
  - Verify template bindings work
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7.2 Merge course-creation.component

  - Compare ThamKhao and current TypeScript files
  - Merge logic into `src/app/features/teacher/courses/course-creation.component.ts`
  - Keep existing HTML and SCSS files
  - Update form handling if needed
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7.3 Merge course-editor.component

  - Compare ThamKhao and current TypeScript files
  - Merge logic into `src/app/features/teacher/courses/course-editor.component.ts`
  - Keep existing HTML and SCSS files
  - Verify edit functionality works
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7.4 Copy section components (NEW)

  - Copy `ThamKhao/.../courses/section-editor.component.ts` to `src/app/features/teacher/courses/`
  - Copy `ThamKhao/.../courses/section-list.component.ts` to `src/app/features/teacher/courses/`
  - Update imports to match project structure
  - _Requirements: 4.2_

- [x] 7.5 Test course components

  - Navigate to `/teacher/courses`
  - Test create course flow
  - Test edit course flow
  - Test section management
  - Verify no console errors
  - _Requirements: 6.2, 6.3_

---

## Phase 4: Extended Features - Assignments & Students

- [ ] 8. Merge Assignment Components
- [ ] 8.1 Merge assignment-management.component
  - Compare and merge TypeScript logic
  - Keep existing HTML/SCSS if they exist
  - Update to use merged TeacherService
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 8.2 Merge assignment-creation.component
  - Compare and merge TypeScript logic
  - Keep existing HTML/SCSS
  - Verify form validation works
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 8.3 Merge assignment-editor.component
  - Compare and merge TypeScript logic
  - Keep existing HTML/SCSS
  - Test edit functionality
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 8.4 Merge assignment-submissions.component
  - Compare and merge TypeScript logic
  - Keep existing HTML/SCSS
  - Verify submission list displays correctly
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 8.5 Handle assignment-detail.component
  - Check if exists in current (it doesn't based on listing)
  - Copy from ThamKhao if needed
  - Update imports
  - _Requirements: 4.2_

- [ ] 8.6 Test assignment components
  - Navigate to `/teacher/assignments`
  - Test create assignment
  - Test edit assignment
  - Test view submissions
  - Verify all features work
  - _Requirements: 6.2, 6.3_

- [ ] 9. Merge Student Management Components
- [ ] 9.1 Merge student-management.component
  - Compare TypeScript files
  - Merge logic into current file
  - Keep existing HTML and SCSS (they have UI improvements)
  - Update API calls
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 9.2 Merge student-detail.component
  - Compare TypeScript files
  - Merge logic
  - Copy HTML/SCSS from ThamKhao if current doesn't have them
  - _Requirements: 4.1, 4.2_

- [ ] 9.3 Test student components
  - Navigate to `/teacher/students`
  - Test student list display
  - Test view student details
  - Test enroll student functionality
  - _Requirements: 6.2, 6.3_

---

## Phase 5: Advanced Features - Quiz, Grading, Analytics

- [ ] 10. Merge Quiz Components
- [ ] 10.1 Compare quiz module files
  - List all quiz files in ThamKhao
  - List all quiz files in current
  - Identify differences
  - _Requirements: 4.1_

- [ ] 10.2 Merge quiz components
  - For each quiz component, compare and merge TypeScript logic
  - Keep HTML/SCSS from current if they exist
  - Copy from ThamKhao if current doesn't have them
  - Components: quiz-create, quiz-edit, quiz-preview, quiz-bank, question-create, question-edit
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 10.3 Merge quiz.routes.ts
  - Compare route configurations
  - Merge all routes
  - Ensure lazy loading works
  - _Requirements: 5.1, 5.4_

- [ ] 10.4 Test quiz functionality
  - Navigate to quiz routes
  - Test create quiz
  - Test add questions
  - Test preview quiz
  - _Requirements: 6.2, 6.3_

- [ ] 11. Merge Grading Components
- [ ] 11.1 Merge grading components
  - Compare and merge: advanced-grading-system, assignment-grader, rubric-creator, rubric-editor, rubric-manager
  - Keep HTML/SCSS from current if exist
  - Update TypeScript logic from ThamKhao
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 11.2 Test grading functionality
  - Navigate to `/teacher/grading`
  - Test rubric creation
  - Test assignment grading
  - Verify rubric application works
  - _Requirements: 6.2, 6.3_

- [ ] 12. Merge Analytics Component
- [ ] 12.1 Compare analytics implementations
  - Read both versions of teacher-analytics.component.ts
  - Identify new features in ThamKhao
  - _Requirements: 4.1_

- [ ] 12.2 Merge analytics logic
  - Update TypeScript file with ThamKhao logic
  - Keep HTML/SCSS from current if they exist
  - Verify charts and statistics display correctly
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 12.3 Test analytics
  - Navigate to `/teacher/analytics`
  - Verify data loads
  - Check charts render
  - _Requirements: 6.2, 6.3_

- [ ] 13. Merge Notifications Component
- [ ] 13.1 Merge notifications component
  - Compare TypeScript files
  - Merge logic
  - Keep HTML/SCSS from current if exist
  - Integrate with NotificationService
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 13.2 Test notifications
  - Navigate to `/teacher/notifications`
  - Verify notifications display
  - Test mark as read
  - Test filter functionality
  - _Requirements: 6.2, 6.3_

---

## Phase 6: Routing & Integration

- [ ] 14. Update Routing Configuration
- [ ] 14.1 Backup current routes
  - Copy `src/app/features/teacher/teacher.routes.ts` to `teacher.routes.backup.ts`
  - _Requirements: 2.5_

- [ ] 14.2 Merge route configurations
  - Compare ThamKhao and current teacher.routes.ts
  - Add any missing routes from ThamKhao
  - Standardize route naming (use `/courses/create` instead of `/course-creation`)
  - Ensure all lazy-loaded components exist
  - Verify teacherGuard is applied correctly
  - Import and use quiz.routes properly
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 14.3 Test all routes
  - Navigate to each route manually
  - Verify all routes load without errors
  - Check lazy loading works
  - Test route guards
  - _Requirements: 5.5, 6.2_

- [ ] 15. Merge Shared Components
- [ ] 15.1 Merge teacher-layout-simple.component
  - Compare TypeScript files
  - Merge logic
  - Keep HTML/SCSS from current
  - _Requirements: 4.1, 4.2_

- [ ] 15.2 Merge teacher-sidebar-simple.component
  - Compare TypeScript files
  - Merge logic
  - Keep HTML/SCSS from current
  - _Requirements: 4.1, 4.2_

- [ ] 15.3 Test layout components
  - Verify sidebar displays correctly
  - Test navigation links
  - Check responsive behavior
  - _Requirements: 6.2_

---

## Phase 7: Testing & Validation

- [ ] 16. Comprehensive Build Verification
- [ ] 16.1 Run production build
  - Execute `ng build --configuration production`
  - Verify build completes without errors
  - Check for any warnings
  - _Requirements: 6.1_

- [ ] 16.2 Run development server
  - Execute `ng serve`
  - Verify application starts without errors
  - Check console for warnings
  - _Requirements: 6.2_

- [ ] 16.3 Verify no TypeScript errors
  - Check all imports resolve correctly
  - Verify no type errors
  - Ensure all components compile
  - _Requirements: 4.5, 6.1_

- [ ] 17. Functional Testing
- [ ] 17.1 Test Dashboard
  - Navigate to `/teacher/dashboard`
  - Verify statistics display correctly
  - Check course list loads
  - Verify student count shows
  - Test recent assignments display
  - _Requirements: 6.3, 6.4_

- [ ] 17.2 Test Course Management
  - List all courses
  - Create new course
  - Edit existing course
  - Delete course (if applicable)
  - Test section management
  - _Requirements: 6.3, 6.4_

- [ ] 17.3 Test Assignment Management
  - List assignments
  - Create new assignment
  - Edit assignment
  - View submissions
  - Test grading flow
  - _Requirements: 6.3, 6.4_

- [ ] 17.4 Test Student Management
  - List students
  - View student details
  - Test enroll student
  - Test bulk enrollment (if applicable)
  - _Requirements: 6.3, 6.4_

- [ ] 17.5 Test Quiz System
  - Create quiz
  - Add questions
  - Edit quiz
  - Preview quiz
  - _Requirements: 6.3, 6.4_

- [ ] 17.6 Test Grading System
  - Create rubric
  - Apply rubric to assignment
  - Grade with rubric
  - View grade distribution
  - _Requirements: 6.3, 6.4_

- [ ] 17.7 Test Analytics
  - View course performance
  - Check student engagement metrics
  - Verify charts render
  - _Requirements: 6.3, 6.4_

- [ ] 17.8 Test Notifications
  - View notifications
  - Mark as read
  - Filter by type
  - Update preferences
  - _Requirements: 6.3, 6.4_

- [ ] 18. API Integration Testing
- [ ] 18.1 Verify API calls
  - Open browser DevTools Network tab
  - Navigate through teacher features
  - Verify all API calls return 200 status
  - Check response data format matches expectations
  - _Requirements: 6.4_

- [ ] 18.2 Test error handling
  - Simulate API errors (disconnect backend)
  - Verify error messages display correctly
  - Check fallback behavior works
  - _Requirements: 6.4_

- [ ] 18.3 Verify Signals update UI
  - Make changes (create/edit/delete)
  - Verify UI updates immediately
  - Check no manual refresh needed
  - _Requirements: 6.5_

---

## Phase 8: Documentation & Handover

- [ ] 19. Create Integration Report
- [ ] 19.1 Document all changes
  - Create `INTEGRATION_REPORT.md` in `.kiro/specs/teacher-module-integration/`
  - List all files merged
  - List all files copied
  - List all files modified
  - _Requirements: 7.1, 7.2_

- [ ] 19.2 Document breaking changes
  - List any API changes
  - Document route changes
  - Note any deprecated features
  - _Requirements: 7.3_

- [ ] 19.3 Document preserved UI improvements
  - List all HTML/SCSS files kept from current
  - Describe UI improvements preserved
  - Include screenshots if helpful
  - _Requirements: 7.4_

- [ ] 19.4 Create verification checklist
  - Provide step-by-step checklist for team
  - Include test scenarios
  - Add troubleshooting tips
  - _Requirements: 7.5_

- [ ] 20. Final Cleanup
- [ ] 20.1 Remove backup files
  - Delete `.backup.ts` files created during merge
  - Keep only final merged versions
  - _Requirements: 7.1_

- [ ] 20.2 Update comments and documentation
  - Add JSDoc comments where needed
  - Update README if necessary
  - Document any known issues
  - _Requirements: 7.1_

- [ ] 20.3 Commit changes
  - Create meaningful commit messages
  - Push to repository
  - Create pull request if needed
  - _Requirements: 7.1_

---

## Success Criteria

✅ All tasks completed
✅ `ng build --configuration production` succeeds without errors
✅ All teacher routes accessible and functional
✅ No console errors in browser
✅ All API calls return expected data
✅ UI improvements from current code preserved
✅ New features from ThamKhao working
✅ Integration report created
✅ Team can verify and maintain code

---

## Rollback Plan

If critical issues arise:

1. **Immediate Rollback:**
   ```bash
   git checkout backup/teacher-integration-{timestamp}
   ```

2. **Partial Rollback:**
   - Revert specific commits
   - Cherry-pick working changes

3. **File-Level Rollback:**
   - Use `.backup.ts` files created during merge
   - Restore specific components

---

## Notes

- Each task should be completed and tested before moving to next
- Create git commits after each major phase
- Keep backup files until final verification
- Test incrementally to catch issues early
- Document any deviations from plan
