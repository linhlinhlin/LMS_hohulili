# Phân hệ 1 — Quản trị hệ thống (Phạm Thị Minh Hồng)

> Sinh viên: Phạm Thị Minh Hồng — Lớp CNT63ĐH — VIMARU
> Phụ trách: phân hệ quản trị hệ thống chung (admin, RBAC, audit, settings)

## 1. Kiến trúc lớp (Clean Architecture + DDD)

### Sơ đồ Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         WEB LAYER (REST)                        │
│  AuthControllerV3, UserControllerV3, AdminCoursesControllerV3   │
│         [GuardClauses: @PreAuthorize, @AuthenticationPrincipal] │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (Use Cases)                │
│ - AuthenticateUserUseCaseV2         [port: TokenService]        │
│ - UpdateUserUseCaseV3               [port: UserRepository]      │
│ - ApproveCourseUseCase              [event: CourseApprovedEvent]│
│ - SearchAuditLogUseCase             [port: AuditLogQueryPort]   │
│ - RefreshTokenUseCaseV2, RegisterUserUseCaseV2, ...             │
│ [NO infrastructure imports - pure business logic]               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            DOMAIN LAYER (Models, Value Objects, Ports)          │
│ - Role enum (ADMIN, ORG_ADMIN, TEACHER, STUDENT) [domain]       │
│ - User aggregate (DDD model) [No JPA]                           │
│ - UserRepository port [interface]                               │
│ - TokenService port [JWT abstraction]                           │
│ - DomainEventPublisher [event aggregation]                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            INFRASTRUCTURE LAYER (Persistence + Security)        │
│ - JwtService, TokenServiceAdapter [JWT impl]                    │
│ - UserJpaRepository, AuditLogQueryAdapter [DB adapters]         │
│ - JwtAuthenticationFilter [Bearer token extraction]             │
│ - UserDetailsServiceImpl [Spring Security integration]          │
│ - PasswordConfig [BCryptPasswordEncoder]                        │
│ - SecurityConfig [FilterChain, CORS, CSP headers]               │
└─────────────────────────────────────────────────────────────────┘
```

### Số liệu cấu trúc

| Thành phần | Số file | LOC | Ghi chú |
|---|---|---|---|
| Backend identity module | 91 | ~7,400 | 22 test files |
| Frontend admin features | 48 components | ~30,460 | 23 component theo spec, gồm shared lib |
| Domain models | 5 | ~200 | User, Role, Email, UserId |
| Use cases (application) | 12+ | ~1,500 | Pure business logic |
| Infrastructure web | 5 controllers | ~2,000 | AuthControllerV3, UserControllerV3, ... |
| Security filters | 2 | ~400 | JwtAuthenticationFilter, RateLimitingFilter |

### File chính mỗi tầng

**Domain Layer (Business Rules)**
- `backend/src/main/java/com/example/lms/identity/domain/model/User.java` — DDD aggregate, no JPA
- `backend/src/main/java/com/example/lms/identity/domain/model/Role.java` — 4-tier enum
- `backend/src/main/java/com/example/lms/identity/application/port/TokenService.java` — JWT abstraction

**Application Layer (Use Cases)**
- `backend/src/main/java/com/example/lms/identity/application/usecase/AuthenticateUserUseCaseV2.java:34-69` — Login với role-aware token expiry
- `backend/src/main/java/com/example/lms/course_authoring/application/usecase/ApproveCourseUseCase.java:31-63` — Admin duyệt course + publish event

**Infrastructure Layer (HTTP + Security)**
- `backend/src/main/java/com/example/lms/config/SecurityConfig.java` — Spring Security chain
- `backend/src/main/java/com/example/lms/config/JwtAuthenticationFilter.java:40-97` — Bearer token validation
- `backend/src/main/java/com/example/lms/identity/infrastructure/web/UserControllerV3.java:62-320` — Admin CRUD + multi-tier guards

**Frontend Infrastructure**
- `fe/src/app/features/admin/admin.routes.ts:13-166` — 23 routes với guard
- `fe/src/app/core/guards/role.guard.ts:119,126-148` — systemAdminGuard, systemAdminPortalGuard
- `fe/src/app/features/admin/infrastructure/services/admin.service.ts:1-200` — API layer (signals)

---

## 2. Business Logic chính (7 flow)

### Flow 1 — Authentication (Login + JWT + Refresh Token)

**Mục đích nghiệp vụ:** Xác thực email/mật khẩu, phát hành JWT 2 tier (access 15min + refresh 30 ngày), hỗ trợ TTL theo tổ chức.

**Sequence:**
```
User (POST /api/v3/auth/login)
  -> AuthControllerV3.login() [line 117-129]
      -> AuthenticateUserUseCaseV2.execute() [line 34-69]
          -> UserRepository.findByEmail() [domain port]
          -> User.isEnabled() check [business rule]
          -> PasswordEncoder.matches() [BCrypt]
          -> TokenService.generateAccessToken() [org-aware]
              -> TokenServiceAdapter.generateAccessToken() [line 67-76]
                  -> JwtService.buildToken() [line 59-76, claims: userId, role, organizationId]
          -> AuthResponse [accessToken + refreshToken + userDTO]
