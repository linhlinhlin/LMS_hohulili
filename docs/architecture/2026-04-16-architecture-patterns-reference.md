# Architecture Patterns Reference — LMS Maritime

> **Date**: 2026-04-16 | **Author**: Claude Code Architecture Audit | **Status**: Living Document

---

## 1. Clean Architecture / DDD — Rules & Compliance

### 1.1 Layer Boundaries (Enforced by ArchUnit)

```
┌─────────────────────────────────────────────┐
│                 Infrastructure               │
│   Controllers, JPA Entities, Adapters,       │
│   External Services (R2, Email, CF Stream)   │
├─────────────────────────────────────────────┤
│                 Application                  │
│   Use Cases, DTOs, Ports                     │
│   Transaction Boundary = Use Case            │
├─────────────────────────────────────────────┤
│                   Domain                     │
│   Models, Value Objects, Events, Exceptions  │
│   ⚠ NEVER imports Spring, JPA, Infrastructure│
└─────────────────────────────────────────────┘

Dependency Rule: Outer layers → Inner layers ONLY
              Infrastructure → Application → Domain
              Domain NEVER imports anything from upper layers
```

**ArchUnit enforcement**: `CleanArchitectureTest.java` — automated tests verify:
- Domain models never import `javax.persistence`, `jakarta.persistence`, `org.springframework`
- Domain repository interfaces contain NO JPA annotations
- Use cases never directly access JPA repositories (except read-side query ports)

### 1.2 Repository Pattern — Port & Adapter

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Domain Port      │    │ Adapter          │    │ JPA Repository   │
│ (Interface)      │◄───│ (Implementation) │───►│ (Spring Data)    │
│                  │    │                  │    │                  │
│ Course find(id)  │    │ toEntity()       │    │ JpaEntity ONLY   │
│ Course save(c)   │    │ toDomain()       │    │ NEVER domain     │
└─────────────────┘    └─────────────────┘    └──────────────────┘
```

**Golden Rule**: `JpaRepository<XJpaEntity, UUID>` — NEVER domain model.

**Correct**:
```java
// Domain port
public interface CourseRepository {
    Optional<Course> findById(UUID id);
    Course save(Course course);
}

// JPA repository
public interface CourseJpaRepository extends JpaRepository<CourseJpaEntity, UUID> {}

// Adapter connects them
@Component
public class CourseRepositoryAdapter implements CourseRepository {
    private final CourseJpaRepository jpaRepo;
    private final CourseEntityMapper mapper;
    
    public Optional<Course> findById(UUID id) {
        return jpaRepo.findById(id).map(mapper::toDomain);
    }
    
    public Course save(Course course) {
        CourseJpaEntity entity = mapper.toEntity(course);
        return mapper.toDomain(jpaRepo.save(entity));
    }
}
```

**Wrong** (causes `Not a managed type` crash):
```java
// NEVER DO THIS
public interface CourseRepository extends JpaRepository<Course, UUID> {}
```

### 1.3 Exception Hierarchy

```
DomainException (base, with errorCode)
├── BusinessRuleException    — Violated business rule ("INVALID_STATUS")
├── EntityNotFoundException  — Entity not found (404)
├── UnauthorizedException    — No permission (403)
└── ValidationException      — Field-level validation errors (400)
    └── Builder pattern: .addError("email", "invalid format")
```

**Rule**: Domain throws domain exceptions. `GlobalExceptionHandler` maps them to HTTP status.

### 1.4 DTO Mapping — 3 Layers

```
Controller ←── Response DTO (immutable record)
                    ↑
               Use Case (maps domain → response)
                    ↑
              Domain Model (pure business logic)
                    ↑
               Adapter (maps JPA entity ↔ domain)
                    ↑
              JPA Entity (database representation)
```

**Convention**: 
- Command DTOs = records with validation: `CreateCourseCommand`, `UpdateChapterCommand`
- Response DTOs = records with `from()` static factory: `CourseResponse.from(course)`
- JPA entities = Lombok `@Builder`, `@Entity` — NEVER leaked to controllers

### 1.5 Transaction Boundaries

**Rule**: Each Use Case = 1 transaction.

```java
@Service
@RequiredArgsConstructor
public class ApproveCourseUseCase {
    
