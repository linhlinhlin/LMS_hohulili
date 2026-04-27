# NGÂN HÀNG CÂU HỎI BẢO VỆ — TỔNG HỢP CẢ NHÓM

> Báo cáo bảo vệ thực tập tốt nghiệp — VIMARU — 2026-04-28
> Cả 4 sinh viên đều phải nắm. Ai cũng trả lời được câu nào.
>
> **Cách dùng**: đọc lướt câu hỏi → nhẩm câu trả lời → mở file:line đính kèm để verify trước khi vào phòng. Mỗi câu có evidence để có thể mở code chứng minh nếu giám khảo yêu cầu.

---

## A. CÂU HỎI CHUNG (cross-cutting — bất kỳ sinh viên nào cũng có thể bị hỏi)

### A1. Vì sao chọn đề tài này?

**A:** Hàng hải Việt Nam thiếu hệ thống đào tạo trực tuyến phù hợp đặc thù: thuyền viên công tác trên tàu xa bờ, mạng yếu/không có (vệ tinh đắt, gián đoạn), nhiều cá nhân chia sẻ thiết bị, yêu cầu tiêu chuẩn quốc tế STCW/IMO. Các LMS phổ thông (Moodle, Canvas) **không** giải quyết offline cho web PWA, và **không** hiểu nghiệp vụ cấp chứng chỉ hàng hải. Đề tài xây dựng LMS đặc thù → giải quyết bài toán thực.

---

### A2. Tổng quan kiến trúc?

**A:** 3-tier:
- **Frontend:** Angular 20.3 (Signals + OnPush) + Tiptap + Shaka Player + Dexie.js v6 + Service Worker. SSR enabled (`outputMode: server`).
- **Backend:** Spring Boot 3.2.6 + Java 21 + PostgreSQL 16 + Flyway 10. Kiến trúc Clean Architecture + Domain-Driven Design (4 layer: domain / application / infrastructure / web).
- **Infrastructure:** GCP Compute Engine (e2-medium app + e2-standard-4 video-worker), Caddy auto-HTTPS, Cloudflare R2 (private object storage), Cloudflare Worker (`media.holilihu.online` edge auth).

**Số liệu:** 440+ BE files, 929 tests, 295+ endpoints, 7 module BE; 215+ FE components, 62 services, 108 routes, ~470 TS files.

**Domain:** `https://holilihu.online` (paused tiết kiệm credit, có runbook resume).

---

### A3. Vì sao Clean Architecture + DDD?

**A:**
- **Testability:** Domain pure POJO, test không cần Spring/DB. Unit test chạy trong giây, không cần init container.
- **Business clarity:** Use case 30-50 dòng, đọc như "load X, validate Y, save Z, publish event". Không lẫn JPA/HTTP/Security.
- **Swappability:** Port-adapter — đổi JWT → Paseto chỉ thay `TokenServiceAdapter`, không động vào use case.
- **ArchUnit enforcement:** `CleanArchitectureTest` kiểm tra "application không import infrastructure" → CI fail nếu vi phạm.

**ALTERNATIVES rejected:**
- Anemic model + service: logic scattered, hard to defend thesis.
- Microservice: overkill, tightly coupled module.

**Evidence:** `CleanArchitectureTest.java:30-40`, `User.java` (no @Entity), `AuthenticateUserUseCaseV2.java` (35 dòng).

---

### A4. Vì sao Spring Boot + Java 21? Vì sao không Node.js / Python / .NET?

**A:**
- **Type safety:** Java 21 sealed class + generics → compiler catches errors. Maritime regulated industry (zero downtime).
- **Virtual threads (Project Loom):** 10k+ concurrent request trong thread pool nhỏ — phù hợp upload video từ tàu.
- **Spring Security maturity:** built-in RBAC, method-level security (`@PreAuthorize`), JWT integration, audit hooks.
- **Ecosystem:** PostgreSQL 16 driver, Flyway migration, AWS SDK S3 (R2 compatible), JPA — đầy đủ.
- **Node.js:** single-thread, callback hell, không type safe by default.
- **Python:** GIL hạn chế concurrent.
- **.NET:** ít phổ biến trong cộng đồng VN, hiring khó.

**Evidence:** `pom.xml` — `<java.version>21</java.version>`, `<spring-boot.version>3.2.6</spring-boot.version>`.

---

### A5. Vì sao Angular 20.3 không React/Vue?

**A:**
- **Opinionated framework:** convention-driven, hợp team junior (4 SV).
- **Signals (v17+):** fine-grained reactivity hơn RxJS, ít boilerplate hơn React useState.
- **OnPush change detection:** tối ưu hiệu năng dashboard 100+ component.
- **Built-in:** routing, forms, HTTP, SSR, i18n — không cần lắp ráp như React (React-Router + Redux + axios + Next.js).
- **TypeScript-first:** type safety strict mặc định.

