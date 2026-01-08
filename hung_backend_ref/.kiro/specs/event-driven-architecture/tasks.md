# Implementation Plan

## Phase 1: Event Infrastructure

- [x] 1. Setup Event Infrastructure in Shared Module




  - [ ] 1.1 Create Value Objects (UserId, CourseId, StudentId, TeacherId)
    - Create record classes in `shared/domain/valueobject/`


    - Add factory methods and validation
    - _Requirements: 2.3, 3.4, 4.4, 5.3_


  - [ ] 1.2 Enhance DomainEvent interface
    - Add eventId(), occurredAt(), aggregateId() methods
    - Update AbstractDomainEvent base class
    - _Requirements: 1.2_
  - [x] 1.3 Create DomainEventPublisher

    - Create interface in `shared/infrastructure/event/`
    - Create SpringEventPublisher implementation using ApplicationEventPublisher
    - _Requirements: 1.1, 1.3_

  - [x]* 1.4 Write property test for event publishing



    - **Property 1: Event Publishing Completeness**


    - **Validates: Requirements 1.1, 1.2**


- [ ] 2. Checkpoint - Ensure all tests pass

## Phase 2: Identity Module Migration



- [x] 3. Migrate Identity Module to DDD Structure


  - [ ] 3.1 Create User Domain Model (POJO)
    - Create `identity/domain/model/User.java` without JPA annotations
    - Add business methods and validation
    - _Requirements: 2.1, 6.2_
  - [ ] 3.2 Create UserJpaEntity


    - Move/create `identity/infrastructure/persistence/entity/UserJpaEntity.java`
    - Keep JPA annotations, implement UserDetails
    - _Requirements: 2.4, 6.3_
  - [ ] 3.3 Create UserMapper
    - Create `identity/infrastructure/persistence/mapper/UserMapper.java`
    - Implement toDomain() and toEntity() methods
    - _Requirements: 6.4_
  - [ ] 3.4 Create Identity Domain Events
    - Create UserRegisteredEvent, UserProfileUpdatedEvent
    - Include all required metadata
    - _Requirements: 2.1, 2.2_
  - [ ] 3.5 Update Identity Use Cases to publish events
    - Update RegisterUserUseCase to publish UserRegisteredEvent
    - Update UpdateProfileUseCase to publish UserProfileUpdatedEvent
    - _Requirements: 2.1, 2.2_
  - [ ]* 3.6 Write property test for user registration event
    - **Property 4: User Registration Event Consistency**
    - **Validates: Requirements 2.1**

- [x] 4. Checkpoint - Ensure all tests pass




## Phase 3: Course Authoring Module Migration

- [-] 5. Migrate Course Authoring Module

  - [ ] 5.1 Create Course Domain Model (POJO)
    - Enhance existing `course_authoring/domain/model/Course.java`
    - Remove any JPA dependencies
    - _Requirements: 6.2_
  - [ ] 5.2 Create CourseJpaEntity
    - Create `course_authoring/infrastructure/persistence/entity/CourseJpaEntity.java`
    - Move JPA annotations from entity/Course.java
    - _Requirements: 3.3, 6.3_
  - [ ] 5.3 Create Chapter and Lesson JPA Entities
    - Create ChapterJpaEntity, LessonJpaEntity, SectionJpaEntity
    - _Requirements: 6.3_
  - [ ] 5.4 Create Course Mappers
    - Create CourseMapper, ChapterMapper, LessonMapper
    - _Requirements: 6.4_
  - [x] 5.5 Update Course Domain Events


    - Enhance CourseCreatedEvent, CourseApprovedEvent with full metadata
    - Use CourseId, TeacherId value objects
    - _Requirements: 3.1, 3.2, 3.4_
  - [x] 5.6 Update Course Use Cases


    - Update CreateCourseUseCase to use mapper and publish event
    - Update ApproveCourseUseCase to publish CourseApprovedEvent
    - _Requirements: 3.1, 3.2_
  - [ ]* 5.7 Write property test for course approval event
    - **Property 5: Course Approval Event Propagation**
    - **Validates: Requirements 3.2, 4.1**


- [ ] 6. Checkpoint - Ensure all tests pass

## Phase 4: Learning Delivery Module Migration

