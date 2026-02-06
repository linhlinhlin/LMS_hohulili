---
name: 01-backend-ddd-development
description: Backend development standards for Spring Boot 3.2+ with Java 21, Clean Architecture / DDD, and modern patterns (2026). Covers layered architecture, domain modeling, JPA repository patterns, security hardening, and testing. Use when implementing features, fixing bugs, or refactoring the maritime LMS backend.
---

# Spring Boot 3.2+ Clean Architecture Standard (2026)

> **Stack**: Java 21 + Spring Boot 3.2.6 + PostgreSQL 16 + Hibernate 6.4
> **Architecture**: Modular Monolith with Clean Architecture / DDD
> **Last Updated**: February 2026

---

## Architecture Overview

### Layer Dependency Rule

```
Domain ← Application ← Infrastructure
(inner)   (middle)      (outer)

Domain:        Pure Java. Zero framework imports.
Application:   Domain ports only. No @Entity, no Spring Data, no HTTP.
Infrastructure: Implements ports. Contains Spring, JPA, REST controllers.
```

### Module Structure

```
{module}/
├── domain/
│   ├── model/            # Aggregate roots, entities, enums
│   ├── repository/       # Port interfaces (e.g., CourseRepository)
│   ├── valueobject/      # Value objects (CourseCode, Email)
│   └── event/            # Domain events
├── application/
│   ├── usecase/          # Single-responsibility use cases
│   ├── dto/              # Command records, response records
│   └── port/             # Application-level ports (TokenService)
└── infrastructure/
    ├── persistence/
    │   ├── entity/       # @Entity classes (*JpaEntity suffix)
    │   ├── mapper/       # JpaEntity <-> Domain mappers
    │   └── *Adapter.java # Port implementations
    └── web/              # @RestController classes
```

---

## Java 21 Modern Patterns

### Records for DTOs (Immutable by Design)

```java
// Command (input)
public record CreateCourseCommand(
    @NotBlank String code,
    @NotBlank @Size(max = 255) String title,
    @Size(max = 5000) String description,
    @NotNull UUID teacherId
) {}

// Response (output)
public record CourseResponse(
    UUID id,
    String code,
    String title,
    String description,
    String status,
    UUID teacherId,
    boolean editable,
    Instant createdAt
) {}
```

### Sealed Interfaces for Type-Safe Domain Events

```java
public sealed interface DomainEvent permits
    CourseCreatedEvent,
    CourseApprovedEvent,
    CourseRejectedEvent,
    UserRegisteredEvent {

    Instant occurredAt();
    String aggregateId();
}

public record CourseCreatedEvent(
    UUID courseId,
    String title,
    UUID teacherId,
    Instant occurredAt
) implements DomainEvent {
    public String aggregateId() { return courseId.toString(); }
}
```

### Pattern Matching (Java 21)

```java
// switch expressions with pattern matching
public String getStatusLabel(CourseStatus status) {
    return switch (status) {
        case DRAFT -> "Draft";
        case PENDING -> "Pending Review";
        case APPROVED -> "Approved";
        case REJECTED -> "Rejected";
        case PUBLISHED -> "Published";
        case ARCHIVED -> "Archived";
    };
}

// instanceof pattern matching
if (exception instanceof EntityNotFoundException e) {
    return ResponseEntity.notFound().build();
} else if (exception instanceof BusinessRuleException e) {
    return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
}
```

### Text Blocks for SQL/Messages

```java
@Query("""
    SELECT e FROM EnrollmentJpaEntity e
    WHERE e.classId = :classId
    AND e.status = 'ACTIVE'
    ORDER BY e.enrolledAt DESC
    """)
List<EnrollmentJpaEntity> findActiveByClassId(@Param("classId") UUID classId);
```

### Virtual Threads (Java 21)

```yaml
# application.yml - Enable virtual threads
spring:
  threads:
    virtual:
      enabled: true  # All @Async and web threads use virtual threads
```

---

## Domain Layer Patterns

### Rich Domain Model (NOT Anemic)

