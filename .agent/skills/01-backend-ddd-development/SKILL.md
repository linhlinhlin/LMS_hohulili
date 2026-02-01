---
name: 01-backend-microservice-development
description: Backend microservice development standards combining Domain-Driven Design (DDD) and Event-Driven Architecture with Spring Boot 3. Covers layered architecture, bounded contexts, domain events, and best practices for maritime LMS systems at scale. Use when designing new services, refactoring existing systems, or implementing domain logic.
---

# DDD + Event-Driven Microservice Development Standard

## Overview

This standard defines the architectural approach for building maritime Learning Management System (LMS) microservices using **Domain-Driven Design (DDD)** combined with **Event-Driven Architecture** on Spring Boot 3 with Kotlin/Java.

DDD is a strategic approach focused on building complex software by connecting technical details to an evolving domain model.  When combined with event-driven patterns, it creates highly scalable, loosely coupled systems ideal for maritime education platforms serving 10,000+ students.

## Core Architecture Principles

### 1. Hexagonal Architecture with DDD Layers

Each microservice follows a strict layered structure aligned with DDD principles:

```
maritime-lms/
├── domain-{service}/       # Domain layer - pure business logic, no frameworks
├── application-{service}/  # Application layer - use cases, domain services, event handlers
├── infrastructure-{service}/ # Infrastructure layer - persistence, messaging, external integrations
└── interfaces-{service}/   # Interfaces layer - REST APIs, messaging endpoints, UI adapters
```

**Domain Layer (Core):**
- Contains entities, value objects, domain events, repositories (interfaces only), domain services
- **100% framework-free** - no Spring, no database dependencies
- Pure business logic focused on maritime domain concepts (certifications, vessel operations, safety protocols)

**Application Layer:**
- Orchestrates domain objects to fulfill use cases
- Implements domain services and domain event handlers
- Manages transactions and coordinates workflows
- Contains application services, DTOs, and use case implementations

**Infrastructure Layer:**
- Implements repository interfaces with JPA/JOOQ
- Configures databases, messaging (Kafka/RabbitMQ), external APIs
- Handles persistence, caching, and infrastructure concerns
- Contains Spring configuration classes

**Interfaces Layer:**
- REST controllers, message consumers, scheduled tasks
- API documentation with OpenAPI/Swagger
- Request/response mapping to/from application layer DTOs

### 2. Bounded Contexts for Maritime LMS

Identify and isolate bounded contexts based on maritime domain expertise:

| Context | Responsibility | Key Entities | Event Topics |
|---------|----------------|--------------|--------------|
| student-enrollment | Student registration, course enrollment | Student, Course, Enrollment | student.registered, course.enrolled |
| certification-management | Maritime certifications, compliance tracking | Certificate, Competency, Assessment | certification.issued, competency.updated |
| course-delivery | Course content delivery, progress tracking | Module, Lesson, AssessmentResult | lesson.completed, assessment.submitted |
| vessel-operations | Simulator training, vessel operation logs | Vessel, OperationLog, TrainingSession | simulation.started, operation.logged |
| notification-system | Alerts, reminders, maritime emergency notifications | Alert, NotificationChannel, Schedule | alert.triggered, notification.sent |

DDD helps ensure that services are truly autonomous and loosely coupled by defining clear, domain-driven boundaries between contexts. 

### 3. Event-Driven Integration Patterns

#### Domain Events

Domain events represent significant state changes within a bounded context:

```kotlin
// Domain layer
data class StudentEnrolledDomainEvent(
    val studentId: UUID,
    val courseId: UUID,
    val enrollmentDate: LocalDateTime,
    val occurredOn: LocalDateTime = LocalDateTime.now()
) : DomainEvent
```

#### Event Publishing (Infrastructure Layer)

```kotlin
// Infrastructure implementation
@Component
class DomainEventPublisher(
    private val applicationEventPublisher: ApplicationEventPublisher
) : EventPublisher {
    
    override fun publish(event: DomainEvent) {
        applicationEventPublisher.publishEvent(event)
        // Also publish to Kafka/RabbitMQ for cross-service communication
        kafkaTemplate.send("domain-events", event)
    }
}
```

#### Event Handling

```kotlin
// Application layer event handler
@Service
@Transactional
class CertificationEventHandler(
    private val certificationService: CertificationService
) {
    
    @EventHandler
    fun handleStudentEnrolled(event: StudentEnrolledDomainEvent) {
        certificationService.createInitialCertificationTrack(
            event.studentId,
            event.courseId
        )
    }
}
```

