# Implementation Plan - Teacher Domain
./mvnw spring-boot:run
## Overview

Kế hoạch implementation cho Teacher Domain, chia thành các tasks nhỏ, có thể thực thi tuần tự. Mỗi task tham chiếu đến requirements cụ thể và có thể được thực hiện độc lập.

**Priority:** Focus vào Student Management trước (để sửa lỗi 403), sau đó mở rộng sang các features khác.

## Task List

- [ ] 1. Setup Teacher Domain Infrastructure
  - Tạo cấu trúc package và base classes cho Teacher Domain
  - Setup DTOs, Value Objects, và base repositories
  - _Requirements: Technical Constraints_

- [x] 1.1 Create DTOs for Student Management



  - Tạo `TeacherStudentSummaryDTO.java`
  - Tạo `TeacherStudentDetailDTO.java`
  - Tạo `StudentCourseProgressDTO.java`
  - Tạo `StudentAssignmentSummaryDTO.java`
  - Tạo `StudentAnalyticsDTO.java`
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 1.2 Create Value Objects
  - Tạo `Progress.java` value object với validation
  - Tạo `Grade.java` value object với letter grade calculation
  - Tạo `StudentAnalytics.java` value object
  - _Requirements: 6.1, 6.2_

- [ ] 1.3 Create Custom Exceptions
  - Tạo `TeacherDomainException.java`
  - Tạo `AccessDeniedException.java`
  - Tạo `NotFoundException.java`
  - Tạo `ValidationException.java`
  - _Requirements: Error Handling_

- [x] 2. Implement Teacher Domain Service


  - Implement business logic thuần túy, không phụ thuộc infrastructure
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 2.1 Create TeacherDomainService


  - Tạo `TeacherDomainService.java` với interface
  - Implement `calculateStudentProgress(User student, Course course)`
  - Implement `calculateAverageGrade(User student, List<Course> courses)`
  - Implement `verifyTeacherStudentAccess(UUID teacherId, UUID studentId)`
  - _Requirements: 6.1, 6.2_

- [x] 2.2 Implement Progress Calculation Logic

  - Logic đếm total lessons trong course
  - Logic đếm completed lessons của student
  - Logic tính percentage
  - Validation và edge cases (course không có lesson, etc.)
  - _Requirements: 6.1, 6.2_

- [x] 2.3 Implement Grade Calculation Logic

  - Logic lấy tất cả submissions của student
  - Logic tính average score
  - Logic xử lý submissions chưa chấm điểm
  - _Requirements: 6.1, 4.1, 4.2_



- [-] 3. Implement Teacher Application Service

  - Orchestrate use cases, manage transactions, map DTOs
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3.1 Create TeacherApplicationService

  - Tạo `TeacherApplicationService.java`
  - Inject dependencies (repositories, domain service)
  - Setup transaction management với `@Transactional`
  - _Requirements: 6.1, 6.2_

- [x] 3.2 Implement getMyStudents Method

  - Get teacher's courses từ database
  - Get students từ courses (với JOIN FETCH để tránh N+1)
  - Calculate progress và grades cho mỗi student
  - Apply filters (courseId, status, search)
  - Apply pagination
  - Map entities sang DTOs
  - _Requirements: 6.1, 6.2_

- [x] 3.3 Implement getStudentDetail Method

  - Verify teacher has access to student
  - Get student entity từ database
  - Get course progress cho student
  - Get assignment submissions
  - Calculate analytics
  - Map sang TeacherStudentDetailDTO
  - _Requirements: 6.2_

- [ ] 3.4 Implement getStudentAnalytics Method
  - Calculate total study time
  - Calculate average session time
  - Calculate streak days
  - Identify strong subjects và improvement areas
  - Get learning activity history
  - Map sang StudentAnalyticsDTO
  - _Requirements: 6.3, 7.1, 7.2_

- [ ] 3.5 Implement updateStudentStatus Method
  - Verify teacher has access
  - Validate status value
  - Update student status
  - Log audit trail
  - _Requirements: 6.1_