```java
// CORRECT: Domain model with business logic
public class Course extends BaseEntity<UUID> {
    private CourseCode code;
    private String title;
    private CourseStatus status;
    private List<Chapter> chapters = new ArrayList<>();

    // Factory method with validation
    public static Course create(CourseCode code, String title, String desc, UUID teacherId) {
        Objects.requireNonNull(code, "Course code is required");
        if (title == null || title.isBlank()) {
            throw new ValidationException("Title cannot be blank");
        }
        return new Course(UUID.randomUUID(), code, title, desc, teacherId, CourseStatus.DRAFT);
    }

    // Business method (NOT a setter)
    public void submitForApproval() {
        ensureEditable();
        if (chapters.isEmpty()) {
            throw new BusinessRuleException("Course must have at least one chapter");
        }
        this.status = CourseStatus.PENDING;
    }

    public void approve(UUID reviewerId, String comment) {
        if (status != CourseStatus.PENDING) {
            throw new BusinessRuleException("Only pending courses can be approved");
        }
        this.status = CourseStatus.APPROVED;
        this.reviewedById = reviewerId;
        this.reviewComment = comment;
        this.reviewedAt = Instant.now();
    }

    public boolean isEditable() {
        return status == CourseStatus.DRAFT || status == CourseStatus.REJECTED;
    }

    private void ensureEditable() {
        if (!isEditable()) {
            throw new BusinessRuleException("Course is not editable in status: " + status);
        }
    }
}

// WRONG: Anemic model with public setters
public class BadCourse {
    private String title;
    public void setTitle(String title) { this.title = title; }  // NO!
    public void setStatus(CourseStatus s) { this.status = s; }  // NO!
}
```

### Value Objects

```java
// Self-validating, immutable
public record Email(String value) {
    public Email {
        Objects.requireNonNull(value, "Email cannot be null");
        value = value.trim().toLowerCase();
        if (!value.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            throw new ValidationException("Invalid email format: " + value);
        }
    }

    public static Email of(String value) {
        return new Email(value);
    }

    public String getDomain() {
        return value.substring(value.indexOf('@') + 1);
    }
}

public record CourseCode(String value) {
    public CourseCode {
        Objects.requireNonNull(value, "Course code cannot be null");
        if (value.isBlank()) throw new ValidationException("Course code cannot be blank");
    }

    public static CourseCode of(String value) {
        return new CourseCode(value);
    }
}
```

### Domain Repository Port (Interface)

```java
// Domain port - NO framework annotations, NO JPA types
public interface CourseRepository {
    Course findById(UUID id);
    Course save(Course course);
    boolean existsByCode(CourseCode code);
    List<Course> findByTeacherId(UUID teacherId);
    void deleteById(UUID id);
}
```

### Domain Events

```java
// Interface in shared/domain/event/ (NOT infrastructure!)
public interface DomainEventPublisher {
    void publish(DomainEvent event);
    default void publishAll(Iterable<? extends DomainEvent> events) {
        events.forEach(this::publish);
    }
}

// Usage in use case
public CourseResponse execute(CreateCourseCommand cmd) {
    var course = Course.create(...);
    course = courseRepository.save(course);
    eventPublisher.publish(new CourseCreatedEvent(course.getId(), course.getTitle()));
    return toResponse(course);
}
```

---

## Application Layer Patterns

### Use Case (Single Responsibility)

```java
@Component
@RequiredArgsConstructor
public class CreateAssignmentUseCaseV3 {
    // ONLY domain ports - never JPA repos or Spring services
    private final AssignmentRepository assignmentRepository;

    public UUID execute(CreateAssignmentCommand cmd) {
        var assignment = Assignment.create(
            cmd.title(),
            cmd.description(),
            cmd.courseId(),
            cmd.teacherId(),
            cmd.type()
        );

        if (cmd.dueDate() != null) {
            assignment.setDueDate(cmd.dueDate());
        }

        assignment = assignmentRepository.save(assignment);
        return assignment.getId();
    }
}
```

### Application Port (For Infrastructure Services)