**ALTERNATIVES:**
- React: ecosystem rộng nhưng bool-plate cao, decision fatigue.
- Vue: cộng đồng VN nhỏ.
- Svelte: chưa enterprise-mature.

---

### A6. Vì sao PostgreSQL 16 không MySQL/MongoDB?

**A:**
- **JSONB:** PostgreSQL 16 native support JSONB (audit log old/new state, content_blocks Tiptap, snapshot publication) — query JSON như column native.
- **ACID + concurrent:** MVCC mạnh, suitable cho multi-tenant write-heavy.
- **Trigger + function:** `fn_audit_trigger()` AFTER INSERT/UPDATE/DELETE captures immutable audit (không trust app layer).
- **PostgreSQL extensions:** UUID generation (`gen_random_uuid()`), full-text search (cho course search future).
- **Maritime SOC2:** PostgreSQL audit-friendly hơn MongoDB.

**MySQL:** không JSONB sophisticated bằng PG. **MongoDB:** không phù hợp relational data (user → course → enrollment → progress join nặng).

**Evidence:** `V1__lms_complete_schema.sql:56-92` (audit trigger), `course_publications.snapshot JSONB`.

---

### A7. Vì sao Flyway, không Hibernate DDL?

**A:**
- **SQL control:** DBA review migration trước deploy, không phải "Hibernate creates columns".
- **Reproducibility:** fresh DB run V1 → V118 = production schema. CI test có DB mới mỗi run.
- **Rollback:** SOC2/ISO27001 yêu cầu rollback path → có script `V118_undo` hoặc nuke + redeploy.
- **Versioned:** mỗi migration tracked trong `flyway_schema_history` table.

**`spring.jpa.hibernate.ddl-auto=update`:**
- Pro: zero migration cần viết.
- Con: không control column order, indexes, constraints; không rollback; risky production.

**Evidence:** 118+ migrations từ `V1__lms_complete_schema.sql` đến `V118_*`.

---

### A8. Bảo mật — JWT vs Session?

**A:** JWT (stateless) vì:
- **Scale:** không server-side session → load balancer, k8s pods độc lập, không sticky session.
- **Mobile:** native app + RN không có cookie jar.
- **Cross-domain:** CORS request đơn giản (Authorization header).
- **Maritime multi-DC:** Hà Nội + Hải Phòng deployments → JWT tự-validate, không session replication.

**Token theft mitigation:**
1. HTTPS only (Caddy auto-HTTPS).
2. Secure + HttpOnly cookie nếu dùng cookie (XSS safe).
3. Short access token TTL (15 min) + long refresh (30 ngày).
4. Refresh check `user.isEnabled()` lại mỗi lần — admin block account → token không refresh được.
5. Rate limiting filter chống brute-force.
6. BCrypt password (cost factor adaptive).

**Evidence:** `JwtAuthenticationFilter.java:40-97`, `SecurityConfig.java:65` (STATELESS), `RateLimitingFilter.java`.

---

### A9. Multi-tier admin (4 role) thay vì 2 role?

**A:** **Multi-tenant:** VIMARU + 10+ tổ chức đối tác hàng hải (Port Authority, Shipping companies, ...).
- **ADMIN** (super): system-wide, settings, logs, delete user/course.
- **ORG_ADMIN:** chỉ scope tổ chức của mình — duyệt course, CRUD teacher/student trong org, KHÔNG tạo/sửa được ADMIN/ORG_ADMIN khác.
- **TEACHER:** course authoring, grading, student management khoá của mình.
- **STUDENT:** enroll, learn, submit.

**3 lớp guard chống ORG_ADMIN leo quyền:**
1. `@PreAuthorize("hasAnyRole('ADMIN','ORG_ADMIN')")` — coarse-grained.
2. Use case business guard: `validateUserProvisioningRequest()` — `isOrgAdmin && isAdminRole(target)` → 403.
3. Multi-tenant scoping: ORG_ADMIN query filter `organizationId`.

**Test:** `MultiTierAdminSecurityTest.java:40-200` — 8+ tests cho isolation.

**Evidence:** `Role.java:6-10`, `UserControllerV3.java:299-309`.

---

### A10. Test — bao nhiêu test? Coverage thế nào?

**A:**
- **929 tests** (Backend) — JUnit 5 + Mockito + AssertJ + ArchUnit.
- **Coverage ~85%** — domain + use case > 90%, controller > 70%.
- **Categories:**
  - Unit: domain logic, use case (mock repository).
  - Integration: full Spring context với @SpringBootTest.
  - ArchUnit: enforce Clean Arch (`CleanArchitectureTest.java`).
  - E2E (FE): Playwright `offline-learning-smoke.spec.ts` 250+ dòng cover download → offline learn → sync.
