# Requirements Document

## Introduction

Refactor hệ thống LMS Backend từ kiến trúc hiện tại (với `entity/` và `repository/` tập trung) sang Event-Driven Architecture với DDD thuần túy. Mục tiêu là tách biệt hoàn toàn các Bounded Contexts, sử dụng Domain Events để giao tiếp giữa các modules, và loại bỏ sự phụ thuộc trực tiếp giữa các aggregates.

## Glossary

- **Bounded Context**: Ranh giới logic chứa một domain model cụ thể
- **Domain Event**: Sự kiện xảy ra trong domain, được publish để các modules khác subscribe
- **Aggregate**: Cluster của domain objects được xử lý như một đơn vị
- **Domain Model**: POJO thuần túy không có infrastructure concerns (no JPA annotations)
- **JPA Entity**: Class với JPA annotations để persist data
- **Event Publisher**: Component chịu trách nhiệm publish domain events
- **Event Handler**: Component subscribe và xử lý domain events
- **Mapper**: Component chuyển đổi giữa Domain Model và JPA Entity

## Requirements

### Requirement 1: Event Infrastructure

**User Story:** As a developer, I want a robust event infrastructure, so that modules can communicate through domain events without direct coupling.

#### Acceptance Criteria

1. WHEN a domain event is raised THEN the System SHALL publish it through Spring Application Events
2. WHEN an event is published THEN the System SHALL include event metadata (eventId, timestamp, aggregateId)
3. WHEN multiple handlers subscribe to an event THEN the System SHALL deliver the event to all handlers
4. WHEN an event handler fails THEN the System SHALL log the error and continue processing other handlers

### Requirement 2: Identity Module Isolation

**User Story:** As a developer, I want the Identity module to be fully isolated, so that User management is independent of other modules.

#### Acceptance Criteria

1. WHEN a user registers THEN the System SHALL create a User domain model and publish UserRegisteredEvent
2. WHEN a user updates profile THEN the System SHALL publish UserProfileUpdatedEvent
3. WHEN other modules need user info THEN the System SHALL provide it through UserId value object reference only
4. WHEN persisting User THEN the System SHALL use UserJpaEntity in infrastructure layer with mapper

### Requirement 3: Course Authoring Module Isolation

**User Story:** As a developer, I want Course Authoring to be a separate bounded context, so that course creation is decoupled from learning delivery.

#### Acceptance Criteria

1. WHEN a course is created THEN the System SHALL publish CourseCreatedEvent
2. WHEN a course is approved THEN the System SHALL publish CourseApprovedEvent with course details
3. WHEN persisting Course THEN the System SHALL use CourseJpaEntity with mapper to domain model
4. WHEN referencing teacher THEN the System SHALL use TeacherId value object instead of User entity

### Requirement 4: Learning Delivery Module Integration

**User Story:** As a developer, I want Learning Delivery to react to course events, so that classes can be created when courses are approved.

#### Acceptance Criteria

1. WHEN CourseApprovedEvent is received THEN the System SHALL make course available for class creation
2. WHEN a student enrolls THEN the System SHALL publish StudentEnrolledEvent
3. WHEN a lesson is completed THEN the System SHALL publish LessonCompletedEvent
4. WHEN referencing course THEN the System SHALL use CourseId value object instead of Course entity

### Requirement 5: Assessment Module Integration

**User Story:** As a developer, I want Assessment module to react to enrollment events, so that quiz access is granted automatically.

#### Acceptance Criteria

1. WHEN StudentEnrolledEvent is received THEN the System SHALL enable quiz access for student
2. WHEN a quiz is submitted THEN the System SHALL publish QuizSubmittedEvent with score
3. WHEN referencing student THEN the System SHALL use StudentId value object
4. WHEN persisting Quiz THEN the System SHALL use QuizJpaEntity with mapper

### Requirement 6: Module Structure Standardization

**User Story:** As a developer, I want consistent module structure, so that code is predictable and maintainable.

#### Acceptance Criteria

1. WHEN organizing a module THEN the System SHALL follow the structure: domain/model, domain/event, domain/repository, infrastructure/persistence/entity, infrastructure/persistence/mapper
2. WHEN creating domain models THEN the System SHALL use POJOs without JPA annotations
3. WHEN creating JPA entities THEN the System SHALL place them in infrastructure/persistence/entity
4. WHEN mapping between layers THEN the System SHALL use dedicated Mapper classes

### Requirement 7: Legacy Code Removal

**User Story:** As a developer, I want to remove centralized entity/repository folders, so that the codebase follows DDD principles.

#### Acceptance Criteria

1. WHEN all modules are migrated THEN the System SHALL delete the `entity/` folder
2. WHEN all modules are migrated THEN the System SHALL delete the `repository/` folder
3. WHEN migration is complete THEN the System SHALL have zero cross-module entity dependencies
4. WHEN build is executed THEN the System SHALL compile successfully with all tests passing