```java
// Port in application layer
public interface TokenService {
    String generateAccessToken(UUID userId, String email, String role);
    String generateRefreshToken(UUID userId, String email, String role);
    String extractEmail(String token);
    boolean isTokenValid(String token);
}

// Adapter in infrastructure layer
@Component
public class TokenServiceAdapter implements TokenService {
    private final JwtTokenAdapter jwtAdapter;  // Infrastructure dependency OK here

    @Override
    public String generateAccessToken(UUID userId, String email, String role) {
        return jwtAdapter.generateAccessToken(userId, email, role);
    }
}
```

---

## Infrastructure Layer Patterns

### JPA Entity (CRITICAL RULE)

```java
// JPA entity - ALWAYS suffix with JpaEntity
// ALWAYS in infrastructure/persistence/entity/
@Entity
@Table(name = "courses")
@Getter @Setter
@NoArgsConstructor
public class CourseJpaEntity {
    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private CourseStatus status;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // Audit fields
    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
```

### JPA Repository

```java
// CORRECT: Uses *JpaEntity class
@Repository
public interface CourseJpaRepository extends JpaRepository<CourseJpaEntity, UUID> {

    @Query("""
        SELECT c FROM CourseJpaEntity c
        WHERE c.status = :status
        ORDER BY c.createdAt DESC
        """)
    Page<CourseJpaEntity> findByStatus(@Param("status") CourseStatus status, Pageable pageable);

    boolean existsByCode(String code);

    List<CourseJpaEntity> findByTeacherId(UUID teacherId);
}

// WRONG: Uses domain model → causes "Not a managed type" error at startup
public interface BadRepository extends JpaRepository<Course, UUID> {} // NEVER!
```

### Repository Adapter

```java
@Component
@RequiredArgsConstructor
public class CourseRepositoryAdapter implements CourseRepository {
    private final CourseJpaRepository jpaRepo;
    private final CourseEntityMapper mapper;

    @Override
    public Course findById(UUID id) {
        return jpaRepo.findById(id)
            .map(mapper::toDomain)
            .orElse(null);
    }

    @Override
    public Course save(Course course) {
        var entity = mapper.toEntity(course);
        var saved = jpaRepo.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public boolean existsByCode(CourseCode code) {
        return jpaRepo.existsByCode(code.value());
    }
}
```

### Entity Mapper

```java
@Component
public class CourseEntityMapper {

    public Course toDomain(CourseJpaEntity entity) {
        return Course.builder()
            .id(entity.getId())
            .code(CourseCode.of(entity.getCode()))
            .title(entity.getTitle())
            .description(entity.getDescription())
            .status(entity.getStatus())
            .teacherId(entity.getTeacherId())
            .build();
    }

    public CourseJpaEntity toEntity(Course domain) {
        var entity = new CourseJpaEntity();
        entity.setId(domain.getId());
        entity.setCode(domain.getCode().value());
        entity.setTitle(domain.getTitle());
        entity.setDescription(domain.getDescription());
        entity.setStatus(domain.getStatus());
        entity.setTeacherId(domain.getTeacherId());
        return entity;
    }
}
```

### REST Controller

```java
@RestController
@RequestMapping("/api/v3/assignments")
@RequiredArgsConstructor
public class AssignmentControllerV3 {
    private final CreateAssignmentUseCaseV3 createAssignment;
    private final UpdateAssignmentUseCaseV3 updateAssignment;

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<?> create(@Valid @RequestBody CreateAssignmentCommand cmd) {
        UUID id = createAssignment.execute(cmd);
        return ResponseEntity.ok(ApiResponse.success("Assignment created", id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<?> update(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateAssignmentCommand cmd
    ) {
        updateAssignment.execute(id, cmd);
        return ResponseEntity.ok(ApiResponse.success("Assignment updated"));
    }
}
```

---

## Security Patterns (Spring Security 6.x)

### SecurityFilterChain (Modern Style)

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                .httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(31536000))
                .contentTypeOptions(Customizer.withDefaults()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v3/auth/login", "/api/v3/auth/register").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v3/courses", "/api/v3/courses/**").permitAll()
                .requestMatchers("/api/v3/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

### Rate Limiting

```java
@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    private final Map<String, Deque<Instant>> requestCounts = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS = 10;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
        throws ServletException, IOException {
        if (isAuthEndpoint(req.getRequestURI())) {
            String key = getClientIP(req);
            if (isRateLimited(key)) {
                res.setStatus(429);
                return;
            }
        }
        chain.doFilter(req, res);
    }
}
```

### CORS Configuration

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    var config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(
        env.getProperty("CORS_ALLOWED_ORIGINS", "http://localhost:4200").split(",")
    ));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