- [ ] 3.6 Implement sendMessageToStudent Method
  - Verify teacher has access
  - Validate message content
  - Send message (integrate với messaging service)
  - Log message sent
  - _Requirements: 8.1, 8.4, 8.6_

- [ ] 4. Create Repository Queries
  - Tạo custom queries cho Teacher domain
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 4.1 Add Queries to CourseRepository

  - `findByTeacherIdWithStudents(UUID teacherId)` - JOIN FETCH students
  - `findByTeacherIdAndCourseId(UUID teacherId, UUID courseId)`
  - Optimize với indexes
  - _Requirements: 6.1_

- [ ] 4.2 Add Queries to UserRepository
  - `findStudentsByTeacherCourses(UUID teacherId, Pageable pageable)`
  - `searchStudentsByTeacherCourses(UUID teacherId, String search, Pageable pageable)`
  - `existsStudentInTeacherCourses(UUID teacherId, UUID studentId)`
  - _Requirements: 6.1_

- [x] 4.3 Add Queries to StudentLessonProgressRepository

  - `countCompletedLessonsByCourse(UUID studentId, UUID courseId)`
  - `findProgressByStudent(UUID studentId)`
  - _Requirements: 6.2_


- [ ] 4.4 Add Queries to SubmissionRepository
  - `findByStudentAndTeacherCourses(UUID studentId, UUID teacherId)`
  - `calculateAverageScoreByStudent(UUID studentId)`
  - _Requirements: 6.2, 4.1_



- [-] 5. Implement TeacherController

  - Create REST API endpoints với proper error handling
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.1_

- [x] 5.1 Create TeacherController Class

  - Tạo `TeacherController.java` với `@RestController`
  - Setup `@RequestMapping("/api/v1/teacher")`
  - Inject `TeacherApplicationService`
  - Setup OpenAPI documentation annotations
  - _Requirements: 6.1_


- [x] 5.2 Implement GET /students Endpoint




  - Handle query parameters (page, size, courseId, status, search)
  - Call `teacherApplicationService.getMyStudents()`
  - Return `ApiResponse<Page<TeacherStudentSummaryDTO>>`
  - Add `@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")`
  - Handle exceptions và return proper error responses
  - _Requirements: 6.1_


- [ ] 5.3 Implement GET /students/{id} Endpoint
  - Extract studentId từ path variable
  - Call `teacherApplicationService.getStudentDetail()`
  - Return `ApiResponse<TeacherStudentDetailDTO>`
  - Handle 404 Not Found
  - Handle 403 Forbidden
  - _Requirements: 6.2_

- [ ] 5.4 Implement GET /students/{id}/analytics Endpoint
  - Extract studentId và query params
  - Call `teacherApplicationService.getStudentAnalytics()`
  - Return `ApiResponse<StudentAnalyticsDTO>`
  - _Requirements: 6.3, 7.1_

- [ ] 5.5 Implement PATCH /students/{id}/status Endpoint
  - Extract studentId và request body
  - Validate status value
  - Call `teacherApplicationService.updateStudentStatus()`
  - Return success message
  - _Requirements: 6.1_

- [ ] 5.6 Implement POST /students/{id}/messages Endpoint
  - Extract studentId và message body
  - Validate message content
  - Call `teacherApplicationService.sendMessageToStudent()`
  - Return success message với messageId
  - _Requirements: 8.1, 8.4, 8.6_

- [ ] 6. Add Security Configuration
  - Update SecurityConfig để allow teacher endpoints
  - _Requirements: Security Requirements_

- [ ] 6.1 Update SecurityConfig.java
  - Verify `/api/v1/teacher/**` đã có trong security config
  - Ensure `hasAnyRole('TEACHER', 'ADMIN')` được apply
  - Test với JWT token
  - _Requirements: Security Requirements_

- [ ] 7. Write Unit Tests
  - Test business logic trong isolation
  - _Requirements: All requirements_