```

**Biện luận:**
- **Vì sao JWT?** Stateless → scale ngang dễ, mobile-friendly (native app, RN không có cookie jar), cross-domain CORS dễ.
- **Vì sao tách TokenService port?** Domain layer không biết JWT — JwtService là implementation detail. Đổi qua Paseto/OAuth2 chỉ thay TokenServiceAdapter.
- **Vì sao per-org token expiry?** Multi-tenant — VIMARU có thể set 7 ngày, tổ chức khác 60 ngày. Code: `AuthenticateUserUseCaseV2:71-82` — `computeRefreshExpiryMs()` ưu tiên: user override > org setting > default 30 ngày.
- **Vì sao same error message cho "not found" vs "wrong password"?** Prevent user enumeration attack (OWASP). Code: `AuthenticateUserUseCaseV2:41` — "Thông tin đăng nhập không chính xác" cho cả 2 case.

---

### Flow 2 — RBAC Enforcement (4-tier Admin Hierarchy)

**Mục đích:** ORG_ADMIN không tạo/sửa được ADMIN.

**Sequence:**
```
Admin (POST /api/v3/users)
  -> UserControllerV3.createUser() [line 289-320]
      -> validateUserProvisioningRequest() [checks target role vs current role]
          -> isOrgAdmin(currentUser)? [check organizationId != null AND role == ORG_ADMIN]
              -> isAdminRole(targetRole)? [targetRole == ADMIN or ORG_ADMIN]
                  -> RETURN 403: "ORG_ADMIN không thể tạo ADMIN" [business guard]
          -> isAdmin(currentUser)? [role == ADMIN]
              -> Save user with targetRole + org scoping
```

**4-tier Role Model:**
| Role | Quyền | Phạm vi |
|---|---|---|
| ADMIN | Tạo/sửa ADMIN + ORG_ADMIN; xem all user; settings, logs, analytics | Toàn hệ thống (organizationId = null) |
| ORG_ADMIN | Tạo/sửa TEACHER + STUDENT; xem user trong tổ chức; duyệt khóa học | Trong organizationId của họ |
| TEACHER | Tạo/edit khóa học; view học viên; grading | Khóa học của họ (course.teacher_id) |
| STUDENT | Enroll, submit assignment, view progress | Khóa học đã enroll |

**Biện luận:**
- **Vì sao 4 tier?** VIMARU có 10+ tổ chức đối tác → cần ORG_ADMIN độc lập quản lý tổ chức của họ. Canvas/Moodle cũng dùng mô hình này.
- **Vì sao business guard ở use case, không chỉ @PreAuthorize?** `@PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")` chỉ check role có hay không, nhưng "ORG_ADMIN có thể tạo ADMIN?" cần logic phức tạp → để ở use case layer. Code: `UserControllerV3:299-309`.
- **Multi-tenant scoping:** ORG_ADMIN query: `userRepository.findByOrganizationId(currentUser.getOrganizationId())` [line 102]. ADMIN query: `userRepository.findAll()` [line 113].

---

### Flow 3 — Audit Log (SOC2/ISO27001)

**Sequence:**
```
Admin (GET /api/v3/admin/audit-logs?from=2026-04-01&to=2026-04-26&size=100)
  -> AuditLogsComponent (FE) [renders table]
      -> AdminService.getAuditLogs() [FE API layer]
          -> SearchAuditLogUseCase.execute(query) [line 43-48]
              -> applyDefaultWindow() [line 62-78] — if no from/to, use last 7 days
              -> validateWindow() [line 80-97]
                  -> from <= to? [business rule]
                  -> duration <= 365 days? [SOC2 evidence period]
              -> AuditLogQueryPort.search() [DB adapter]
                  -> AuditLogQueryAdapter [PostgreSQL query]
```