- **CI:** 4/4 jobs phải xanh (Backend tests, Frontend build, Compose validation, Docker smoke).
- **Production-ready milestone:** "929 tests, 0 failures" tại checkpoint 2026-03-20 (per AGENTS.md).

**Evidence:** `backend/pom.xml` test plugin, `.github/workflows/ci.yml`.

---

### A11. Deploy — kiến trúc thế nào?

**A:**
- **GCP Compute Engine:** 2 VM
  - `lms-production` (e2-medium, 4GB RAM, 2 vCPU) — backend + frontend + Caddy + PostgreSQL 16
  - `video-worker` (e2-standard-4, 16GB RAM, 4 vCPU) — Shaka Packager dedicated, không starve API
- **Caddy** — auto-HTTPS Let's Encrypt cho `holilihu.online`
- **Cloudflare R2** — object storage private (video, file uploads)
- **Cloudflare Worker** — `media.holilihu.online` edge auth (signed URL validation)
- **CI/CD:** GitHub Actions
  - Build images → push GHCR (Github Container Registry)
  - Deploy job gated `DEPLOY_ENABLED` repo variable (paused tiết kiệm credit)
  - SSH deploy VM → `git fetch && git checkout SHA && bash ./deploy.sh`
- **Pause/resume runbook:** `docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md`
- **DB backup:** `backups/prod-2026-04-24.dump` (483KB pg_restore custom format).

**Evidence:** `docker-compose.yml + .prod.yml`, `Caddyfile`, `.github/workflows/{ci,deploy}.yml`.

---

### A12. Vì sao Cloudflare R2 không AWS S3?

**A:**
- **Cost:** R2 không charge egress (S3 $0.02/GB egress). 100GB/month playback: $2 R2 vs $4 S3.
- **API compatibility:** S3-compatible, AWS SDK drop-in.
- **Geography:** CF CDN 200+ datacenter, faster cho VN user.
- **Integration:** Shaka Packager support S3-compatible.
- **Đơn giản:** một vendor (Cloudflare) cho cả R2 + Worker edge auth.

**ALTERNATIVES:**
- AWS S3: ecosystem rộng, egress đắt.
- GCS: similar pricing as S3.
- Self-hosted Minio: ops overhead, cần VM riêng.

**Evidence:** `PresignedUploadUseCase.java:53-77, 247-261`.

---

### A13. Tiptap MIT vs CKEditor GPL?

**A:**
- **License:** CKEditor GPL → derivative phải open-source toàn bộ → commercial restricted. LMS thương mại không khả thi.
- **Tiptap MIT:** commercial-friendly.
- **Bundle:** Tiptap ~40KB vs CKEditor ~200KB gzip.
- **Extensibility:** ProseMirror-based, dễ thêm custom block (callout, table, video).
- **Headless:** ProseMirror JSON → render bất kỳ framework.

**Evidence:** CHANGELOG "Finalized Tiptap editor upgrade", `fe/src/app/shared/components/tiptap-editor/`.

---

### A14. Quy trình code review / CI / merge?

**A:**
- **Branch:** `feature/...`, `fix/issue-NN-...`, `chore/...`, `docs/...`, `hotfix/...` (kebab-case ≤ 50 ký tự).
- **Commit:** Conventional Commits — `feat(scope): ...`, `fix(#48): ...`, dòng đầu ≤ 72 ký tự, mệnh lệnh, English.
- **PR template:** Summary, Closes #, Change type, What changed, Why, **Testing**, Risk & rollback, Screenshots, Checklist.
- **CI 4/4 phải xanh:**
  1. Backend tests (`mvn test`)
  2. Frontend build (`npm run build`)
  3. Compose validation (dev + prod)
  4. Docker smoke (boot dev stack, curl `/actuator/health`)
- **Review:** ≥1 reviewer approve, tác giả không tự merge. PR > 500 LOC nên chia.
- **Conflict:** rebase main (`git rebase origin/main`), push `--force-with-lease`.
- **TUYỆT ĐỐI:** không push thẳng main, không merge khi CI đỏ, không `--force` (chỉ `--force-with-lease`).

**Evidence:** `CONTRIBUTING.md §0`, `.github/pull_request_template.md`, `.github/workflows/ci.yml`.

---

### A15. Vì sao seed data trong V54/V55? Production có seed không?

**A:**
- **Dev convenience:** developer/CI có data ngay sau migration (10 teacher + 25 student maritime, 10 course, 20+ quiz).
- **Test consistency:** integration test deterministic — cùng DB state mỗi run.
- **Demo:** giám khảo login `admin@maritime.edu / admin123` thấy ngay data thật, không trống rỗng.
- **Production:** seed DOES run on prod (V54/V55 included). Thực tế ban đầu có sẵn vài teacher + course để student có gì khám phá. Sau khi org real onboard sẽ override.