- [ ] 7.1 Test TeacherDomainService
  - Test `calculateStudentProgress()` với different scenarios
  - Test `calculateAverageGrade()` với submissions
  - Test `verifyTeacherStudentAccess()` với valid/invalid access
  - Test edge cases (no lessons, no submissions, etc.)
  - _Requirements: 6.1, 6.2_

- [ ] 7.2 Test TeacherApplicationService
  - Test `getMyStudents()` với filters và pagination
  - Test `getStudentDetail()` với valid student
  - Test `getStudentDetail()` với invalid access (should throw)
  - Test `updateStudentStatus()` với valid/invalid status
  - Mock repositories và domain service
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 7.3 Test Value Objects
  - Test `Progress.of()` với valid/invalid values
  - Test `Grade.of()` với valid/invalid grades
  - Test `Grade.getLetterGrade()` calculation
  - Test immutability
  - _Requirements: 6.1, 6.2_



- [ ] 8. Write Integration Tests
  - Test API endpoints với real database
  - _Requirements: All requirements_

- [ ] 8.1 Test TeacherController Integration
  - Test GET /students với valid teacher token
  - Test GET /students với student token (should return 403)
  - Test GET /students với filters
  - Test GET /students/{id} với valid/invalid studentId
  - Test PATCH /students/{id}/status
  - Use `@SpringBootTest` và `MockMvc`
  - _Requirements: 6.1, 6.2_

- [ ] 8.2 Test Repository Queries
  - Test custom queries với test data
  - Verify JOIN FETCH works correctly
  - Test pagination
  - Test search functionality
  - _Requirements: 6.1, 6.2_

- [-] 9. Frontend - Fix StudentApi

  - Update API client để gọi đúng endpoint
  - _Requirements: 6.1_


- [x] 9.1 Fix getTeacherStudents Method


  - Update endpoint từ `/api/v1/teacher/students`
  - Remove undefined values từ params
  - Clean params object trước khi gửi request
  - Handle error responses properly
  - _Requirements: 6.1_


- [ ] 9.2 Add Error Handling
  - Handle 403 Forbidden
  - Handle 404 Not Found
  - Handle 500 Server Error
  - Display user-friendly error messages
  - _Requirements: Error Handling_

- [-] 10. Frontend - Fix StudentManagementComponent

  - Update component để xử lý params đúng
  - _Requirements: 6.1_


- [x] 10.1 Fix loadStudents Method

  - Build params object properly (không include undefined)
  - Only add courseId nếu selectedCourse có giá trị
  - Only add status nếu status có giá trị
  - Only add search nếu keyword có giá trị
  - _Requirements: 6.1_


- [ ] 10.2 Add Loading States
  - Show loading spinner khi đang fetch data
  - Disable filters khi đang loading
  - _Requirements: 6.1_


- [x] 10.3 Add Error Display

  - Show error message khi API fails
  - Add retry button
  - Clear error khi retry
  - _Requirements: Error Handling_

- [ ] 11. Frontend - Update TeacherService
  - Integrate với new API endpoints
  - _Requirements: 6.1, 6.2_

- [ ] 11.1 Remove Mock Data
  - Remove `initializeMockStudentsAndAssignments()`
  - Call real API thay vì mock data
  - _Requirements: 6.1_

- [ ] 11.2 Add Real API Calls
  - Implement `getStudents()` với real API
  - Implement `getStudentById()` với real API
  - Update error handling
  - _Requirements: 6.1, 6.2_

- [ ] 12. Database Optimization
  - Add indexes cho performance
  - _Requirements: Performance Requirements_

- [ ] 12.1 Add Indexes
  - Add index on `courses(teacher_id)`
  - Add index on `course_enrollments(student_id, course_id)`
  - Add composite index on `courses(teacher_id, status)`
  - Add index on `student_lesson_progress(student_id, lesson_id)`
  - _Requirements: Performance Requirements_