**Event Sourcing & CQRS Considerations:**
- For high-write scenarios (student progress tracking), consider event sourcing patterns
- Use CQRS for separating read/write models in complex reporting scenarios
- Implement eventual consistency with saga patterns for distributed transactions

### 4. Database per Service Pattern

Each microservice manages its own database to prevent bottlenecks and ensure autonomy. 

**Database Strategy:**
- **Domain Layer:** Repository interfaces only (no implementation)
- **Infrastructure Layer:** Repository implementations with JPA/JOOQ
- **Database Types:** PostgreSQL for relational data, Redis for caching/event sourcing

```kotlin
// Domain layer interface
interface StudentRepository {
    fun findById(id: UUID): Student?
    fun save(student: Student): Student
}

// Infrastructure implementation
@Repository
class JpaStudentRepository(
    private val studentJpaRepository: StudentJpaRepository
) : StudentRepository {
    
    override fun findById(id: UUID): Student? {
        return studentJpaRepository.findById(id)?.toDomain()
    }
    
    override fun save(student: Student): Student {
        return studentJpaRepository.save(student.toEntity()).toDomain()
    }
}
```

## Spring Boot 3 Implementation Standards

### 1. Dependency Management

**Gradle Kotlin DSL Structure:**
```gradle
dependencies {
    // Domain layer - NO SPRING DEPENDENCIES
    implementation(project(":domain-certification"))
    
    // Application layer
    implementation(project(":application-certification"))
    implementation("org.springframework.boot:spring-boot-starter")
    
    // Infrastructure layer
    implementation(project(":infrastructure-certification"))
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.kafka:spring-kafka")
    
    // Interfaces layer
    implementation(project(":interfaces-certification"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.1.0")
}
```

### 2. Configuration Management

**12-Factor App compliant configuration:**
- Externalize all configuration from code
- Use Spring Cloud Config for centralized configuration
- Environment-specific profiles (dev, staging, prod)
- Secrets management via HashiCorp Vault or AWS Secrets Manager

```yaml
# application.yml
spring:
  config:
    import: optional:configserver:http://config-server:8888
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS}
```

### 3. API Design Standards

**REST API Best Practices:**
- Follow REST maturity level 3 (HATEOAS)
- Version APIs from day one: `/api/v1/students`
- Use proper HTTP status codes
- Implement pagination, filtering, sorting consistently
- Document all APIs with OpenAPI 3.0

```kotlin
@RestController
@RequestMapping("/api/v1/students")
@Tag(name = "STUDENT_ENROLLMENT", description = "Student enrollment management")
class StudentEnrollmentController(
    private val enrollmentService: EnrollmentService
) {
    
    @PostMapping
    @Operation(summary = "Enroll student in course")
    @ResponseStatus(HttpStatus.CREATED)
    fun enrollStudent(
        @RequestBody @Valid enrollmentRequest: EnrollmentRequest
    ): ResponseEntity<StudentEnrollmentResponse> {
        val result = enrollmentService.enrollStudent(enrollmentRequest)
        return ResponseEntity.created(URI.create("/api/v1/students/${result.studentId}/enrollments/${result.id}"))
            .body(result)
    }
}
```

## Maritime LMS Specific Patterns

### 1. Scale Considerations for 10,000 Students

**Performance Optimization Strategies:**
- **Read Models:** Materialized views for dashboards and reports
- **Caching:** Redis for frequently accessed data (course catalogs, student profiles)
- **Asynchronous Processing:** Kafka for background tasks (certificate generation, notifications)
- **Database Sharding:** Student data partitioned by maritime region or academy

**Load Testing Benchmarks:**
- Target: 1000 concurrent users during peak hours (exams, enrollments)
- Response time: < 2 seconds for critical operations
- Throughput: 50 requests/second per microservice instance

### 2. Domain Modeling for Maritime Education

**Core Maritime Domain Concepts:**
- **Certification Hierarchy:** STCW certifications, national endorsements, vessel-specific credentials
- **Competency Tracking:** Practical skills assessment, simulator performance logging
- **Regulatory Compliance:** Automatic checks against maritime authority requirements
- **Emergency Procedures:** Specialized training workflows for safety scenarios