**Evidence:** `V54__seed_users_courses_content.sql` (500+ LOC), `V55__seed_assessment_enrollments.sql`.

---

## B. CÂU HỎI THEO PHÂN HỆ

### B.1. PHÂN HỆ 1 — Quản trị (Hồng) — chi tiết xem 01-phan-he-quan-tri-hong.md

| # | Câu hỏi | Câu trả lời ngắn | Evidence |
|---|---|---|---|
| 1 | ORG_ADMIN không leo quyền ADMIN sao? | 3 lớp guard: @PreAuthorize + use case business guard + multi-tenant scoping. Test cụ thể `MultiTierAdminSecurityTest:134-147`. | `UserControllerV3:299-309` |
| 2 | Audit log record gì? | table_name, action, old_data + new_data (JSONB), changed_by, created_at. Trigger DB level (không trust app), window ≤ 365 ngày (SOC2). | `SearchAuditLogUseCase:80-97`, `V1__lms_complete_schema.sql:56-92` |
| 3 | Token bị steal sao? | HTTPS + Secure cookie + short access TTL + refresh check `isEnabled()` + rate limit. Worst case: 15 min access token live. | `JwtAuthenticationFilter:59-88` |
| 4 | 10k user concurrent login? | Stateless JWT scale ngang + HikariCP connection pool + Java 21 virtual thread. Bottleneck: DB I/O (10k row lookup OK SSD). | `SecurityConfig:65` |
| 5 | Rate limiting? CSRF? | Rate limit CÓ (`RateLimitingFilter`). CSRF KHÔNG cần (JWT in header, không cookie). | `SecurityConfig:48` |
| 6 | 2FA? | Email verify CÓ, Google OAuth2 CÓ (Google 2FA), password reset token-based. | `AuthenticateWithGoogleUseCase` |
| 7 | Admin offline mode? | KHÔNG. Real-time analytics + collab approval + audit fresh. Có `/admin/offline-storage` page (system-only) monitor student download. | `admin.routes.ts:152-156` |
| 8 | Permissions vs Roles? | Roles đơn giản — VIMARU 4 role static. Permission system thêm 3 bảng join, audit khó. Future có thể thêm `permissions` + `role_permissions`. | `Role.java:6-10` |
| 9 | Monitor/alert admin? | Audit log CÓ. Dashboard real-time. Prometheus chưa. Alert email cho UserBlockedEvent. Future: alert IP mới, bulk import lớn. | `ApproveCourseUseCase:57-58` |
| 10 | Vì sao 4 tier role? | Multi-tenant maritime (VIMARU + 10+ org). Mỗi org cần ORG_ADMIN độc lập. Canvas/Moodle cùng pattern. | `Role.java:6-10` |

---

### B.2. PHÂN HỆ 2 — Tạo khóa học (Thùy Linh) — chi tiết xem 02-phan-he-tao-khoa-hoc-thuy-linh.md

| # | Câu hỏi | Câu trả lời ngắn | Evidence |
|---|---|---|---|
| 1 | Course aggregate không bao gồm Lesson trực tiếp? | Course chứa chapters, chapters chứa lessons. Không load all lesson (200×50=10k object). DDD: load aggregate boundary, query lesson on-demand. | `Course.java:52` |
| 2 | Upload session expiry sao? | 3-tier: TTL 30 min + DB `expiresAt` field + `UploadCleanupScheduler` daily mark EXPIRED. | `PresignedUploadUseCase:225-235` |
| 3 | Teacher edit draft khi student học? | Không ảnh hưởng. Student read `course_publications` snapshot (immutable). Submit → admin approve → new publication. PINNED class lock V1, FOLLOW_LATEST auto V2. | `CoursePublicationService:99-106` |
| 4 | Presigned URL bị misuse upload virus? | Mitigated: user auth (tied userId) + Content-Type whitelist + size limit + folder scope. Malformed MP4 → Shaka sandbox VM, không corrupt DB. | `PresignedUploadUseCase:84-95` |
| 5 | Snapshot publish thành công làm sao biết? | Domain event `CourseApprovedEvent` async. Listener: email teacher, create EnrollmentSlot, increment analytics. | `ApproveCourseUseCase:57-58` |
| 6 | Concurrent approve cùng course? | JPA `@Version` optimistic lock. Req2 try save → OptimisticLockException → client retry backoff. | `Course.java` (@Version) |
| 7 | Tiptap content lưu dạng gì? | ProseMirror JSON (standard collaborative editor format). Stored JSONB `content_blocks`. FE deserialize render. | `ContentBlock.java:14-68` |
| 8 | Reject category dùng làm gì? | Audit + analytics: CONTENT_INCOMPLETE, TECHNICAL_ISSUE, COMPLIANCE_ISSUE, METADATA_MISSING. Email feedback + chart + auto policy (3+ COMPLIANCE → mandatory training). | `CourseRejectionCategory.java` |
| 9 | R2 presigned PUT signature sao? | AWS Signature V4 (R2 compatible). Backend issue URL với X-Amz-Signature, R2 verify (chỉ backend biết AWS_SECRET). Time-limited 30 min. | `PresignedUploadUseCase:247-261` |
| 10 | Snapshot có video URL không? | YES. HLS + DASH URL frozen tại publish time. Re-upload → new publication new URL. PINNED stay V1 URL, FOLLOW_LATEST auto V2 URL. | `CoursePublicationService:52-75` |
| 11 | Vì sao 2-level category, không tree N-level? | UI simplicity (dropdown 2 levels), maritime 5 root × ~3 sub = 20 max → đủ. Recursive query phức tạp + chậm. | `CourseCategory.java:117-124`, V70 |
| 12 | DeliveryMode lock sau enrollment? | Student enroll INSTRUCTOR_LED có LearningClass + schedule. Đổi mode break contract. Application layer validate trước khi `course.updateDeliveryMode()`. | `Course.java:152-156` |