- [-] 7. Migrate Learning Delivery Module

  - [ ] 7.1 Create Enrollment Domain Model
    - Create/enhance `learning_delivery/domain/model/Enrollment.java`
    - Use StudentId, CourseId value objects
    - _Requirements: 4.4, 6.2_
  - [ ] 7.2 Create LearningClass Domain Model
    - Enhance existing domain model
    - _Requirements: 6.2_
  - [ ] 7.3 Create JPA Entities
    - Create EnrollmentJpaEntity, LearningClassJpaEntity
    - _Requirements: 6.3_
  - [ ] 7.4 Create Mappers
    - Create EnrollmentMapper, LearningClassMapper
    - _Requirements: 6.4_
  - [x] 7.5 Create Event Handler for CourseApprovedEvent


    - Create `learning_delivery/infrastructure/eventhandler/CourseApprovedEventHandler.java`
    - Make course available for class creation
    - _Requirements: 4.1_
  - [x] 7.6 Update Enrollment Use Cases


    - Update EnrollStudentUseCaseV2 to publish StudentEnrolledEvent
    - Update UpdateLessonProgressUseCase to publish LessonCompletedEvent
    - _Requirements: 4.2, 4.3_
  - [ ]* 7.7 Write property test for enrollment event chain
    - **Property 6: Enrollment Event Chain**
    - **Validates: Requirements 4.2, 5.1**


- [ ] 8. Checkpoint - Ensure all tests pass

## Phase 5: Assessment Module Migration

- [-] 9. Migrate Assessment Module

  - [ ] 9.1 Create Quiz Domain Model
    - Create `assessment/domain/model/Quiz.java` POJO
    - Use StudentId, CourseId value objects
    - _Requirements: 5.3, 6.2_
  - [ ] 9.2 Create QuizAttempt Domain Model
    - Create `assessment/domain/model/QuizAttempt.java`
    - _Requirements: 6.2_
  - [ ] 9.3 Create JPA Entities
    - Create QuizJpaEntity, QuizAttemptJpaEntity
    - _Requirements: 5.4, 6.3_
  - [ ] 9.4 Create Mappers
    - Create QuizMapper, QuizAttemptMapper
    - _Requirements: 6.4_

  - [x] 9.5 Create Event Handler for StudentEnrolledEvent

    - Create `assessment/infrastructure/eventhandler/StudentEnrolledEventHandler.java`
    - Enable quiz access for enrolled student
    - _Requirements: 5.1_
  - [x] 9.6 Create QuizSubmittedEvent


    - Create event with score and attempt details
    - Update SubmitQuizUseCase to publish event
    - _Requirements: 5.2_
  - [ ]* 9.7 Write property test for quiz submission
    - **Property 7: Quiz Submission Event**
    - **Validates: Requirements 5.2**


- [ ] 10. Checkpoint - Ensure all tests pass

## Phase 6: Communication & AI Modules Migration

- [ ] 11. Migrate Communication Module
  - [ ] 11.1 Create Message Domain Model
    - Create POJO with UserId references
    - _Requirements: 6.2_
  - [ ] 11.2 Create JPA Entities and Mappers
    - Create MessageJpaEntity, ConversationJpaEntity
    - Create mappers
    - _Requirements: 6.3, 6.4_

- [ ] 12. Migrate AI Assistant Module
  - [ ] 12.1 Create ChatSession Domain Model
    - Create POJO with UserId reference
    - _Requirements: 6.2_
  - [ ] 12.2 Create JPA Entities and Mappers
    - Create ChatSessionJpaEntity, ChatMessageJpaEntity
    - Create mappers
    - _Requirements: 6.3, 6.4_

- [ ] 13. Checkpoint - Ensure all tests pass

## Phase 7: Legacy Code Cleanup

- [ ] 14. Remove Legacy entity/ folder
  - [ ] 14.1 Verify all entities migrated
    - Check each entity has corresponding JpaEntity in module
    - _Requirements: 7.1_
  - [ ] 14.2 Update remaining references
    - Update any remaining imports to use new locations
    - _Requirements: 7.3_
  - [ ] 14.3 Delete entity/ folder
    - Remove `api/src/main/java/com/example/lms/entity/`
    - _Requirements: 7.1_

- [ ] 15. Remove Legacy repository/ folder
  - [ ] 15.1 Verify all repositories migrated
    - Check each repository has corresponding implementation in module
    - _Requirements: 7.2_
  - [ ] 15.2 Delete repository/ folder
    - Remove `api/src/main/java/com/example/lms/repository/`
    - _Requirements: 7.2_





- [x] 16. Final Verification


  - [ ] 16.1 Run full build and tests
    - Execute `mvn clean compile test`


    - Verify all 29+ tests pass
    - _Requirements: 7.4_
  - [ ] 16.2 Update documentation
    - Update README with new architecture
    - Create ADR-003 for Event-Driven Architecture
    - _Requirements: 7.4_

- [ ] 17. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Progress Tracking

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Event Infrastructure | 🔴 Not Started | 0% |
| Phase 2: Identity Migration | 🔴 Not Started | 0% |
| Phase 3: Course Authoring Migration | 🔴 Not Started | 0% |
| Phase 4: Learning Delivery Migration | 🔴 Not Started | 0% |
| Phase 5: Assessment Migration | 🔴 Not Started | 0% |
| Phase 6: Communication & AI Migration | 🔴 Not Started | 0% |
| Phase 7: Legacy Cleanup | 🔴 Not Started | 0% |