```kotlin
// Domain model example
class MaritimeCertificate(
    id: CertificateId,
    studentId: StudentId,
    certificateType: CertificateType, // STCW, MEDICAL, RADIO, etc.
    issuedDate: LocalDateTime,
    expiryDate: LocalDateTime,
    status: CertificateStatus,
    competencyRecords: List<CompetencyRecord>
) : AggregateRoot<CertificateId>(id) {
    
    fun renew(renewalRequest: CertificateRenewalRequest): DomainEvent {
        validateRenewalEligibility()
        return CertificateRenewedDomainEvent(
            certificateId = id,
            studentId = studentId,
            newExpiryDate = renewalRequest.newExpiryDate
        )
    }
}
```

## Quality Assurance Standards

### 1. Testing Strategy

**Test Pyramid Implementation:**
- **Unit Tests (70%):** Domain objects, pure business logic (JUnit 5, TestContainers)
- **Integration Tests (20%):** Repository implementations, API endpoints
- **End-to-End Tests (10%):** Critical user journeys across services

```kotlin
@DomainTest
class MaritimeCertificateTest {
    
    @Test
    fun `certificate cannot be renewed if expired more than 5 years`() {
        val expiredCertificate = createExpiredCertificate(expiryDate = LocalDate.now().minusYears(6))
        
        assertThrows<CertificateRenewalException> {
            expiredCertificate.renew(validRenewalRequest())
        }
    }
}

@SpringBootTest
@IntegrationTest
class CertificateRenewalApiTest {
    
    @Test
    fun `renew certificate successfully`() {
        // Setup test data
        val certificateId = createTestCertificate()
        
        // When
        val response = mockMvc.post("/api/v1/certificates/${certificateId}/renew") {
            contentType = MediaType.APPLICATION_JSON
            content = """
                {
                    "newExpiryDate": "${LocalDate.now().plusYears(5)}"
                }
            """
        }
        
        // Then
        response.andExpect(status().isOk)
               .andExpect(jsonPath("$.status").value("RENEWED"))
    }
}
```

### 2. Monitoring and Observability

**Essential Metrics:**
- Domain event processing latency
- Certificate issuance success/failure rates
- Student enrollment completion rates
- Database query performance by bounded context

**Tools Stack:**
- Prometheus/Grafana for metrics
- ELK Stack for log aggregation
- Jaeger/Zipkin for distributed tracing
- Health checks with Spring Boot Actuator

## Deployment and Operations

### 1. CI/CD Pipeline Requirements

**Pipeline Stages:**
1. **Build:** Compile, run unit tests, static analysis (Detekt, SonarQube)
2. **Test:** Integration tests, contract tests, security scanning
3. **Package:** Docker image creation with multi-stage builds
4. **Deploy:** Blue/green deployment to Kubernetes cluster
5. **Verify:** Smoke tests, performance tests, user acceptance testing

```yaml
# GitHub Actions example
name: Maritime LMS CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 21
        uses: actions/setup-java@v3
        with:
          java-version: '21'
          distribution: 'temurin'
      - name: Build with Gradle
        run: ./gradlew build --no-daemon
      - name: Run tests
        run: ./gradlew test --no-daemon
      - name: Build Docker image
        run: docker build -t maritime-lms/student-service:${{ github.sha }} .
```

### 2. Disaster Recovery and High Availability

**Resilience Patterns:**
- Circuit breakers for external service calls (Resilience4j)
- Bulkheads to isolate failures
- Retry mechanisms with exponential backoff
- Database replication and automatic failover

**Recovery Objectives:**
- RTO (Recovery Time Objective): < 15 minutes
- RPO (Recovery Point Objective): < 5 minutes data loss
- Multi-region deployment for maritime emergency scenarios

## Anti-Corruption Layers

### Cross-Bounded Context Integration

When integrating with legacy systems or external maritime authorities:

```kotlin
// Anti-corruption layer example
@Service
class MaritimeAuthorityAdapter(
    private val externalAuthorityClient: ExternalAuthorityClient,
    private val certificateFactory: CertificateFactory
) {
    
    fun convertExternalCertificate(externalCert: ExternalCertificateDto): MaritimeCertificate {
        return certificateFactory.createFromExternal(
            externalCert.id,
            externalCert.studentId,
            CertificateType.fromExternalCode(externalCert.typeCode),
            externalCert.issueDate.atStartOfDay(),
            externalCert.expiryDate.atStartOfDay(),
            CertificateStatus.ACTIVE
        )
    }
}
```