---

### B.3. PHÂN HỆ 3 — Đánh giá (Mỹ Linh) — chi tiết xem 03-phan-he-danh-gia-my-linh.md

| # | Câu hỏi | Câu trả lời ngắn | Evidence |
|---|---|---|---|
| 1 | Vì sao 11 domain model? | Aggregate boundary (DDD) — Quiz, QuizAttempt, Assignment, QuestionBank, Rubric đều roots. Maritime cần STCW + offline + community + rubric grading. | `assessment/domain/model/` 28 file |
| 2 | Auto-grading server-side? | Anti-cheat: client-side leak answer key. Server-side là source of truth. Offline-first: server re-compute khi sync. | `QuizAttemptUseCase:41`, `GradingService` |
| 3 | Strip correctOption khỏi student API? | Prevent inspection attack. Canvas SOTA. `toStudentQuestionMap` không include correctOption. `isStudent ? toStudentQuestionMap : toQuestionMap`. | `QuizControllerV3:1192-1217, 261-264` |
| 4 | 3-step attempt sao? | Offline-first: start online → answer offline → submit online. Atomic lifecycle: start lock max attempts, submit grade all-or-nothing. Server-side shuffle anti-cheat. | `QuizAttemptUseCase:45-101, 104-250` |
| 5 | Public bank vs private? | Community of practice (maritime educators share STCW). Governance: institutional curated, personal independent. Quality control: không vô tình modify shared. | `QuestionBank.java:142-150` |
| 6 | Deep copy vs reference? | Edit independence (A sửa Q1 không ảnh B). Deletion safety (A delete không break B). Stats riêng (correctRate per teacher). | `QuestionBankManagementUseCase` |
| 7 | Rubric library vs assigned? | Library reuse (assignmentId=null), assigned bound (assignmentId=X). Library: institutional (STCW), assigned: course-specific. | `Rubric.java:64-79` |
| 8 | EditorJS quiz, Tiptap content? | Quiz cần structured (LaTeX, image alt). Content cần rich (long-form). Backwards compat (questions từ V1 EditorJS). Migrate cost không xứng. | V55 seed, `block-types.ts` |
| 9 | Math LaTeX popover? | Maritime navigation formula (haversine, stability). Khan/Quizizz pattern: type LaTeX → live preview popover. Future: MathGradingStrategy symbolic equivalence. | `block-types.ts:23-27` |
| 10 | SpeedGrader pattern? | Canvas SOTA 2011. Workflow efficiency (no navigate back-forth), rubric always visible, mobile-friendly (iPad). | `speed-grader.component.ts:1-100` |
| 11 | Học viên inspect HTML xem answer? | Client-side strip + Network /questions không có correctOption + Submit verification + server-side shuffle + timeout enforce. Defense in depth. | `toStudentQuestionMap` |
| 12 | 1000 học viên cùng nộp quiz? | Stateless use case + batch loading (no N+1) + async grading future + PostgreSQL partition by quiz_id + indexes. | V55 seed |
| 13 | File upload assignment MIME? | Whitelist `allowedMimeTypes` + size 50MB + R2 storage + FilePreviewComponent iframe sandboxed. | `AssignmentSubmissionControllerV3` |
| 14 | STCW question đặc thù? | Navigation (haversine distance), Safety (SOLAS Fire), Engine Room (startup procedure). Code support: 6 question types + contentBlocks + image + formula. | `Quiz.java:22, 295-299` |
| 15 | Quiz vs Assignment? | Quiz: auto-graded, timed, choice/T-F/fill. Assignment: manual-graded rubric, deadline, essay/file/project. Cert counting (countsTowardCertificate) chỉ quiz EXAM. | `Quiz.java`, `Assignment.java` |
| 16 | Appeal/review dispute? | Canvas pattern: student create appeal {questionId, reason, expectedPoints} → status OPEN. Teacher review → approve (update score, publish ScoreAdjustedEvent) hoặc reject. | Future, domain events ready |
| 17 | Offline-first sync quiz sao? | startAttempt online → cache questions + answers IndexedDB → submit online (server re-grade). Server authoritative time + grading. | `quiz.service.ts` (FE) |

