# Phase A Deploy + Smoke Test Results

> **Date**: 2026-03-16 | **Commit**: `9d7376c` | **Tester**: Claude Code
> **Environment**: Production (holilihu.online)

## Final update

Final retest tren production da xac nhan:

- `GET /api/v3/student/courses/enrolled` -> `200`
- `POST /api/v3/student/courses/{id}/enroll` -> `200`
- `GET /api/v3/student/certificates` -> `200`

Ket luan cuoi cung cho Phase A-E:

| Phase | Status | Detail |
|------|--------|--------|
| A. Deploy | PASS | V91 + V92 migrations, containers healthy |
| B. Self-paced | PASS | Courses, content, versions, quiz access OK |
| C. Instructor-led | PASS | `/api/v3/classes/by-course/{id}` tra `200`; hien chua co class nao la expected |
| D. Certificate | PASS | `/api/v3/student/certificates` va `/api/v3/certificates/my` deu OK |
| E. Offline policy | PASS | `quizType = ASSESSMENT`, `allowOffline = false` dung policy |
| Enrollment | PASS | Self-enroll FREE course thanh cong |
| Quiz submit | PASS | Submit thanh cong |
| Sync | PASS | Push endpoint hoat dong va tra conflicts |
| Regression | PASS | Fix P0 quiz FREE course van HTTP 200 |

Ket luan van hanh:

- Khong co bug production moi trong phase smoke nay.
- Cac `403` truoc do den tu viec test nham legacy path, khong phai security regression.
- Phase A co the coi la `production-complete` o muc deploy + smoke contract hien tai.

---

## Deploy Status

| Component | Status | Detail |
|-----------|--------|--------|
| V91 migration (quiz assessment metadata) | PASS | Backend started without error |
| V92 migration (course_publications + version_modes) | PASS | Backend started without error |
| Backend health | PASS | `actuator/health` → `UP` |
| Frontend build | PASS | Angular build succeeded |
| All containers | PASS | backend(healthy) + frontend(healthy) + caddy(healthy) + db(healthy) |

---

## Phase B: Self-paced Smoke

| Test | Result | Detail |
|------|--------|--------|
| B1. List published courses | PASS | 3 courses returned (mmm FREE, huhu PAID, lll PAID) |
| B2. Course content (chapters+lessons) | PASS | 1 chapter, 1 lesson, 2 sections (TEXT + QUIZ) |
| B3. Course versions endpoint | PASS | Returns `contentVersion: 2`, `versionMode: "LEGACY"`, `publicationId: null` |
| B4. Section quiz access (student) | PASS | HTTP 200, quiz title "1.1:", 1 question |

**Note**: Course `a2120d11` has `publicationId: null` and `versionMode: "LEGACY"` — expected for pre-existing courses. New publications will create records in `course_publications` table.

---

## Phase C: Instructor-led Class Smoke

| Test | Result | Detail |
|------|--------|--------|
| C1. List classes (admin) | BLOCKED — 403 | Admin account seems to be ORG_ADMIN, `/api/v3/classes` returns 403 |
| C1. List classes (teacher) | BLOCKED — 403 | Teacher also gets 403 on `/api/v3/classes` |

**Issue**: Classes endpoint returns 403 for both admin and teacher accounts. Possible causes:
- Endpoint requires different role/permission
- Account `admin@maritime.edu` may be ORG_ADMIN not ADMIN
- Classes endpoint may have changed access rules in this deploy

**Action needed**: Team Codex to verify `/api/v3/classes` access control and confirm test accounts have correct roles.

---

## Phase D: Certificate Smoke

| Test | Result | Detail |
|------|--------|--------|
| D1. Certificate eligibility (student) | BLOCKED — 403 | Endpoint `/api/v3/certificates/eligibility` returns 403 |
| D2. Certificate list (student) | BLOCKED — 403 | Endpoint `/api/v3/certificates` returns 403 |
| D2. Certificate list (teacher) | PASS | Returns empty array `[]` (no certificates issued yet — expected) |

**Issue**: Student account cannot access certificate endpoints. May need enrollment check or different endpoint path.

---

## Phase E: Offline Policy Smoke

| Test | Result | Detail |
|------|--------|--------|
| E1. Section quiz metadata | PASS | `quizType: "ASSESSMENT"`, `allowOffline: false` — policy fields present |
| E2. Sync push (empty operations) | EXPECTED 400 | Validation correctly rejects empty operations |
| E3. Sync push (with operation) | PASS | `processed: ?`, `conflicts: 1` — sync endpoint working |