    @Transactional  // <-- Transaction boundary
    public CourseResponse execute(UUID courseId, UUID reviewerId, String comment) {
        Course course = courseRepository.findById(courseId)...;
        course.approve(reviewerId, comment);       // Domain logic
        course = courseRepository.save(course);     // Persist
        coursePublicationPort.publish(...);         // Side effect within same tx
        course.getDomainEvents().forEach(publisher::publish);  // Events
        return CourseResponse.from(course);
    }
}
```

**Event handlers with separate transactions**:
```java
@TransactionalEventListener
@Transactional(propagation = Propagation.REQUIRES_NEW)  // Isolated
public void handleCourseApproved(CourseApprovedEvent event) { ... }
```

---

## 2. Design Patterns In Use

### 2.1 Immutable Snapshot Pattern

**Where**: `CoursePublicationService.publish()`

```
Teacher edits draft ──► submitForApproval() ──► Admin approves
                                                     │
                                                     ▼
                                            publish() creates
                                            CoursePublicationJpaEntity
                                            with JSONB snapshot:
                                            {
                                              "detail": { title, desc, ... },
                                              "content": [ chapters, lessons, ... ]
                                            }
```

**Key properties**:
- Snapshot is **immutable** — never modified after creation
- Each publication = new row with incremented `publicationNumber`
- Learners always see published snapshot, NEVER the draft
- Teacher always edits draft, NEVER the published version

**Compared to Event Sourcing**: Simpler. No event replay, no projections. Just full state snapshots. Sufficient for current scale.

### 2.2 CQRS (Partial)

**Read-side optimization**: ArchUnit allows Get* use cases to access JPA directly:
```java
// Query port for read-optimized access
public interface QuizStatisticsQueryPort {
    QuizStatistics getStatistics(UUID quizId);
}
```

**Write-side**: Must go through domain ports (repository interfaces).

### 2.3 Domain Events

**Pattern**: Aggregate registers events → Use Case publishes after save.

```java
// In domain model
course.registerEvent(new CourseApprovedEvent(...));

// In use case
course = courseRepository.save(course);
course.getDomainEvents().forEach(eventPublisher::publish);
course.clearDomainEvents();
```

**Cross-module communication**:
- `CourseApprovedEvent` → Learning Delivery module creates enrollment slots
- `CourseRejectedEvent` → (currently unhandled — Gap 3 from approval analysis)
- `CourseSubmittedForApprovalEvent` → (currently unhandled)

### 2.4 Sliding Window Rate Limiting

**File**: `RateLimitingFilter.java`

**Algorithm**: Cloudflare/Stripe sliding window counter — prevents burst-at-boundary.

**Tiered limits (per IP, per minute)**:
| Endpoint | Limit | Reason |
|----------|-------|--------|
| POST /auth/login | 20/min | Brute-force (NAT-safe) |
| POST /auth/register | 10/min | Account creation abuse |
| POST /auth/forgot-password | 5/min | Email bombing |
| /auth/** (other) | 60/min | General auth |
| /ai/** | 30/min | AI API cost control |
| /payments/** | 30/min | Payment security |
| Public (unauthenticated) | 120/min | API crawling |
| Authenticated | 600/min | Normal usage |

**Anti-spoofing**: Uses rightmost IP from X-Forwarded-For (added by Caddy/nginx, not client).

---

## 3. Frontend Architecture Patterns

### 3.1 Signal-Based State Management

```typescript
// Component-level state
items = signal<Item[]>([]);
selectedId = signal<string | null>(null);
isLoading = signal(false);

// Derived state
filteredItems = computed(() => 
  this.items().filter(i => i.status === 'active')
);

// Side effects
effect(() => {
  const id = this.selectedId();
  if (id) this.loadDetails(id);
});
```

**Store pattern** (complex components like Course Editor):
```typescript
// CourseEditorStore — centralized state
courseTree = signal<CourseTree | null>(null);