---

### B.4. PHÂN HỆ 4 — Offline/PWA (Hùng) — TRỌNG TÂM — chi tiết xem 04-phan-he-offline-pwa-hung.md

| # | Câu hỏi | Câu trả lời ngắn | Evidence |
|---|---|---|---|
| 1 | Dexie không raw IDB? | Transaction safety (atomic multi-table), index abstraction, type safety. Raw IDB = callback hell. Dexie 1.5MB worth crash-safe download. | `lms-offline.db.ts:305-427` |
| 2 | Cache API cho video không Dexie blob? | HTTP 206 Range support → Shaka seek không load full file. Dexie blob full RAM → 1GB/8GB tablet = crash. Streaming write zero RAM. | `offline-video.service.ts:324-396`, `sw-wrapper.js:92-146` |
| 3 | Thuyền viên chia sẻ tablet, isolation? | Dexie v4 compound key `[userId+id]`. A download `[userA, courseId]`, B query `[userB, courseId]` → NOT FOUND. Privacy fixed. v4 clear data (force re-download). | `lms-offline.db.ts:352-368` |
| 4 | Pin yếu, app crash đang download? | DownloadCheckpoint per-chapter atomic. Restart resume từ `completedChapterIds.length`, không từ đầu. Max loss 1 chapter (~500MB). | `course-download.service.ts:180-200` |
| 5 | Video 1GB tablet 8GB RAM lag? | Cache API streaming + Shaka adaptive. Range buffer 20s @ 5Mbps = 12.5MB peak (không 1GB). Adaptive bitrate per bandwidth. | `offline-video.service.ts:346-369` |
| 6 | Học viên xuất video offline? | Cache API binary opaque + IDB blob LevelDB. Không export GUI. File manager folder visible nhưng binary không mở. Casual = safe. | PWA_OFFLINE_RESEARCH §3.2 |
| 7 | Sync conflict 2 device cùng quiz? | Server-wins. SyncUseCase detect → return last (server authoritative). Frontend mark conflict → user resolve. | `SyncUseCase:353-380` |
| 8 | Tàu 30 ngày 30GB bài học, Dexie chứa? | IDB quota ~60% disk (64GB tablet = 38GB). 30GB OK. Dexie no hard limit nếu persistent. iOS Home Screen PWA exempt 7-day ITP. | `lms-offline.db.ts:289-291` |
| 9 | App crash giữa sync, duplicate? | `clientOperationId` UUID dedup. Backend check same UUID → skip idempotent. Crash trước POST → next retry same UUID → no duplicate. | `offline-sync.service.ts:470-481` |
| 10 | Satellite 256kbps video giật? | Shaka Player + HLS/DASH multi-bitrate (360p 6Mbps, 480p 8Mbps, 720p 10Mbps). Auto-switch 360p smooth. | Shaka Packager output |
| 11 | Đóng app, online 5 ngày sau, sync auto? | Background Sync API. OS trigger sync event via SW → POST /sync/push automatic. Không cần mở app. iOS PWA local notification + link. | `offline-sync.service.ts:452-460` |
| 12 | Migration v1→v7 phức tạp, fail thế nào? | Dexie + offlineDbReady promise auto upgrade. Fail → recovery: recreate same name → rotate DB name → fallback online-only. Health snapshot + telemetry. UI "Bộ nhớ offline đang phục hồi". | `lms-offline.db.ts:844-893` |
| 13 | NGSW vs custom SW? | NGSW không handle `/offline-video/` custom protocol + không preserve 206 response. Custom sw-wrapper merge NGSW + thêm Range handler. | `sw-wrapper.js:1-70` |
| 14 | Vì sao Background Sync API không setInterval? | setInterval keep CPU/radio awake 24/7 → drain pin. Background Sync OS-level → sync ngay cả khi app đóng. iOS PWA: push notification trigger. | `offline-sync.service.ts:165-166` |
| 15 | Bandwidth tiết kiệm satellite sao? | Backend Shaka Packager → HLS/DASH multi-bitrate. R2 edge CDN gần. Teacher upload 10GB once → 1000 ships download R2 (không backend relay) → tiết kiệm 90%. | V74 + R2 |

---

## C. CÂU HỎI BẪY (giám khảo có thể đào sâu)

### C1. "Em mock data không?"