**Key finding**: Quiz in test lesson has `quizType: ASSESSMENT` and `allowOffline: false` — this means the assessment taxonomy from V91 migration is working correctly. Offline policy enforcement will block this quiz offline (correct behavior per architecture).

---

## Summary

| Phase | Status | Blockers |
|-------|--------|----------|
| **A. Deploy** | PASS | None |
| **B. Self-paced** | PASS | None (LEGACY versionMode expected) |
| **C. Instructor-led** | BLOCKED | 403 on `/api/v3/classes` for all test accounts |
| **D. Certificate** | PARTIALLY BLOCKED | 403 for student; teacher list works (empty) |
| **E. Offline policy** | PASS | quizType + allowOffline fields present and correct |

## Regression Check

| Previous Fix | Status |
|-------------|--------|
| Quiz 403 for FREE courses (P0 bug) | PASS — HTTP 200 |
| Search unaccent (Vietnamese diacritics) | Not retested (API-level) |
| Landing page / courses / contact / auth | Not retested (FE) |

## Recommendations for Team Codex

1. **Classes 403**: Verify `/api/v3/classes` endpoint `@PreAuthorize` — test accounts may lack required role
2. **Certificate 403 (student)**: Check if student needs enrollment or if endpoint path changed
3. **LEGACY courses**: Pre-existing courses have `publicationId: null` — confirm this is handled gracefully in FE stale detection
4. **Publication creation**: No course has a publication yet — need to approve a new course or trigger publication for existing courses to test full flow
5. **Sync conflict UX**: Sync push returns conflicts but FE conflict resolution UI is phase 2 per handoff doc

---

## Team Codex verification (2026-03-16)

Sau khi rà lại code hiện tại, Team Codex chốt 3 blocker như sau:

### 1. Classes 403 on `/api/v3/classes`

**Kết luận**: đây nhiều khả năng là **test sai endpoint canonical**, không phải regression quyền.

- Backend `ClassControllerV3` đang map tại `/api/v3/classes`, nhưng **không có `GET /api/v3/classes` để list tổng**.
- Endpoint list canonical hiện tại là:
  - `GET /api/v3/classes/by-course/{courseId}`
  - `GET /api/v3/classes/by-course/{courseId}/search`
- Cả hai endpoint này đều cho phép:
  - `ADMIN`
  - `ORG_ADMIN`
  - `TEACHER`
- Teacher vẫn phải qua ownership check theo course.
- `ADMIN` và `ORG_ADMIN` được bypass ownership check trong controller.

**Xác nhận từ code**:
- `backend/src/main/java/com/example/lms/learning_delivery/infrastructure/web/ClassControllerV3.java`
- `fe/src/app/state/class.service.ts`

**Hành động retest đúng**:
- dùng `GET /api/v3/classes/by-course/{courseId}`
- chọn một course `INSTRUCTOR_LED`
- với teacher: phải là teacher sở hữu course đó
- với admin/org admin: không cần ownership

### 2. Certificate 403 (student)

**Kết luận**: có 2 khả năng rất cao:

1. **test sai path**
2. **test một endpoint không tồn tại trong contract public hiện tại**

**Contract hiện tại**:

- Student list certificate:
  - `GET /api/v3/student/certificates`
- Student issue certificate:
  - `POST /api/v3/student/certificates/issue/{enrollmentId}`
- Public verify:
  - `GET /api/v3/student/certificates/{token}/verify`
  - hoặc `GET /api/v3/certificates/verify/{token}`
- Generic authenticated certificate list:
  - `GET /api/v3/certificates/my`

**Không có endpoint public hiện hành**:
- `GET /api/v3/certificates/eligibility`

Eligibility hiện là **logic nội bộ** trong:
- `CertificateUseCase`
- `CertificateEligibilityJpaAdapter`

Nó chỉ được kiểm tra khi gọi issue certificate, không có REST endpoint riêng.

**Điểm quan trọng**:
- `GET /api/v3/student/certificates` dùng `@PreAuthorize("isAuthenticated()")`, không chặn riêng student.
- Nếu student bị 403 ở path này thì cần kiểm tra:
  - request có Bearer token hợp lệ không
  - có đang gọi đúng `/api/v3/student/certificates` hay không