---

## Database Patterns

### Flyway Migrations

```sql
-- V31__add_new_feature.sql
-- Always use IF NOT EXISTS for idempotency
CREATE TABLE IF NOT EXISTS new_feature (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_new_feature_name ON new_feature(name);

-- Constraints
ALTER TABLE new_feature
    ADD CONSTRAINT IF NOT EXISTS fk_new_feature_course
    FOREIGN KEY (course_id) REFERENCES courses(id);
```

### Spring Data Pageable (DB-Level Pagination)

```java
// CORRECT: DB-level pagination
@Query("SELECT e FROM CourseJpaEntity e WHERE e.status = :status")
Page<CourseJpaEntity> findByStatus(@Param("status") String status, Pageable pageable);

// Controller
@GetMapping
public ResponseEntity<?> list(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    var result = repository.findAll(pageable);
    return ResponseEntity.ok(ApiResponse.success(result));
}

// WRONG: Manual subList pagination (loads ALL rows)
List<Course> all = repo.findAll();
List<Course> page = all.subList(offset, Math.min(offset + size, all.size())); // NO!
```

### JSONB Columns (Hypersistence Utils)

```java
@Entity
@Table(name = "lessons")
public class LessonJpaEntity {

    @Type(JsonType.class)
    @Column(name = "content_blocks", columnDefinition = "jsonb")
    private List<ContentBlock> contentBlocks;
}
```

---

## Exception Handling

### Domain Exception Hierarchy

```java
// Base exceptions (shared/exception/)
public class EntityNotFoundException extends RuntimeException {
    public EntityNotFoundException(String entity, Object id) {
        super(entity + " not found with id: " + id);
    }
}

public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}

public class ValidationException extends RuntimeException { ... }
public class UnauthorizedException extends RuntimeException { ... }
```

### Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<?> handleNotFound(EntityNotFoundException e) {
        return ResponseEntity.status(404)
            .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<?> handleBusinessRule(BusinessRuleException e) {
        return ResponseEntity.badRequest()
            .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException e) {
        var errors = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .toList();
        return ResponseEntity.badRequest()
            .body(ApiResponse.error("Validation failed", errors));
    }
}
```

---

## Testing Patterns

### Domain Model Tests (Pure Logic, Zero Mocks)

```java
@DisplayName("Course Domain Model Tests")
class CourseTest {

    @Test
    @DisplayName("Should create course in DRAFT status")
    void shouldCreateInDraftStatus() {
        var course = Course.create(
            CourseCode.of("CS101"), "Intro", "Desc", UUID.randomUUID());
        assertThat(course.getStatus()).isEqualTo(CourseStatus.DRAFT);
        assertThat(course.isEditable()).isTrue();
    }

    @Test
    @DisplayName("Should throw when submitting without chapters")
    void shouldThrowWhenNoChapters() {
        var course = Course.create(
            CourseCode.of("CS101"), "Intro", "Desc", UUID.randomUUID());
        assertThatThrownBy(() -> course.submitForApproval())
            .isInstanceOf(BusinessRuleException.class);
    }
}
```

### Use Case Tests (Mock Ports)

```java
@ExtendWith(MockitoExtension.class)
@DisplayName("CreateCourseUseCase Tests")
class CreateCourseUseCaseTest {

    @Mock private CourseRepository courseRepository;
    @Mock private DomainEventPublisher eventPublisher;
    @InjectMocks private CreateCourseUseCase useCase;

