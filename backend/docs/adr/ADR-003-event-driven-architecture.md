# ADR-003: Event-Driven Architecture

## Status
Accepted

## Date
2024-12-18

## Context
The LMS Backend system has multiple bounded contexts (Identity, Course Authoring, Learning Delivery, Assessment) that need to communicate with each other. Direct coupling between modules leads to:
- Tight coupling between bounded contexts
- Difficulty in maintaining and testing modules independently
- Cascading failures when one module changes

## Decision
We adopt an Event-Driven Architecture using Spring Application Events for inter-module communication:

### Domain Events
Each module publishes domain events when significant state changes occur:
- `UserRegisteredEvent` - Identity module
- `CourseCreatedEvent`, `CourseApprovedEvent` - Course Authoring module
- `StudentEnrolledEvent`, `LessonCompletedEvent` - Learning Delivery module
- `QuizSubmittedEvent` - Assessment module

### Event Infrastructure
- `DomainEventPublisher` interface in shared module
- `SpringEventPublisher` implementation using `ApplicationEventPublisher`
- `AbstractDomainEvent` base class with eventId, occurredAt, aggregateId

### Event Handlers
Each module has event handlers in `infrastructure/eventhandler/`:
- `CourseApprovedEventHandler` - Learning Delivery listens for approved courses
- `StudentEnrolledEventHandler` - Assessment enables quiz access on enrollment

### Value Objects for Cross-Module References
- `UserId`, `CourseId`, `StudentId`, `TeacherId` - type-safe identifiers
- Modules reference each other only through value objects, not entities

## Consequences

### Positive
- Loose coupling between bounded contexts
- Each module can evolve independently
- Clear boundaries and contracts via events
- Easier testing with mocked event publishers
- Audit trail through event metadata

### Negative
- Eventual consistency (events are processed asynchronously)
- Need to handle event ordering and idempotency
- More complex debugging across module boundaries

## Implementation Notes
- Events are published after successful persistence
- Event handlers should be idempotent
- Use `@TransactionalEventListener` for transactional consistency when needed