- [ ] 12.2 Verify Query Performance
  - Run EXPLAIN ANALYZE on critical queries
  - Ensure indexes are being used
  - Optimize slow queries
  - _Requirements: Performance Requirements_



- [ ] 13. Documentation
  - Create API documentation và developer guide
  - _Requirements: All requirements_

- [ ] 13.1 Update OpenAPI Documentation
  - Add Swagger annotations cho TeacherController
  - Document request/response schemas
  - Add example requests/responses
  - Document error codes
  - _Requirements: All requirements_

- [ ] 13.2 Create Developer Guide
  - Document Teacher Domain architecture
  - Explain DDD patterns used
  - Provide code examples
  - Document common use cases
  - _Requirements: All requirements_

- [ ] 14. Testing & Deployment
  - End-to-end testing và deployment
  - _Requirements: All requirements_

- [ ] 14.1 Manual Testing
  - Test với Postman/Swagger UI
  - Test all endpoints với different scenarios
  - Test error cases
  - Test với different user roles
  - _Requirements: All requirements_

- [ ] 14.2 E2E Testing
  - Write Playwright/Cypress tests
  - Test complete user flows
  - Test teacher login → view students → view detail
  - Test filters và pagination
  - _Requirements: 6.1, 6.2_

- [ ] 14.3 Deploy to Staging
  - Build và deploy backend
  - Build và deploy frontend
  - Run smoke tests
  - Verify logs và metrics
  - _Requirements: All requirements_

- [ ] 14.4 User Acceptance Testing
  - Get feedback từ real teachers
  - Fix bugs discovered
  - Improve UX based on feedback
  - _Requirements: All requirements_

- [ ] 14.5 Deploy to Production
  - Create deployment plan
  - Deploy với zero downtime
  - Monitor logs và errors
  - Rollback plan ready
  - _Requirements: All requirements_

## Optional Tasks (Future Enhancements)

- [ ]* 15. Add Caching Layer
  - Implement Redis caching cho student queries
  - Cache invalidation strategy
  - _Requirements: Performance Requirements_

- [ ]* 16. Add Analytics Dashboard
  - Implement GET /analytics/overview endpoint
  - Implement GET /analytics/courses/{id} endpoint
  - Create analytics components trong frontend
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 17. Add Assignment Grading APIs
  - Implement GET /assignments endpoint
  - Implement GET /assignments/{id}/submissions endpoint
  - Implement POST /assignments/{id}/grade endpoint
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_

- [ ]* 18. Add Quiz Management APIs
  - Implement quiz creation endpoints
  - Implement quiz question management
  - Implement quiz statistics
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ]* 19. Add Communication Features
  - Implement announcements
  - Implement discussion forums
  - Implement direct messaging
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ]* 20. Add File Management
  - Implement file upload endpoints
  - Implement file organization (folders, tags)
  - Implement file preview generation
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

## Task Execution Order

**Phase 1: Core Student Management (Priority - Fix 403 Error)**
1. Tasks 1-6: Backend implementation
2. Tasks 9-11: Frontend fixes
3. Task 7-8: Testing
4. Task 14.1-14.2: Manual & E2E testing

**Phase 2: Optimization & Documentation**
1. Task 12: Database optimization
2. Task 13: Documentation
3. Task 14.3-14.5: Deployment

**Phase 3: Future Enhancements (Optional)**
1. Tasks 15-20: Additional features

## Estimated Timeline

- **Phase 1:** 1-2 weeks (Core functionality)
- **Phase 2:** 3-5 days (Optimization & docs)
- **Phase 3:** 2-4 weeks (Future features)

**Total for Phase 1+2:** ~2-3 weeks

## Notes

- Focus on Phase 1 first để sửa lỗi 403 hiện tại
- Mỗi task nên được test riêng trước khi merge
- Follow DDD principles nghiêm ngặt
- Code review required cho mọi task
- Update documentation khi có thay đổi

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-18  
**Author:** Kiro AI Assistant  
**Status:** Ready for Implementation