// Computed selectors
chapters = computed(() => this.courseTree()?.chapters ?? []);
readinessChecklist = computed(() => this.evaluateReadiness());

// Mutations via single entry point
setCourseTreeState(updater: (tree: CourseTree) => CourseTree) { ... }
```

### 3.2 Dual Signal/Observable Pattern (Migration)

```typescript
// AuthService — supports both patterns during incremental migration
private currentUser = new BehaviorSubject<User | null>(null);  // Legacy

currentUserSignal = toSignal(this.currentUser);  // New
isAuthenticatedSignal = computed(() => !!this.currentUserSignal());
userRoleSignal = computed(() => this.currentUserSignal()?.role);
```

**Rule**: New components use signals. Existing RxJS code migrates incrementally.

### 3.3 API Interceptor Chain

```
Request → BaseUrlInterceptor (SSR: http://backend:8080)
        → AuthInterceptor (Bearer token + refresh on 401)
        → OfflineInterceptor (graceful degradation)
        → ErrorInterceptor (retry 5xx once, standardize errors)
        → Server
```

**Token refresh**: BehaviorSubject + `filter()/take()/switchMap()` — concurrent requests wait for single refresh.

### 3.4 Component Conventions (Angular 20.3)

```typescript
@Component({
  // standalone: true is DEFAULT — NEVER specify
  changeDetection: ChangeDetectionStrategy.OnPush,  // REQUIRED 100%
  imports: [CommonModule],  // Only if using pipes (| date, | number)
})
export class ExampleComponent {
  private service = inject(MyService);     // inject(), NEVER constructor
  data = input.required<Data>();           // input(), NEVER @Input()
  itemSelected = output<Item>();           // output(), NEVER @Output()
  container = viewChild<ElementRef>('ref'); // viewChild(), NEVER @ViewChild
}
```

---

## 4. Security Checklist (OWASP 2025+)

### 4.1 Already Implemented

| Category | Implementation | File |
|----------|---------------|------|
| **Rate Limiting** | Sliding window, tiered per endpoint | `RateLimitingFilter.java` |
| **JWT Auth** | Stateless, token refresh, JJWT 0.12.3 | `JwtAuthenticationFilter.java` |
| **CORS** | Configurable origins, credentials allowed | `SecurityConfig.java` |
| **CSRF** | Disabled (stateless JWT, no cookies) | `SecurityConfig.java` |
| **Input Validation** | `ValidationException` with field-level errors | `GlobalExceptionHandler.java` |
| **File Upload** | Presigned URLs (R2), MIME type validation | `PresignedUploadUseCase.java` |
| **Email Enumeration** | Masked emails for non-admin (`te*****@maritime.edu`) | `UserControllerV3.java` |
| **Error Info Leak** | Generic error messages (no stack traces, no emails) | Enrollment endpoints |
| **Page Size Cap** | Max 50 (search), 100 (lists) | Various controllers |
| **Role-based Access** | `@PreAuthorize` with ADMIN/ORG_ADMIN/TEACHER/STUDENT | All controllers |
| **Org-scoped Admin** | ORG_ADMIN limited to their organization | `AdminCoursesControllerV3.java` |

### 4.2 Areas to Monitor

| Category | Status | Notes |
|----------|--------|-------|
| **JWT Token Rotation** | Basic refresh | Consider adding token blacklisting for logout |
| **SQL Injection** | Protected by JPA/JPQL | Custom native queries should use parameterized queries |
| **XSS** | Angular auto-escapes | Content blocks (EditorJS, Tiptap) need sanitization on render |
| **SSRF** | `NG_ALLOWED_HOSTS` for SSR | Backend API calls to external services should validate URLs |
| **Dependency Vulnerabilities** | Manual review | Consider automated scanning (Dependabot, Snyk) |
| **Secrets Management** | `.env` files | Never commit `.env.prod` — `.gitignore` covers this |

---

## 5. Skill Usage Guide — Khi nào dùng skill nào

### 5.1 `01-backend-ddd-development` SKILL

**Dùng khi**:
- Tạo domain model mới (entity, value object, repository port)
- Implement use case mới
- Tạo JPA entity + adapter + mapper
- Fix lỗi "Not a managed type"
- Thêm migration (Flyway)

**Không dùng khi**: FE work, config changes, documentation

### 5.2 `angular-v20-frontend` SKILL

**Dùng khi**:
- Tạo component mới (signals, OnPush, inject())
- Thêm API endpoint integration
- State management (signal, computed, effect)
- Route configuration
- Fix FE build errors

**Không dùng khi**: Backend work, database changes

### 5.3 `karpathy-guidelines` SKILL (QUAN TRỌNG)

**PHẢI dùng TRƯỚC khi viết code mới hoặc refactor.**

**4 nguyên tắc cốt lõi**:

| # | Nguyên tắc | Áp dụng |
|---|-----------|---------|
| 1 | **Think Before Coding** | Nêu assumptions, nếu unclear thì hỏi, không đoán mò |
| 2 | **Simplicity First** | Viết 50 dòng thay vì 200 dòng. Không thêm abstraction chưa cần |
| 3 | **Surgical Changes** | Chỉ sửa code liên quan. Không "cải tiến" code xung quanh |
| 4 | **Goal-Driven** | Định nghĩa success criteria trước. Loop verify đến khi pass |

**Pattern áp dụng**:
```
Trước khi implement:
1. Gọi karpathy-guidelines skill
2. Đọc 4 nguyên tắc
3. Nêu assumptions + success criteria
4. Implement → verify → iterate
```

### 5.4 `cot-research` SKILL

**Dùng khi**:
- Debug lỗi phức tạp (nhiều layer liên quan)
- Lên kế hoạch refactor lớn
- So sánh SOTA patterns
- Root cause analysis (5 Whys)

**Workflow**:
```
Problem Definition → 5 Whys → Logic Flow Mapping → SOTA Research → Comparison → Solution
```

### 5.5 `security-review` SKILL

**Dùng khi**:
- Trước khi merge PR có thay đổi auth/permissions
- Khi thêm endpoint mới (kiểm tra `@PreAuthorize`)
- Khi sửa file upload logic
- Khi thay đổi CORS/JWT config
- Periodic audit (mỗi 2 tuần)

---

## 6. Enterprise Pattern References (2026)

### LMS Domain — Tham khảo

| Platform | Pattern đáng học | Áp dụng cho dự án |
|----------|-----------------|-------------------|
| **Canvas LMS** | Blueprint courses, SpeedGrader, Outcomes | Version management, grading workflow |
| **Moodle 4.5** | Activity completion, Competency frameworks | Progress tracking, STCW compliance |
| **Coursera** | Session-based versioning, Peer review | Publication snapshots (đã implement) |
| **Google Classroom** | Real-time sync, Material sharing | WebSocket messaging (đã implement) |
| **edX/Open edX** | XBlock architecture, ORA | Content block system (đã implement) |
| **Blackboard Ultra** | AI design assistant, Ally accessibility | AI assistant (đã implement), a11y |

### Architecture — Tham khảo

| Pattern | Nguồn | Trạng thái trong project |
|---------|-------|------------------------|
| Clean Architecture | Uncle Bob | **Implemented** + ArchUnit enforced |
| DDD (Domain-Driven Design) | Eric Evans | **Implemented** — aggregates, VOs, events |
| CQRS | Greg Young | **Partial** — read-side optimization |
| Immutable Snapshot | Event Sourcing lite | **Implemented** — course publications |
| Sliding Window Rate Limit | Cloudflare/Stripe | **Implemented** — tiered by endpoint |
| Port & Adapter | Hexagonal Architecture | **Implemented** — domain ports + JPA adapters |
| Domain Events | Udi Dahan | **Implemented** — sync publication within tx |

---

*Tài liệu này là reference sống. Cập nhật khi có thay đổi kiến trúc quan trọng.*
*Xem approval flow analysis tại `2026-04-16-admin-approval-sota-analysis.md`.*