**Xác nhận từ code**:
- `backend/src/main/java/com/example/lms/learning_delivery/infrastructure/web/StudentEnrollmentControllerV3.java`
- `backend/src/main/java/com/example/lms/learning_delivery/infrastructure/web/CertificateControllerV3.java`
- `fe/src/app/api/endpoints/student.endpoints.ts`
- `fe/src/app/api/endpoints/certificate.api.ts`

### 3. LEGACY courses: `publicationId = null`, `versionMode = LEGACY`

**Kết luận**: đây là **expected behavior** cho course cũ chưa có publication snapshot, và FE hiện đã có logic handle đúng.

**Behavior hiện tại**:
- nếu chưa có publication:
  - backend trả `publicationId: null`
  - `versionMode: "LEGACY"`
- FE offline layer sẽ:
  - lưu `versionModeSnapshot = 'LEGACY'`
  - vẫn cho course hoạt động bình thường
  - mark stale khi:
    - server bắt đầu có `publicationId`, hoặc
    - `contentVersion` tăng
  - gắn `staleReason = 'LEGACY_PACKAGE'`

**Xác nhận từ code**:
- `backend/src/main/java/com/example/lms/course_authoring/infrastructure/service/CoursePublicationService.java`
- `fe/src/app/core/db/lms-offline.db.ts`
- `fe/src/app/core/services/course-download.service.ts`
- `fe/src/app/core/services/offline-sync.service.ts`

**Kết luận vận hành**:
- không phải blocker
- đây là compatibility mode đúng chủ đích trong rollout V92

## Codex retest checklist ngắn

1. Classes:
   - retest bằng `/api/v3/classes/by-course/{courseId}`
   - dùng một course `INSTRUCTOR_LED`
2. Certificates:
   - retest bằng `/api/v3/student/certificates`
   - issue bằng `/api/v3/student/certificates/issue/{enrollmentId}`
   - không test `/api/v3/certificates/eligibility` vì endpoint này không tồn tại
3. LEGACY:
   - coi là expected trong phase A
   - chỉ follow-up nếu FE thực tế render sai stale state hoặc chặn download sai

---

## Codex follow-up: student namespace smoke clarification

Sau khi rà lại bug report kế tiếp của Claude Code, Team Codex xác nhận:

### Không có bằng chứng cho thấy `SecurityConfig` phase A đã làm hỏng toàn bộ `/api/v3/student/**`

Lý do:

- `SecurityConfig` hiện không có rule deny riêng cho `/api/v3/student/**`.
- Tất cả request không public đều đi theo `anyRequest().authenticated()`.
- Student token đã được xác nhận vẫn hoạt động ở:
  - `/api/v3/auth/me`
  - quiz learner endpoints có `hasRole('STUDENT')`

Điều này làm giả thuyết "student namespace bị chặn ở filter level do phase A" hiện **chưa đủ bằng chứng**.

### 4 path trong bug report là legacy hoặc sai contract hiện tại

Các path sau **không phải backend contract canonical hiện tại**:

- `GET /api/v3/student/courses`
- `GET /api/v3/student/courses/library`
- `GET /api/v3/student/enrollments`
- `POST /api/v3/student/enroll/{courseId}`

Contract đúng hiện tại là:

- `GET /api/v3/student/courses/enrolled`
- `POST /api/v3/student/courses/{courseId}/enroll`
- `GET /api/v3/student/certificates`

Nghĩa là bug report mới đang trộn:

- legacy API paths
- frontend page route mental model
- backend contract thực tế

### Chỉ còn 1 path cần coi là tín hiệu bug thật nếu vẫn 403

- `GET /api/v3/student/certificates`

Path này **có tồn tại thật** trong backend và chỉ yêu cầu `isAuthenticated()`.

Nếu path này vẫn trả `403` với:

- token student hợp lệ
- Bearer header chuẩn
- request đi thẳng backend production

thì đây mới là bug thật cần đào tiếp ở production/runtime.

### Retest bắt buộc trước khi mở bug SecurityConfig

1. `GET /api/v3/student/courses/enrolled`
2. `POST /api/v3/student/courses/{courseId}/enroll`
3. `GET /api/v3/student/certificates`

Nếu vẫn lỗi, cần gửi lại đúng:

- URL đầy đủ
- method
- status
- response headers
- response body raw

Chỉ khi đó mới nên mở bug "student namespace security regression".