**Integration Patterns:**
- **REST APIs:** For synchronous operations with external systems
- **Message Queues:** For asynchronous integration (STCW record updates)
- **File Transfer:** For bulk data exchange with maritime authorities
- **Webhooks:** For real-time notifications of certificate status changes

## Evolutionary Architecture Guidelines

### 1. Refactoring Strategy

**When to Refactor:**
- When domain model doesn't match business reality
- When bounded contexts have high coupling
- When performance bottlenecks appear in domain logic
- When new maritime regulations require system changes

**Refactoring Techniques:**
- Strangler Fig pattern for legacy replacement
- Branch by Abstraction for large-scale changes
- Parallel change for zero-downtime deployments
- Dark launching for new features

### 2. Technology Evolution

**Stack Evolution Path:**
- **Current:** Spring Boot 3, Kotlin, PostgreSQL, Kafka
- **Future Considerations:** 
  - Quarkus/Micronaut for improved startup time
  - GraphQL for flexible API queries
  - Service mesh (Istio/Linkerd) for advanced traffic management
  - Vector databases for competency recommendation systems

## Compliance and Security

### Maritime Regulatory Requirements

**Data Requirements:**
- GDPR compliance for European maritime students
- STCW record retention (minimum 5 years)
- Audit trails for all certification changes
- Role-based access control for maritime authorities

**Security Patterns:**
- OAuth2/OIDC for authentication
- Attribute-based access control (ABAC) for sensitive operations
- End-to-end encryption for student records in transit
- Regular security audits and penetration testing

## Getting Started Guide

### New Service Creation Checklist

When creating a new microservice:

1. **Define Bounded Context:**
   - [ ] Identify domain boundaries with maritime domain experts
   - [ ] Define ubiquitous language terms
   - [ ] Document context map relationships

2. **Set Up Project Structure:**
   - [ ] Create domain, application, infrastructure, interfaces modules
   - [ ] Configure Gradle multi-project build
   - [ ] Set up Git repository with proper branching strategy

3. **Implement Core Domain:**
   - [ ] Define aggregate roots, entities, value objects
   - [ ] Implement domain services and domain events
   - [ ] Create repository interfaces

4. **Build Infrastructure:**
   - [ ] Configure database schema migrations (Flyway/Liquibase)
   - [ ] Set up event messaging infrastructure
   - [ ] Implement repository concrete classes

5. **Create Interfaces:**
   - [ ] Build REST controllers with OpenAPI documentation
   - [ ] Implement message consumers for events
   - [ ] Configure monitoring and observability

6. **Quality Assurance:**
   - [ ] Write unit tests for domain logic (100% coverage)
   - [ ] Create integration tests for critical paths
   - [ ] Set up CI/CD pipeline with quality gates

## Troubleshooting Guide

### Common Issues and Solutions

**Issue: Domain events not being processed**
- **Root Cause:** Event handler not registered or transaction boundaries incorrect
- **Solution:** Check Spring component scanning, verify transactional boundaries, add logging to event flow

**Issue: Performance degradation during student enrollment peaks**
- **Root Cause:** Database contention on student records
- **Solution:** Implement read replicas, add caching layer, optimize database indexes, use asynchronous processing

**Issue: Inconsistent data between services**
- **Root Cause:** Eventual consistency not properly handled
- **Solution:** Implement saga pattern for distributed transactions, add compensation handlers, improve event idempotency

**Issue: Complex domain logic becoming unmanageable**
- **Root Cause:** Bounded context boundaries unclear or too large
- **Solution:** Refactor into smaller contexts, apply strategic DDD patterns, extract domain services

## References and Further Reading

### Essential Resources
- **Domain-Driven Design: Tackling Complexity in the Heart of Software** (Eric Evans)
- **Implementing Domain-Driven Design** (Vaughn Vernon)
- **Spring Boot Reference Documentation**
- **Event Storming Workshop Guide** (Alberto Brandolini)
- **Maritime Training Standards** (IMO STCW Convention)

### Code Examples
- [ttulka/ddd-example-ecommerce-microservices](https://github.com/ttulka/ddd-example-ecommerce-microservices) - DDD microservices example
- [spring-petclinic/spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices) - Spring Boot microservices reference
- [eventuate-tram/eventuate-tram-examples](https://github.com/eventuate-tram/eventuate-tram-examples) - Event-driven microservices patterns