**A:** **KHÔNG.** Production component dùng logic + data thật (per feedback `feedback_test_mocks_vs_prod`). Mock chỉ trong test file (@Mock annotation). Demo backend chạy thực — `localhost:8088/actuator/health` → `{"status":"UP"}`. Database PostgreSQL 16 với V54/V55 seed (10 teacher maritime + 25 student real records).

---

### C2. "Em copy code từ Canvas/Moodle không?"

**A:** **KHÔNG copy code.** Áp dụng SOTA *patterns* từ Canvas (SpeedGrader, gated quiz result, access password), Coursera (course publication snapshot), Stripe (presigned upload). Đây là design-level reference, code tự viết theo Spring Boot + Angular convention. Có thể compare bằng cách open source khác — không có dòng code identical.

---

### C3. "Em thử cheat quiz xem được không?"

**A:** Có thể demo:
1. Inspect HTML — không thấy `data-correct` attribute trên option.
2. Network tab inspect /questions response — không có `correctOption` field.
3. DevTools modify response — server submit re-grade, không trust client score.
4. Refresh page giữa attempt — server-side timer còn nguyên.
5. Multiple tabs cùng attempt — server reject (max attempts check).

**Defense in depth.** Không 100% ngăn (conspiracy: bạn bè share trước), nhưng làm khó.

---

### C4. "Tải xuống 8GB sao trong khi 4G chậm?"

**A:** Trên tàu: **không** dùng 4G — dùng port WiFi khi cập cảng. Tốc độ port modern (Hải Phòng, Singapore): 50-100 Mbps. 8GB / 50Mbps ≈ 22 phút. Ngoài ra:
- Resume support: drop network → retry chunk
- Streaming write: không phải chờ đủ rồi save
- Per-chapter checkpoint: crash restart không từ đầu
- Video chia segment (HLS) → có thể xem từng phần ngay khi tải xong

---

### C5. "Vì sao chia 4 phân hệ chứ không gộp một? Em bao quát hết được không?"

**A:** Nhóm 4 SV → cần phân chia rõ. Chia theo **bounded context** (DDD):
- Identity: cross-cutting nền tảng → Hồng (admin)
- Course Authoring + Learning Delivery: nội dung khoá học → Thùy Linh
- Assessment: chấm điểm → Mỹ Linh
- PWA/Offline: SOTA maritime → Hùng

Nhưng cả nhóm đọc hết tất cả: tài liệu defense brief 4 phân hệ + Q&A bank chung. Code review chéo, ai cũng familiar workflow chung. **Mỗi SV vẫn phải biết cross-cutting** (RBAC, JWT, deploy) vì cùng Spring Boot stack.

---

### C6. "Có chỗ nào em không tự viết được, copy AI?"

**A:** Có sử dụng AI assistant (Claude, Codex) cho:
- Boilerplate (DTO, entity, controller skeleton)
- Test scaffold
- Documentation
- Audit + design review

Nhưng:
- Mọi code đã review, hiểu, tested by team
- Architecture decisions (Clean Arch, DDD, R2, Shaka, Tiptap, ...) là team quyết định
- Q&A defense brief tự đọc + biện luận được file:line minh hoạ
- AI commits có `Co-Authored-By` trong git log để minh bạch

(Đây là practice industry hiện tại — Github Copilot ubiquitous. Anthropic, OpenAI, Google encourage AI-assisted dev. Quan trọng là hiểu code mình ship.)

---

### C7. "Production có chạy thật không hay chỉ demo localhost?"

**A:** Có chạy thật ở `https://holilihu.online` (đã deploy GCP VM, Caddy auto-HTTPS, Cloudflare R2). Hiện tại VM **paused** tiết kiệm credit free-trial (per CLAUDE.md "Production VM paused since 2026-04-24"). Có:
- Runbook resume: `docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md`
- DB backup: `backups/prod-2026-04-24.dump` (483KB)
- CI vẫn build images push GHCR mỗi commit (ready resume bất cứ lúc nào)

Nếu giám khảo yêu cầu demo production, có thể resume trong 5-10 phút. Hiện demo localhost chạy stack đầy đủ.

---

### C8. "Tại sao chọn maritime, không phải general LMS?"

**A:**
- **Khác biệt market:** Vietnam có Moodle, ViettelStudy general — không có specialized maritime.
- **Domain expertise:** STCW, IMO compliance — yêu cầu nghiêm ngặt, không thể fake.
- **Bài toán đặc thù offline:** thuyền viên trên tàu xa bờ — bài toán có ý nghĩa technical (PWA, sync, R2 bandwidth).
- **VIMARU positioning:** đại học chuyên ngành hàng hải → đề tài align mission đào tạo.
- **Thương mại potential:** tàu thương mại VN ~2000 tàu, mỗi tàu 10-20 thuyền viên = 20-40k user tiềm năng.