**Audit Log Schema:**
```sql
CREATE TABLE audit_log (
  id SERIAL,
  table_name VARCHAR (e.g., 'users', 'courses'),
  record_id UUID (old user_id, course_id),
  action VARCHAR ('INSERT', 'UPDATE', 'DELETE'),
  old_data JSONB (before state),
  new_data JSONB (after state),
  changed_by UUID (who made change),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Biện luận:**
- **Vì sao window <= 365 ngày?** SOC2/ISO27001 requires 1 year audit trail. Query 2 năm → DB scan chậm, memory spike. Code: `SearchAuditLogUseCase:37` — `MAX_WINDOW_DAYS = 365L`.
- **Vì sao half-open interval [from, to)?** Ngăn double-count khi query adjacent windows.
- **Trigger-based logging (DB level):** `V1__lms_complete_schema.sql:56-92` — `fn_audit_trigger()` AFTER INSERT/UPDATE/DELETE. App sets `SET app.current_user_id = 'uuid'` via PreparedStatement. PostgreSQL captures old/new state tự động (immutable audit trail).

---

### Flow 4 — Course Approval

**Sequence:**
```
Admin (POST /api/v3/admin/courses/:courseId/approve, reviewerId, comment)
  -> AdminCoursesControllerV3.approveCourse() [line 65, @PreAuthorize: ADMIN + ORG_ADMIN]
      -> ApproveCourseUseCase.execute() [line 31-63]
          -> CourseRepository.findById(courseId)
          -> course.approve(reviewerId, comment) [DDD domain method]
          -> course.setPendingReleaseNotes(null) [clear staging]
          -> CourseRepository.save(course) [persist state change]
          -> CoursePublicationPort.publish(courseId, reviewerId, releaseNotes) [async event]
          -> ReviewEventRepository.save({action: "APPROVED", comment, ...}) [audit]
          -> eventPublisher.publish(course.getDomainEvents()) [event streaming]
              -> CourseApprovedEvent [triggered notifications, update KPIs]
          -> CourseResponse.from(course) [DTO]
```

**Biện luận:**
- **Vì sao domain event?** UI + search index + notification service subscribe to `CourseApprovedEvent`. Without event: controller phải call 3 services → tight coupling.
- **Vì sao ReviewEventJpaEntity?** Separate audit trail for course approval — UI shows "Approved by Phạm Thị Minh Hồng on 2026-04-24".
- **ORG_ADMIN scope:** Code `AdminCoursesControllerV3:109-110` — `courseRepository.findReviewQueueByTeacherIds(getOrgTeacherIds(orgId), pageable)`.

---

### Flow 5 — User Account Status (Block/Restrict)

**Sequence:**
```
Admin (PATCH /api/v3/users/:userId, {status: "BLOCKED", reason: "Spam violation"})
  -> UserControllerV3.updateUser() [@PreAuthorize + business guard]
      -> UpdateUserUseCaseV3.updateUserAccountStatus(userId, status, reason)
          -> user.setAccountStatus(BLOCKED)
          -> user.setStatusReason("Spam violation")
          -> userRepository.save(user)
          -> eventPublisher.publish(UserBlockedEvent)
```

**Defense in depth — `isEnabled()` check ở 3 nơi:**
1. Login time: `AuthenticateUserUseCaseV2.execute()` [line 44-46]
2. Token refresh: `RefreshTokenUseCaseV2`
3. Request-time (JWT filter): `JwtAuthenticationFilter` [line 62-70]

---

### Flow 6 — Admin Settings Persistence

```
Admin (POST /api/v3/admin/settings, {tokenExpiryDays: 60})
  -> SystemSettingsComponent [FE, OnPush]
      -> AdminService.saveSystemSettings()
          -> ManageOrgPaymentConfigUseCase
              -> OrgPaymentConfigRepository.save() [PostgreSQL]
```

**Apply settings → token generation:**
```
User login -> computeRefreshExpiryMs(user) [line 71-82]
              -> if user.tokenExpiryDays != null -> use it
              -> else if org.tokenExpiryDays -> use org setting
              -> else -> use default 30 days