    @Test
    @DisplayName("Should create course successfully")
    void shouldCreateCourse() {
        // Given
        when(courseRepository.existsByCode(any())).thenReturn(false);
        when(courseRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var cmd = new CreateCourseCommand("CS101", "Title", "Desc", UUID.randomUUID());

        // When
        var response = useCase.execute(cmd);

        // Then
        assertThat(response.code()).isEqualTo("CS101");
        assertThat(response.status()).isEqualTo("DRAFT");
        verify(courseRepository).save(any(Course.class));
    }
}
```

### Integration Tests (Spring Boot)

```java
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CourseApiIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void shouldCreateCourseViaApi() throws Exception {
        var cmd = Map.of(
            "code", "TEST001",
            "title", "Test Course",
            "description", "Description",
            "teacherId", UUID.randomUUID().toString()
        );

        mockMvc.perform(post("/api/v3/authoring/courses")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(cmd))
            .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_TEACHER"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }
}
```

---

## Caching (Caffeine)

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        var caffeineCacheManager = new CaffeineCacheManager();
        caffeineCacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .recordStats());
        return caffeineCacheManager;
    }
}

// Usage
@Cacheable(value = "courses", key = "#id")
public Course findById(UUID id) { ... }

@CacheEvict(value = "courses", key = "#course.id")
public Course save(Course course) { ... }
```

---

## File Storage (Cloudflare R2 / S3-Compatible)

```java
@Service
public class R2StorageService {
    private final S3Client s3Client;
    private final String bucketName;

    public String upload(MultipartFile file, String folder) {
        // Validate MIME type
        String contentType = file.getContentType();
        if (!ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new ValidationException("File type not allowed: " + contentType);
        }

        // Sanitize filename
        String safeFilename = sanitizeFilename(file.getOriginalFilename());
        String key = folder + "/" + UUID.randomUUID() + "_" + safeFilename;

        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build(),
            RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        return key;
    }
}
```

---

## Configuration Best Practices

### Profile-Specific Configuration

```yaml
# application.yml (shared)
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # NEVER use create/update in production
    properties:
      hibernate:
        format_sql: false
    open-in-view: false    # Prevent lazy loading in controllers

# application-dev.yml
spring:
  jpa:
    properties:
      hibernate:
        show_sql: true
        format_sql: true
  flyway:
    enabled: true

# application-prod.yml
spring:
  jpa:
    properties:
      hibernate:
        show_sql: false
  flyway:
    enabled: true
```

### Bean Naming (Avoid Collisions)

```java
// When two modules have same-named beans
@Component("assessment_CourseRepository")
public class CourseRepositoryAdapter implements CourseRepository { ... }

@Component("courseAuthoring_CourseRepository")
public class CourseRepositoryImpl implements CourseRepository { ... }
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Correct Alternative |
|-------------|-------------------|
| `System.out.println()` | Use SLF4J logger: `log.info(...)` |
| `RuntimeException("msg")` | `EntityNotFoundException`, `BusinessRuleException` |
| JPA repo with domain model | JPA repo with `*JpaEntity` class |
| Use case importing JPA entity | Use case importing domain port only |
| Public setters on domain model | Business methods (approve, publish, etc.) |
| Manual subList pagination | Spring Data `Pageable` |
| CORS wildcard `*` | Specific origins from env var |
| Empty catch blocks | Log the error or throw specific exception |
| Hardcoded secrets | Environment variables |
| `@Autowired` field injection | Constructor injection via `@RequiredArgsConstructor` |

---

## Checklist for New Features

```
[ ] Domain model in {module}/domain/model/ (no @Entity)
[ ] Repository port in {module}/domain/repository/
[ ] Use case in {module}/application/usecase/ (no infra imports)
[ ] Command/Response DTOs with Jakarta validation
[ ] JPA entity with *JpaEntity suffix
[ ] JPA repository uses JpaEntity (NOT domain model)
[ ] Mapper: JpaEntity <-> Domain
[ ] Adapter implements domain port
[ ] Controller with @Valid + @PreAuthorize
[ ] Flyway migration for schema changes
[ ] Domain model tests (pure logic)
[ ] Use case tests (mock repos)
[ ] All 202+ existing tests still pass
```

---

## References

- [Spring Boot 3.2 Reference](https://docs.spring.io/spring-boot/docs/3.2.x/reference/html/)
- [Spring Security 6.x](https://docs.spring.io/spring-security/reference/)
- [Hibernate 6.4 User Guide](https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html)
- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
