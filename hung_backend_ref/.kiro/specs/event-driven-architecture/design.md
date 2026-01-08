# Event-Driven Architecture Design Document

## Overview

Refactor LMS Backend sang Event-Driven Architecture với DDD thuần túy. Mỗi Bounded Context sẽ có domain models riêng (POJOs), JPA entities riêng trong infrastructure layer, và giao tiếp qua Domain Events.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Event Bus (Spring Events)                    │
└─────────────────────────────────────────────────────────────────────┘
       ▲              ▲              ▲              ▲
       │              │              │              │
   publish        publish        subscribe      subscribe
       │              │              │              │
┌──────┴──────┐ ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
│  Identity   │ │  Course   │ │ Learning  │ │Assessment │
│   Module    │ │ Authoring │ │ Delivery  │ │  Module   │
└─────────────┘ └───────────┘ └───────────┘ └───────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL Database                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Event Infrastructure (shared/)

```
shared/
├── domain/
│   ├── event/
│   │   ├── DomainEvent.java           # Base interface
│   │   └── AbstractDomainEvent.java   # Base implementation
│   └── valueobject/
│       ├── UserId.java
│       ├── CourseId.java
│       ├── StudentId.java
│       └── TeacherId.java
└── infrastructure/
    └── event/
        ├── DomainEventPublisher.java  # Interface
        └── SpringEventPublisher.java  # Implementation
```

### Module Structure (per module)

```
{module}/
├── domain/
│   ├── model/           # Pure POJOs (no JPA)
│   ├── event/           # Domain events
│   └── repository/      # Repository interfaces
├── application/
│   ├── usecase/         # Application services
│   └── dto/             # Commands & Responses
└── infrastructure/
    ├── persistence/
    │   ├── entity/      # JPA Entities
    │   ├── repository/  # JPA Repository implementations
    │   └── mapper/      # Domain <-> JPA mappers
    ├── eventhandler/    # Event subscribers
    └── web/             # Controllers
```

## Data Models

### Value Objects (Shared)

```java
// UserId - identifies a user across modules
public record UserId(UUID value) {
    public static UserId of(UUID value) { return new UserId(value); }
}

// CourseId - identifies a course across modules
public record CourseId(UUID value) {
    public static CourseId of(UUID value) { return new CourseId(value); }
}
```

### Domain Events

```java
// UserRegisteredEvent
public record UserRegisteredEvent(
    UUID eventId,
    Instant occurredAt,
    UserId userId,
    String email,
    String fullName,
    String role
) implements DomainEvent {}

// CourseApprovedEvent
public record CourseApprovedEvent(
    UUID eventId,
    Instant occurredAt,
    CourseId courseId,
    String courseCode,
    String title,
    TeacherId teacherId
) implements DomainEvent {}

// StudentEnrolledEvent
public record StudentEnrolledEvent(
    UUID eventId,
    Instant occurredAt,
    UUID enrollmentId,
    StudentId studentId,
    CourseId courseId,
    UUID classId
) implements DomainEvent {}
```

### Domain Model vs JPA Entity Example

```java
// Domain Model (POJO) - identity/domain/model/User.java
public class User {
    private UserId id;
    private Email email;
    private String fullName;
    private Role role;
    private boolean enabled;
    // Business methods, no JPA annotations
}

// JPA Entity - identity/infrastructure/persistence/entity/UserJpaEntity.java
@Entity
@Table(name = "users")
public class UserJpaEntity {
    @Id
    private UUID id;
    private String email;
    private String fullName;
    @Enumerated(EnumType.STRING)
    private Role role;
    private boolean enabled;
    // JPA annotations, no business logic
}

// Mapper - identity/infrastructure/persistence/mapper/UserMapper.java
@Component
public class UserMapper {
    public User toDomain(UserJpaEntity entity) { ... }
    public UserJpaEntity toEntity(User domain) { ... }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Event Publishing Completeness
*For any* domain action that should raise an event, the event SHALL be published with all required metadata (eventId, timestamp, aggregateId).
**Validates: Requirements 1.1, 1.2**

### Property 2: Event Delivery to All Handlers
*For any* published event with N registered handlers, all N handlers SHALL receive the event.
**Validates: Requirements 1.3**

### Property 3: Handler Failure Isolation
*For any* event with multiple handlers where one handler fails, the remaining handlers SHALL still receive and process the event.
**Validates: Requirements 1.4**

### Property 4: User Registration Event Consistency
*For any* user registration, a UserRegisteredEvent SHALL be published containing the same data as the created user.
**Validates: Requirements 2.1**

### Property 5: Course Approval Event Propagation
*For any* course approval, a CourseApprovedEvent SHALL be published and received by Learning Delivery module.
**Validates: Requirements 3.2, 4.1**

### Property 6: Enrollment Event Chain
*For any* student enrollment, a StudentEnrolledEvent SHALL be published and Assessment module SHALL enable quiz access.
**Validates: Requirements 4.2, 5.1**

### Property 7: Quiz Submission Event
*For any* quiz submission, a QuizSubmittedEvent SHALL be published containing the calculated score.
**Validates: Requirements 5.2**

## Error Handling

1. **Event Publishing Failures**: Log error, retry with exponential backoff
2. **Handler Failures**: Log error, continue with other handlers (no transaction rollback)
3. **Mapper Failures**: Throw ValidationException with details
4. **Missing Event Data**: Throw IllegalArgumentException

## Testing Strategy

### Unit Testing
- Test domain models in isolation
- Test mappers with various inputs
- Test use cases with mocked repositories

### Property-Based Testing (using jqwik)
- Test event publishing with random domain actions
- Test handler delivery with random number of handlers
- Test mapper round-trips (domain -> entity -> domain)

### Integration Testing
- Test event flow across modules
- Test database persistence through JPA entities
- Test full use case execution

**Property-Based Testing Library**: jqwik (Java)
- Minimum 100 iterations per property test
- Each test tagged with: `**Feature: event-driven-architecture, Property {number}: {property_text}**`