```

---

### Flow 7 — JWT Refresh Token Exchange

```
Client (POST /api/v3/auth/refresh, {refreshToken})
  -> AuthControllerV3.refreshToken()
      -> RefreshTokenUseCaseV2.execute()
          -> TokenService.extractEmail(refreshToken)
          -> UserRepository.findByEmail(email)
          -> if (!user.isEnabled()) -> throw UnauthorizedException
          -> if (!TokenService.isTokenValid(refreshToken, email)) -> throw ExpiredException
          -> TokenService.generateAccessToken(...)
          -> AuthResponse [new accessToken, reused refreshToken]
```

---

## 3. Quyết định kỹ thuật (10 cái)

### TD-01: JWT vs Session-based Authentication

**WHAT:** JWT (Bearer header), không server-side session store

**WHY:**
- Stateless → scale horizontally
- Mobile-friendly: Native app không có cookie jar
- Cross-domain: CORS request dễ
- Maritime context: Multi data center → JWT tự-validate, không session replication

**ALTERNATIVES:**
- Session cookie: Sticky session bắt buộc (LB phải route same server), không mobile-friendly. Rejected.

**EVIDENCE:**
- `JwtService.java:34-102`, `JwtAuthenticationFilter.java:54-88`, `SecurityConfig.java:65` — `sessionCreationPolicy(STATELESS)`

---

### TD-02: BCrypt vs Argon2

**WHAT:** BCrypt (Spring Security built-in)

**WHY:**
- Industry standard, Spring Security audited
- Adaptive cost factor
- SOC2 approved

**ALTERNATIVES:**
- Argon2: memory-hard (resistant to GPU attacks), nhưng overkill cho LMS, adds dependency. Rejected.

**EVIDENCE:**
- `PasswordConfig.java:14-16` — `new BCryptPasswordEncoder()`
- `AuthenticateUserUseCaseV2.java:49` — `passwordEncoder.matches(...)`

---

### TD-03: Clean Architecture + DDD

**WHAT:** 4-layer (domain → application → infrastructure → web), no JPA in domain

**WHY:**
- Testability: Domain pure POJO, test without Spring/DB
- Business clarity: use case 35 dòng, zero infrastructure noise
- Swappability: port-adapter — JWT → Paseto chỉ thay adapter

**ALTERNATIVES:**
- Anemic model (`@Entity` + service): logic scattered, hard to defend thesis. Rejected.

**EVIDENCE:**
- `User.java:10-100` — Domain model, no JPA
- `AuthenticateUserUseCaseV2.java:1-83` — pure use case
- `CleanArchitectureTest.java:30-40` — ArchUnit enforces "application never imports infrastructure"

---

### TD-04: 4-Tier Admin Hierarchy

**WHAT:** ADMIN | ORG_ADMIN | TEACHER | STUDENT

**WHY:**
- Multi-tenant: VIMARU + 10+ partner orgs → mỗi org cần ORG_ADMIN độc lập
- Mỗi org có curriculum, teacher pool riêng
- SOC2 Separation of Duty (SoD)

**ALTERNATIVES:**
- 2-tier (Admin + User): bottleneck, security risk. Rejected.
- ABAC (attribute-based): overkill cho 4 static roles. Rejected.

**EVIDENCE:**
- `Role.java:6-10`, `UserControllerV3.java:299-309`
- `MultiTierAdminSecurityTest.java:40-200` — 8+ tests for isolation

---

### TD-05: Angular Signals vs RxJS Observables

**WHAT:** signal() + computed() cho state, RxJS cho HTTP

**WHY:**
- Fine-grained reactivity, simpler API
- OnPush + signals auto-track dependencies
- Performance: dashboard 10 KPI cards → chỉ affected card re-render

**ALTERNATIVES:**
- Pure RxJS: subscription hell, async pipe boilerplate. Rejected.
- NgRx: overkill cho admin dashboard. Rejected.

**EVIDENCE:**
- `KpiCardComponent.ts:31-55`, `AdminService.ts:1-200`

---

### TD-06: OnPush Change Detection

**WHAT:** ChangeDetectionStrategy.OnPush + input() + computed()

**WHY:**
- Explicit data flow: parent → input → child recompute chỉ khi input đổi
- Admin dashboard 23 component, 100+ KPI card → render instant

**ALTERNATIVES:**
- Default (CheckAlways): O(n) check, slow on large dashboards. Rejected.

**EVIDENCE:**
- 15+ matches in `/fe/src/app/features/admin` cho `ChangeDetectionStrategy.OnPush`

---

### TD-07: Shared Admin Component Library

**WHAT:** Extract `kpi-card`, `action-card`, `bulk-action-bar`, `kebab-menu`, `date-range-toggle` vào `/shared/components/admin/`

**WHY:**
- One visual language (5 cách kpi cards trước đây → 1 chuẩn)
- Maintenance: bug fix 1 chỗ, all admin pages benefit
- Audit compliance: uniform UI

**EVIDENCE:**
- `kpi-card.component.ts:24-55`
- `docs/reports/2026-04-25-admin-portal-mega-audit.md` "CC-01 KPI Card Drift" → fix via shared lib

---

### TD-08: Flyway Database Versioning

**WHAT:** Flyway (V1 baseline + V2+ incremental), không Hibernate DDL

**WHY:**
- SQL control: DBA review trước deploy
- Reproducibility: fresh DB run V1...V118
- SOC2: schema versions tracked

**ALTERNATIVES:**
- `ddl-auto=update`: không control column order, không rollback. Rejected.

**EVIDENCE:**
- `V1__lms_complete_schema.sql:1-100`, `V64__organizations_and_invites.sql`, `V69__user_token_expiry_days.sql`

---

### TD-09: @PreAuthorize + Business Guards

**WHAT:** Spring `@PreAuthorize` cho coarse-grained, business logic cho fine-grained

**WHY:**
- @PreAuthorize: early exit nếu role missing
- Business guards: "ORG_ADMIN có thể tạo ADMIN?" — không expressible in annotation

**ALTERNATIVES:**
- All in @PreAuthorize SpEL: unreadable. Rejected.
- All in code: forget endpoint → bypass. Rejected.

**EVIDENCE:**
- `UserControllerV3.java:288-309`, `AdminCoursesControllerV3.java:65,102,119`

---

### TD-10: Tailwind CSS + SCSS

**WHAT:** Tailwind utility + SCSS variables cho theme

**WHY:**
- Consistency: spacing scale enforced
- Responsive: `@apply` + `@media`
- Build-time purge: small CSS

**ALTERNATIVES:**
- Bootstrap: everyone's site looks same. Rejected.
- CSS-in-JS: JavaScript overhead. Rejected.

---

## 4. Đặc thù MARITIME

Phân hệ này **KHÔNG có đặc thù maritime trực tiếp** — đây là cross-cutting infrastructure module. Đặc thù maritime nằm ở:
- Phân hệ 2 (Course Authoring): STCW status workflow
- Phân hệ 3 (Assessment): STCW certifications, math LaTeX
- Phân hệ 4 (Offline/PWA): trọng tâm — học viên trên tàu

**Tuy nhiên** phân hệ admin CÓ thiết kế cho maritime:
- ORG_ADMIN role: mỗi tổ chức hàng hải có quản lý riêng
- Multi-tenant scoping: course/user/audit log filter by organizationId
- Audit trail SOC2: maritime regulated industry, IMO/STCW yêu cầu tracking

---

## 5. Số liệu cụ thể

| Metric | Con số |
|---|---|
| Backend identity files | 91 (22 test, 69 source) |
| Backend identity LOC | ~7,400 |
| Frontend admin components | 48 |
| Frontend admin LOC | ~30,460 |
| Admin endpoints | 15+ |
| Test files (identity) | 22 |
| Test coverage (identity) | ~85% |
| Migration liên quan | V1, V64, V69, V106, V116, V118 |
| Security filters | 2 |
| Audit table | 1 (audit_log JSONB + trigger trên 8+ bảng) |
| Admin portal routes | 23 children |
| Shared admin components | 5 |
| Role hierarchy | 4 tier |

---

## 6. Q&A Defense (10 câu)

### Q1: Vì sao Spring Boot 3.2.6 + Java 21 thay vì Node.js/Python?

**A:** Type safety (sealed classes, generics → compiler catch errors). Virtual threads (Project Loom) cho phép 10k+ concurrent requests trong thread pool nhỏ. Spring Security maturity (built-in RBAC, method-level, auditing). PostgreSQL 16 hỗ trợ tốt. Node.js single-threaded callback hell. Python GIL. Java 21 + Spring = best fit.
**Evidence:** `pom.xml` — `<java.version>21</java.version>`, `<spring-boot.version>3.2.6</spring-boot.version>`

---

### Q2: Làm sao đảm bảo ORG_ADMIN không leo quyền thành ADMIN?

**A:** 3 lớp guard:
1. Application layer: `validateUserProvisioningRequest()` — `isOrgAdmin && isAdminRole(target)` → 403
2. Test: `MultiTierAdminSecurityTest.java:134-147` chuyên test case này
3. Multi-tenant scoping: ORG_ADMIN query filter by `organizationId`
**Evidence:** `UserControllerV3.java:299-309`, `MultiTierAdminSecurityTest.java:86-186`

---

### Q3: Audit log record gì? Truy vấn hiệu quả?

**A:** Records: table_name, action (INSERT/UPDATE/DELETE), old_data + new_data (JSONB), changed_by (UUID), created_at. Window validate ≤ 365 ngày (SOC2). Index partial trên `(table_name, created_at DESC)`. Pagination default 10/page.
**Evidence:** `SearchAuditLogUseCase.java:80-97`, `V1__lms_complete_schema.sql:56-92`

---

### Q4: JWT vs session — token bị steal sao?

**A:** Mitigation:
1. HTTPS only
2. Secure + HttpOnly cookie (XSS safe)
3. Refresh token rotation (optional)
4. RateLimitingFilter chống brute-force
5. `user.isEnabled()` check ở 3 nơi (login + refresh + JWT filter)
**Evidence:** `JwtAuthenticationFilter.java:59-88`

---

### Q5: 10k user concurrent login xử lý sao?

**A:**
1. Stateless JWT → scale horizontal
2. PostgreSQL connection pool (HikariCP)
3. Cache Redis (future, đã design via UserRepository port)
4. Java 21 virtual threads
**Bottleneck:** DB I/O (10k row lookups/s OK với SSD)

---

### Q6: Rate limiting? CSRF?

**A:** Rate limiting: CÓ — `RateLimitingFilter.java`. CSRF: KHÔNG cần vì JWT in Authorization header (không auto-send). `SecurityConfig.java:48` — `csrf().disable()` + comment "API uses JWT, not cookie".

---

### Q7: 2FA?

**A:** Email verification CÓ (`SendVerificationEmailUseCase`). Google OAuth2 CÓ (`AuthenticateWithGoogleUseCase` — dùng Google 2FA nếu user set up). Password reset có token-based.
**Evidence:** `/identity/application/usecase/*EmailUseCase.java`

---

### Q8: Maritime: offline mode admin?

**A:** Admin dashboard NOT designed for offline. Real-time analytics, approve khóa học collab, audit log fresh. Tuy nhiên có `/admin/offline-storage` page (systemAdminGuard) — monitor student download + sync error.
**Evidence:** `admin.routes.ts:152-156`

---

### Q9: Permissions vs Roles — sao không fine-grained?

**A:** VIMARU đơn giản: 4 role với fixed quyền. Permission system thêm phức tạp (3 bảng join), audit khó. Tương lai có thể thêm `permissions` + `role_permissions` junction.
**Evidence:** `Role.java:6-10` (static enum)

---

### Q10: Monitoring/alerting cho admin activities?

**A:** Partial:
- Audit log: CÓ
- Dashboard: real-time analytics
- Prometheus/Grafana: chưa (out of scope)
- Alert email: cho UserBlockedEvent
- Tương lai: alert IP mới, bulk import lớn, "ORG_ADMIN tried create ADMIN"
**Evidence:** `ApproveCourseUseCase.java:57-58` — eventPublisher (extensible)

---

# Kết luận phân hệ 1

Foundation cho multi-tenant LMS maritime. Clean Architecture + DDD 4-layer. RBAC 4-tier giải quyết multi-tenant (VIMARU + 10+ orgs). Security in depth (JWT + BCrypt + filter + @PreAuthorize + business guards). Audit trail SOC2-compliant. Course approval event-driven. Stack: Angular 20.3 signals + Java 21 virtual threads + PostgreSQL 16 JSONB. 85% test coverage.