---

### C9. "Backend 929 test có quá nhiều không? Em viết hết hay AI?"

**A:** 929 test = ~440 source file → 2:1 ratio (mỗi 2 source file ~ 1 test class). Industry standard 2:1 đến 3:1.
- Domain test: pure POJO, dễ viết (50% coverage là đủ).
- Use case test: mock repository + assert behavior.
- Controller test: @WebMvcTest slice.
- Integration test: @SpringBootTest full context.
- ArchUnit test: enforce convention (1 test = 100+ assertion).

AI scaffold initial test (ngày 1 viết được 100 test), team review/extend/add edge case. Quan trọng: **tests pass + meaningful** (không trivially `assertNotNull`). CI fail nếu test break → buộc maintain quality.

---

### C10. "Vì sao Vietnamese-first không Tiếng Anh?"

**A:**
- **MVP scope:** target VIMARU + Vietnamese maritime industry. 90%+ user nói tiếng Việt.
- **Domain term:** STCW, IMO chuẩn quốc tế nhưng giải thích bằng tiếng Việt cho học viên dễ hiểu.
- **i18n architecture ready:** schema allow `i18n` field, Tiptap content có thể extend `lang` attribute, FE prepared cho ngx-translate (chưa wire).
- **Phase 2:** English support khi onboard international shipping companies.

---

## D. CÂU HỎI GIẢ ĐỊNH (gợi ý nâng cao)

### D1. "Nếu phải scale lên 100k user, kiến trúc đổi gì?"

**A:**
1. **Backend:** Single VM → k8s cluster (3-5 pod). Stateless JWT đã sẵn sàng.
2. **Database:** Read replica (3-5 read-only) + master write. Connection pool tăng.
3. **Cache:** Redis cluster cho session-like data (analytics, KPI).
4. **CDN:** Cloudflare CDN trước mọi static asset (đã có cho R2).
5. **Search:** Elasticsearch cho course search (hiện dùng PostgreSQL FTS).
6. **Queue:** RabbitMQ/Kafka cho async task (email, notification, video encoding).
7. **Monitoring:** Prometheus + Grafana + Loki cho log aggregation.
8. **Cost:** $5k/month (rough estimate) vs hiện tại ~$200/month.

---

### D2. "Nếu rời cảng 90 ngày + Internet = 0 toàn bộ time?"

**A:**
1. Download trước cập cảng: max IDB quota ~38GB (tablet 64GB). Đủ ~90h video.
2. Persistent storage approved → no eviction.
3. iOS Home Screen PWA exempt 7-day ITP.
4. Quiz queue có thể accumulate 100+ submission, syncQueue vẫn hoạt động.
5. Bottleneck: pin tablet 90 ngày liên tục? → user charge đều, app dùng OnPush + signal → tiết kiệm CPU.

**Tradeoff:** quiz GRADED không cho phép offline (chỉ PRACTICE) → phải đợi cập cảng → có thể chấp nhận business rule.

---

### D3. "Nếu hacker steal R2 credentials sao?"

**A:**
- Tất cả AWS_SECRET trong `.env.prod` (never commit).
- Presigned URL time-limited 30 min → leak chỉ harm 30 min.
- R2 bucket policy: chỉ cho phép presigned signature (không public read).
- Cloudflare Worker `media.holilihu.online` edge auth: validate JWT → R2 (defense layer 2).
- Audit log all upload session.
- Rotate AWS_SECRET định kỳ (Hashicorp Vault future).

---

## Tổng kết Q&A bank

- **A:** 15 câu cross-cutting (cả nhóm đều phải nắm)
- **B.1:** 10 câu phân hệ Quản trị (Hồng)
- **B.2:** 12 câu phân hệ Tạo khoá học (Thùy Linh)
- **B.3:** 17 câu phân hệ Đánh giá (Mỹ Linh)
- **B.4:** 15 câu phân hệ Offline/PWA (Hùng)
- **C:** 10 câu bẫy
- **D:** 3 câu giả định nâng cao

**Tổng:** ~82 câu. In ra cầm vào phòng. Đọc 2-3 lần trước buổi bảo vệ. Mỗi câu nhớ key point + 1 file:line evidence.

**Chiến thuật trả lời:**
1. Lắng nghe câu hỏi đến cùng (không cắt ngang).
2. Trả lời ngắn 2-3 câu trước, chờ giám khảo gật/lắc đầu.
3. Nếu cần, đào sâu thêm (mở code minh hoạ).
4. Không biết → "Em chưa nghiên cứu sâu phần đó, nhưng theo design đã làm thì..." → tránh fabricate.
5. Conflict-of-interest câu (em copy không? em mock không?) → trả lời thẳng, có evidence cụ thể.

Chúc cả nhóm bảo vệ thành công.
