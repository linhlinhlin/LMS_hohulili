# ADR-001: Adoption of Clean Architecture

## Status
Accepted

## Date
2025-12-18

## Context
The LMS backend codebase had grown organically with:
- Mixed responsibilities in controllers (business logic + HTTP handling)
- Direct coupling between layers
- Duplicate entities across packages
- Inconsistent error handling
- Difficult to test business logic in isolation

## Decision
Adopt Clean Architecture (Hexagonal Architecture) with the following structure:

```
module/
├── domain/
│   ├── model/          # Domain entities, value objects
│   ├── event/          # Domain events
│   └── repository/     # Repository interfaces (ports)
├── application/
│   ├── usecase/        # Application services (use cases)
│   └── dto/            # Commands, Responses
└── infrastructure/
    ├── persistence/    # Repository implementations (adapters)
    └── web/            # Controllers (adapters)
```

### Key Principles
1. **Dependency Rule**: Dependencies point inward (infrastructure → application → domain)
2. **Domain Independence**: Domain layer has no external dependencies
3. **Use Case Pattern**: Each business operation is a separate use case class
4. **Port/Adapter Pattern**: Interfaces in domain, implementations in infrastructure

## Modules Created
- `shared/` - Shared kernel (base classes, value objects, exceptions)
- `identity/` - Authentication & user management
- `course_authoring/` - Course creation & approval workflow
- `learning_delivery/` - Class management & enrollment
- `assessment/` - Quiz & grading
- `communication/` - Teacher-student messaging
- `ai_assistant/` - AI chat integration

## Consequences

### Positive
- Clear separation of concerns
- Business logic is testable in isolation
- Easy to swap infrastructure (database, external services)
- Consistent patterns across modules
- Better code organization and discoverability

### Negative
- More files and boilerplate code
- Learning curve for team members
- Need to maintain mapping between layers

## References
- Clean Architecture by Robert C. Martin
- Hexagonal Architecture by Alistair Cockburn
