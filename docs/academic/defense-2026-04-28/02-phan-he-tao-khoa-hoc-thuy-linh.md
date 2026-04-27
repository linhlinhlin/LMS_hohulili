# Phân hệ 2 — Tạo khóa học trực tuyến (Nguyễn Thùy Linh)

> Sinh viên: Nguyễn Thùy Linh — Lớp CNT63ĐH — VIMARU
> Phụ trách: phân hệ tạo khóa học (course authoring + learning delivery)
> Stack: Spring Boot 3.2.6 + Java 21 + PostgreSQL 16 + Angular 20.3 + Tiptap (MIT) + Cloudflare R2 + Shaka Packager

---

## 1. Kiến trúc lớp

### Sơ đồ Course Authoring + Learning Delivery

```
┌──────────────────────────────────────────────────────────────┐
│                   REST Controllers (Presentation)            │
│ CourseAuthoringControllerV3  AdminCoursesControllerV3        │
│ TeacherCoursesControllerV3   CourseReviewControllerV3        │
│ CourseCategoryControllerV3   CourseTagControllerV3           │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│            Application Layer (Use Cases)                      │
│ CreateCourseUseCase  UpdateCourseUseCase                      │
│ ApproveCourseUseCase RejectCourseUseCase                      │
│ CreateChapterUseCaseV3  CreateLessonUseCaseV3                 │
│ ManageContentBlockUseCaseV3  PresignedUploadUseCase           │
│ CoursePublicationPortAdapter  CoursePublicationService        │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│            Domain Layer (Aggregate Roots)                     │
│ Course (DDD Aggregate) - status FSM: DRAFT -> PENDING ->      │
│                          APPROVED/REJECTED                    │
│ Chapter (Composite)      Lesson (Sub-aggregate)               │
│ ContentBlock (Value Obj) CourseCategory (2-level tree)        │
│ CourseTag (Controlled)   LearningClass VersionMode            │
│ Enrollment (Learning)                                         │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│          Infrastructure Layer (Persistence)                   │
│ CourseRepository  ChapterJpaRepository                        │
│ LessonJpaRepository  ContentBlockJpaEntity                    │
│ CoursePublicationJpaRepository CourseReviewEventJpaRepository │
│ ShakaPackagerService PresignedUploadUseCase                   │
│ R2StorageService  R2VideoStorageService                       │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│        External Services (Cloud)                              │
│ PostgreSQL 16  Cloudflare R2  Shaka Packager CLI              │
│ Video-Worker VM (e2-standard-4)  Flyway Migrations            │
└──────────────────────────────────────────────────────────────┘
```

### File chính mỗi tầng

**Domain Layer (8 file):**
- `backend/src/main/java/com/example/lms/course_authoring/domain/model/Course.java` — Aggregate root (563 LOC)
- `backend/src/main/java/com/example/lms/course_authoring/domain/model/Chapter.java`
- `backend/src/main/java/com/example/lms/course_authoring/domain/model/Lesson.java`
- `backend/src/main/java/com/example/lms/course_authoring/domain/model/CourseCategory.java`
- `backend/src/main/java/com/example/lms/course_authoring/domain/model/CourseTag.java`
- `backend/src/main/java/com/example/lms/course_authoring/domain/event/*` — CourseCreatedEvent, CourseApprovedEvent, ...
- `backend/src/main/java/com/example/lms/learning_delivery/domain/model/LearningClass.java` — VersionMode (PINNED vs FOLLOW_LATEST)
- `backend/src/main/java/com/example/lms/learning_delivery/domain/model/Enrollment.java`

**Application Layer (19 use case):**
- `backend/src/main/java/com/example/lms/course_authoring/application/usecase/CourseAuthoringUseCase.java`
- `backend/src/main/java/com/example/lms/course_authoring/application/usecase/ApproveCourseUseCase.java`
- `backend/src/main/java/com/example/lms/course_authoring/application/usecase/RejectCourseUseCase.java`
- `backend/src/main/java/com/example/lms/course_authoring/application/usecase/CreateChapterUseCaseV3.java`
- `backend/src/main/java/com/example/lms/course_authoring/application/usecase/CreateLessonUseCaseV3.java`
- `backend/src/main/java/com/example/lms/course_authoring/application/usecase/ManageContentBlockUseCaseV3.java`
- `backend/src/main/java/com/example/lms/shared/infrastructure/service/PresignedUploadUseCase.java`
- `backend/src/main/java/com/example/lms/course_authoring/application/port/CoursePublicationPort.java`
- `backend/src/main/java/com/example/lms/course_authoring/infrastructure/service/CoursePublicationService.java`
- `backend/src/main/java/com/example/lms/learning_delivery/application/usecase/CreateLearningClassUseCaseV3.java`

**Infrastructure (REST):**
- `backend/src/main/java/com/example/lms/course_authoring/infrastructure/web/CourseAuthoringControllerV3.java` — Teacher endpoints
- `backend/src/main/java/com/example/lms/course_authoring/infrastructure/web/AdminCoursesControllerV3.java` — Admin approval
- `backend/src/main/java/com/example/lms/course_authoring/infrastructure/web/TeacherCoursesControllerV3.java`
- `backend/src/main/java/com/example/lms/shared/infrastructure/web/FileUploadControllerV3.java`

**Frontend (26 component):**
- `fe/src/app/features/teacher/course-editor/pages/course-curriculum/course-curriculum.component.ts` — Main editor (2,300 LOC)
- `fe/src/app/features/teacher/course-editor/components/chapter-editor/chapter-editor.component.ts`
- `fe/src/app/features/teacher/course-editor/components/lesson-editor/lesson-editor.component.ts`
- `fe/src/app/features/teacher/course-editor/components/section-editor/section-editor.component.ts` — Tiptap + uploads
- `fe/src/app/features/teacher/course-editor/pages/course-info/` — 5 pages (pricing/taxonomy/publishing)
- `fe/src/app/core/services/presigned-upload.service.ts` — 3-step upload client

### Số liệu

| Metric | Value |
|---|---|
| Backend Java files (course_authoring) | 101 |
| Backend Java files (learning_delivery) | 140 |
| Frontend components (teacher/course-editor) | 26 |
| REST Controllers | 18+ |
| Migrations chính | V54, V70, V92, V113 |
| Domain Events | 4 (CourseCreated, Submitted, Approved, Rejected) |
| Use Cases (authoring side) | 19 |
| Endpoints | 50+ |

---

## 2. Business Logic chính (7 flow)

### Flow 1 — Tạo Khóa Học

**Endpoint:** `POST /api/v3/courses`
**Use case:** `CourseAuthoringUseCase.createCourse()`

```
Frontend gửi CreateCourseCommand (title, description, category, deliveryMode)
  -> Backend CourseAuthoringUseCase validate
      -> Domain Course.create(code, title, description, teacherId)
          -> Aggregate root được tạo
          -> CourseStatus.DRAFT
          -> DeliveryMode.SELF_PACED (default)
          -> draftChangeStatus=NONE
      -> Publish event CourseCreatedEvent(courseId, code, title, teacherId)
      -> JPA persist (courses table)
      -> Response CourseResponse {status: DRAFT, editable: true}
```

**Evidence:**
- `Course.java:62-76` — factory `Course.create()`
- `CourseAuthoringUseCase.java`

**Tradeoff:**
- WHY: tạo DRAFT cho phép teacher edit trước khi gửi duyệt
- ALTERNATIVE: tạo APPROVED luôn — vi phạm business rule (admin phải duyệt)

---

### Flow 2 — Curriculum Editor (Chapter → Lesson → ContentBlock)

```
1. Load course draft (DRAFT/REJECTED/APPROVED+draftChangeStatus=DRAFT -> editable)
2. User drag chapter Lesson 1 ↔ Lesson 2 -> reorder UI signal
3. Click save -> PUT /api/v3/courses/{id}/chapters/reorder
4. Backend UpdateChapterUseCase -> course.reorderChapters(uuids)
5. Edit Lesson -> lesson-editor opens, Tiptap toolbar
6. Gõ text + thêm image -> PresignedUploadService.initUpload() -> presigned URL
7. Upload -> PUT R2 -> confirmUpload() -> FileAttachmentJpaEntity
8. Lesson JSON: { blocks: [{type:'paragraph', content:[...]}, {type:'image', attrs:{src:'...'}}] }
9. POST/PUT /api/v3/lessons/{id}/content
10. Domain Lesson.updateContent(blocks) -> mark course as draftChanged
```

**Evidence:**
- `course-curriculum.component.ts:89-100` — Save shortcuts (Ctrl+S)
- `Chapter.java:54-59` — `addLesson()`
- `ContentBlock.java:14-68` — value object (immutable)

**Decomposition:** God component 2,332 LOC → 5 focused:
- `course-curriculum.component.ts` — Orchestration
- `chapter-editor.component.ts` — Chapter CRUD
- `lesson-editor.component.ts` — Lesson metadata
- `section-editor.component.ts` — Tiptap content + uploads
- `lecture-sections-panel.component.ts` — Outline panel

---

### Flow 3 — Upload Video (3-step Presigned URL)

**Step 1: Init Upload**
```
POST /api/v3/files/upload/init
{
  "contentType": "video/mp4",
  "fileSize": 500000000,  // 500 MB
  "folder": "videos"
}
```
Backend `PresignedUploadUseCase.initUpload()`:
- Validate contentType in ALLOWED_TYPES["videos"], fileSize ≤ 5GB
- Strategy: fileSize > 100MB → MULTIPART, else SINGLE_PUT
- Create UploadSessionJpaEntity status=PENDING, expiresAt=now+30min
- For MULTIPART: initiate S3 multipart upload → uploadId

**Evidence:** `PresignedUploadUseCase.java:81-148`

**Step 2: PUT chunks**
```
POST /api/v3/files/upload/part?storageKey=...&uploadId=...&partNumber=1
```
Response `{ uploadUrl: "..." }` → client PUT binary

**Step 3: Confirm Upload**
```
POST /api/v3/files/upload/confirm
{ "storageKey": "videos/uuid.mp4", "originalName": "lecture-intro.mp4" }
```
Backend:
- Find session PENDING, expiresAt valid
- Verify file exists in R2
- Update status=CONFIRMED
- Create FileAttachmentJpaEntity
- Response `{ attachmentId, publicUrl, storageKey }`

**Evidence:** `PresignedUploadUseCase.java:164-223`

**Cleanup:** `UploadCleanupScheduler` daily, `V74__presigned_upload_sessions.sql`

---

### Flow 4 — Submit for Approval (DRAFT → PENDING → APPROVED)

**Step 1: Teacher Submit**
```
POST /api/v3/courses/{id}/submit-for-approval
```
Domain `course.submitForApproval()`:
- Check status: DRAFT or REJECTED → allowed
- Validate ≥1 chapter, ≥1 lesson per chapter
- Update → PENDING
- Clear reviewComment, reviewedAt
- Publish CourseSubmittedForApprovalEvent

**Evidence:** `Course.java:192-217`

**Step 2: Admin Review**
```
POST /api/v3/admin/courses/{id}/approve { "comment": "Xuất sắc!" }
```
`ApproveCourseUseCase.execute()`:
1. Load course PENDING
2. `course.approve(reviewerId, comment)` → APPROVED + reviewedBy + comment + publish CourseApprovedEvent
3. `coursePublicationPort.publish(courseId, reviewerId, releaseNotes)`
   - Snapshot: course detail + chapters + lessons + assessments
   - Create CoursePublicationJpaEntity
   - **Key:** Learners read from `course_publications` snapshot, NOT live draft
4. Save audit `CourseReviewEventJpaEntity`
5. Publish domain events
6. Response APPROVED

**Evidence:**
- `ApproveCourseUseCase.java:32-63`
- `CoursePublicationService.java:46-75`

**Step 3: Rejection (alternative)**
```
POST /api/v3/admin/courses/{id}/reject
{ "reason": "Thiếu nội dung chương 2", "category": "CONTENT_INCOMPLETE" }
```

---

### Flow 5 — Học viên xem khóa học (Learner đọc Published Content)

**Endpoint:** `GET /api/v3/courses/{id}` hoặc `GET /api/v3/enrollments/{classId}/content`

```
1. Load course by ID
2. CoursePublicationService.resolvePublication(courseId, studentId)
   - NO enrollment -> latest publication (FOLLOW_LATEST mặc định)
   - INSTRUCTOR_LED + PINNED -> learningClass.courseVersionId (locked)
   - INSTRUCTOR_LED + FOLLOW_LATEST -> latest publication
   -> ResolvedPublication(publication, mode, updateAvailable)
3. Extract course detail + chapters + lessons từ snapshot JSON (KHÔNG live draft)
4. Response published structure
```

**Schema:**
```sql
CREATE TABLE course_publications (
  id UUID PRIMARY KEY,
  course_id UUID,
  publication_number INT,
  content_version INT,
  snapshot JSONB,
  published_at TIMESTAMP,
  published_by_id UUID,
  release_notes TEXT
);
```

**Evidence:**
- `CoursePublicationService.java:77-107`
- `V92__course_publications_and_version_modes.sql:1-14`

**Tradeoff:**
- WHY snapshot? Teacher edit draft trong khi student học → student không thấy nửa-edit. Admin có thể PIN class to specific version để cohort consistency.
- ALTERNATIVE: read live → student thấy content mid-edit. NO.
- ALTERNATIVE: full content replication → snapshot JSON flexible hơn cho versioning.

---

### Flow 6 — DeliveryMode Lock After Enrollment

**Domain Rule:**

```
1. Course có deliveryMode=INSTRUCTOR_LED
2. LearningClass tạo với courseId, courseVersionId
3. Enrollment links to LearningClass
4. Lock: enrolled rồi -> teacher KHÔNG đổi được deliveryMode
5. Why? Đổi mode break class schedule/syllabus/assignments
```

**Code:**
```java
// Course.java updateDeliveryMode()
public void updateDeliveryMode(DeliveryMode deliveryMode) {
    ensureEditable();  // throw if PENDING
    this.deliveryMode = deliveryMode;
    markDraftChanged();
}
// Application layer thêm:
if (command.hasDeliveryMode()) {
  List<Enrollment> enrollments = enrollmentRepo.findByCourseId(courseId);
  if (!enrollments.isEmpty() && course.getDeliveryMode() != newMode) {
    throw BusinessRuleException("Cannot change delivery mode with active enrollments");
  }
}
```

**Evidence:**
- `Course.java:152-156`
- `LearningClass.java:44-46` (VersionMode enum)

---

### Flow 7 — Category/Tag Assignment

**Categories (2-level):**
- Root: NAVIGATION, ENGINEERING, SAFETY, LOGISTICS, LAW
- Sub: NAVIGATION → NAV_RADAR, NAV_CELESTIAL, NAV_COLREG; ENGINEERING → ENG_DIESEL, ENG_ELECTRIC

**Domain:**
- `Course.updateCategory(categoryId)` — check exists, set
- `Course.updateTags(Set<String>)` — validate count ≤ 5

**Schema (V70):**
```sql
CREATE TABLE course_categories (id UUID, parent_id UUID, code VARCHAR, name, slug);
CREATE TABLE course_tags (id UUID, name, slug);
CREATE TABLE course_tag_assignments (course_id, tag_id, PRIMARY KEY (course_id, tag_id));
```

**Evidence:** `V70__course_categories_and_tags.sql:1-100`

---

## 3. Quyết định kỹ thuật (10 cái)

### TD-01: Tiptap (MIT) thay vì CKEditor (GPL)

**WHY:**
- License: CKEditor GPL → derivative phải GPL → commercial restricted
- Tiptap MIT: commercial-friendly
- Bundle: Tiptap ~40KB vs CKEditor ~200KB gzip
- Extensibility: ProseMirror-based, dễ thêm custom block (callout, tabs)
- Headless: ProseMirror JSON → framework-agnostic

**ALTERNATIVES:**
- Keep CKEditor + license exception: vẫn restrict
- Quill: smaller, less rich
- Custom: reinvent wheel

**EVIDENCE:**
- CHANGELOG: "Finalized Tiptap editor upgrade"
- `fe/src/app/shared/components/tiptap-editor/`

---

### TD-02: Cloudflare R2 thay vì AWS S3

**WHY:**
- Cost: R2 không egress charge (S3 $0.02/GB egress)
- 100GB/month playback: $2 R2 vs $4 S3
- Compatibility: S3 API-compatible
- Global CDN: Cloudflare 200+ datacenters → faster cho VN
- Integration: Shaka Packager support S3-compatible APIs

**ALTERNATIVES:**
- AWS S3: higher egress
- GCS: similar pricing
- Self-hosted Minio: ops overhead

**EVIDENCE:**
- `PresignedUploadUseCase.java:53-77` — R2Presigner injection
- `PresignedUploadUseCase.java:247-261` — presignPublicUpload S3-compatible

---

### TD-03: Presigned URL Upload thay vì Server-Side Multipart

**WHY:**
- Bandwidth: client direct → R2, không qua backend
- Concurrency: 1000 parallel uploads không overload backend
- Failed chunk retry: client-side, auto-resume
- Progress tracking real-time
- Cost: backend egress 0 → compute cost giảm 30%

**TRADE-OFFS:**
- Security: validate user_id in presigned URL (PresignedUploadUseCase tied to userId)
- Session management: UploadCleanupScheduler (V74)
- Complexity: 3-step (init → PUT → confirm)

**ALTERNATIVES:**
- Server-side multipart: simple but slow, expensive
- Browser FormData: no resume, no progress

**EVIDENCE:** `PresignedUploadUseCase.java:80-148`

---

### TD-04: Shaka Packager + HLS/DASH thay vì Mux/CF Stream

**WHY:**
- Cost: Shaka open-source vs Mux $0.006/min
- Control: own pipeline, không lock vendor
- Format: HLS (iOS) + DASH (Android) — both needed maritime devices
- Offline: Shaka generates segments → cache via SW
- Integration: works với R2 + presigned GET

**TRADE-OFFS:**
- Ops: dedicated VM
- Latency: ~30 min encoding cho 2-hour video
- Complexity: 2 manifests

**ALTERNATIVES:**
- Mux: managed, higher cost
- AWS MediaConvert: heavier integration
- Native H.264 only: iPad cũ cần HLS

**EVIDENCE:**
- `ShakaPackagerService.java:26-80`
- Output: HLS `hls/master.m3u8` + DASH `dash/manifest.mpd`
- Segment 6s

---

### TD-05: Dedicated Video-Worker VM (e2-standard-4)

**WHY:**
- CPU isolation: video encoding CPU-intensive (FFmpeg) — không starve API thread
- Scaling: API + worker scale độc lập
- Reliability: failed encoding không crash API
- Cost: e2-standard-4 (~$150/month) cheaper than scaling main API 4x

**ALTERNATIVES:**
- Serverless (Lambda): limited runtime, expensive
- All in-process: API timeout, poor scaling

**EVIDENCE:** CLAUDE.md mentions "Video-worker VM e2-standard-4"

---

### TD-06: course_publications Snapshot thay vì Live Read

**WHY:**
- Consistency: teacher edits draft trong khi student xem video → student vẫn thấy old (consistent)
- Versioning: pin LearningClass to specific publication
- Rollback: reference old snapshot
- Performance: JSONB query faster than JOIN

**TRADE-OFFS:**
- Duplicate data (JSONB compressed ~80%)
- Update lag: edit → submit → approve → publish

**ALTERNATIVES:**
- Live read: confusion mid-edit
- Eventual consistency: acceptable lag, OK
- Version branching: complex

**EVIDENCE:**
- `CoursePublicationService.java:52-75`
- `V92__course_publications_and_version_modes.sql`

---

### TD-07: Decompose God Component (2,332 LOC → 5 focused)

**WHY:**
- Maintainability: no component > 400 LOC
- Change detection: OnPush per component
- Reusability: section-editor reuse cho quiz/assignment
- Testing: smaller, isolated easier
- Signals: avoid manual change detection

**Decomposition:**
1. `course-curriculum.component.ts` — Orchestration, shortcuts
2. `chapter-editor.component.ts` — Chapter CRUD + reorder
3. `lesson-editor.component.ts` — Lesson metadata
4. `section-editor.component.ts` — Tiptap + video upload
5. `lecture-sections-panel.component.ts` — Outline tree

**EVIDENCE:**
- Old: `course-curriculum.component.ts` (2,300 LOC)
- New: `pages/course-curriculum/components/` (5 files ~1,500 LOC total)

---

### TD-08: DeliveryMode Lock Sau Enrollment

**WHY:**
- Contractual: student expect mode (SELF_PACED vs INSTRUCTOR_LED)
- Data integrity: INSTRUCTOR_LED có LearningClass, schedule
- Fairness: grading + deadlines depend mode

**ALTERNATIVES:**
- Allow change: break student contract
- Warn: not enough
- Create version: complex

**EVIDENCE:** `Course.java:152-156`

---

### TD-09: 2-Level Category (không tree N-level)

**WHY:**
- UI simplicity: dropdown 2 levels easier than recursive tree
- Maritime: 5 root × ~3 sub = 20 max → flat enough
- Query performance: 2-level join faster than recursive

**ALTERNATIVES:**
- Unlimited tree: over-engineered
- Flat: can't organize sub-domain

**EVIDENCE:**
- `CourseCategory.java:117-124` — `moveTo()` enforce 2-level
- V70 seed: 5 root + 13 subs

---

### TD-10: Angular Signals + OnPush

**WHY:**
- Performance: OnPush + signal → only affected re-render (100 lessons OK)
- Reactivity: `computed()` auto-track dependents
- Memory: no RxJS subscription leaks

**Implementation:**
```typescript
chapters = signal<Chapter[]>([]);
selectedChapterId = signal<string | null>(null);
chapterCount = computed(() => this.chapters().length);
effect(() => this.loadCourse(this.courseId()));
```

**EVIDENCE:** `course-curriculum.component.ts:1-100`

---

## 4. Đặc thù MARITIME

### 4.1 Khóa học hàng hải có gì đặc biệt?

- **STCW Compliance:** Seafarers' Training, Certification & Watchkeeping (IMO standard)
  - Course với tag STCW → tracked riêng cho compliance audit
- **Multi-department:** Navigation, Engineering, Safety, Logistics, Law
- **Certification:** Course completion → digital certificate (maritime.edu signature)
- **Language:** Bilingual content (vi-VN + English) cho international recognition

**Evidence:**
- V54 seed: "Vietnamese Maritime Education content aligned with IMO STCW standards"
- V70 subcategories: `NAV_COLREG, ENG_DIESEL, SAF_STCW, SAF_FIRE`
- Tags: `STCW, IMO`

### 4.2 Seed Data có khóa hàng hải

V54 migration:
- 10 teacher + 25 student domain `@maritime.edu`
- Maritime courses: "Hàng hải cơ bản", "STCW Cơ bản", "Radar và ECDIS", v.v.
- Categories: 5 root maritime + subs

### 4.3 Multi-language

**Status:** Chưa fully implement, **architecture ready:**
- Schema allows `i18n` field
- Frontend prepared for ngx-translate (chưa wire)

**Plan:**
- Content blocks: Tiptap ProseMirror JSON → extend với `lang` attribute
- Course metadata: title/desc → `translations` junction table
- FE: `translateService.use('vi-VN' | 'en-US')`

**Decision:** Vietnamese-first MVP, English Phase 2

---

## 5. Số liệu cụ thể

| Component | Số |
|---|---|
| Backend Course Authoring Java | 101 |
| Backend Learning Delivery Java | 140 |
| Frontend Teacher Components | 26 |
| REST Controllers | 8 chính |
| Domain Aggregate Roots | 8 |
| Use Cases | 19 |
| Migrations | 4 chính (V54, V70, V92, V113) |
| Endpoints | 50+ |
| Domain Events | 4 |

---

## 6. Q&A Defense (10 câu)

### Q1: Course aggregate không bao gồm Lesson trực tiếp tại sao?

**A:** Course chứa chapters, chapters chứa lessons (composite). Không load tất cả lesson vào aggregate vì:
- Performance: 200 chapter × 50 lesson = 10k object → heap overflow
- DDD: load only aggregate boundary
- Persistence: JPA lazy-load `@OneToMany`
**Evidence:** `Course.java:52` — `private Set<Chapter> chapters`

---

### Q2: Upload session expiry hoạt động sao?

**A:** 3-tier cleanup:
1. Session TTL: `PRESIGN_TTL = 30 min`
2. DB TTL: `expiresAt` field — application check `Instant.now().isAfter(expiresAt)`
3. Async cleanup: `UploadCleanupScheduler` daily, mark EXPIRED
**Evidence:** `PresignedUploadUseCase.java:225-235`

---

### Q3: Teacher edit draft khi student đang học, gì xảy ra?

**A:** Không ảnh hưởng:
- Student read `course_publications` snapshot (immutable)
- Teacher edit `courses` + `content_blocks` (draft)
- Submit → admin approve → new publication
- LearningClass.versionMode=PINNED → student locked old publication
**Scenario:**
1. Teacher publish V1, student enroll
2. Teacher edit chapter 2, chưa submit
3. Student vẫn thấy V1 snapshot
4. Teacher submit, admin approve → V2 published
5. Admin update class → V2, hoặc giữ PINNED V1 cho cohort consistency
**Evidence:** `CoursePublicationService.java:99-106`

---

### Q4: Presigned URL có bị misuse (upload virus)?

**A:** Mitigated:
1. User authentication: presigned tied to userId
2. Content-Type whitelist
3. File size limit
4. Domain ownership: scoped to `folder = "videos"` (not `../../../admin/`)

**Remaining risk:** Malformed MP4 → Shaka Packager process (sandboxed, isolated VM). Crash → restart VM, không corrupt DB.
**Evidence:** `PresignedUploadUseCase.java:84-95`

---

### Q5: Snapshot publishing thành công làm sao biết?

**A:** Domain event `CourseApprovedEvent` published async. Listener:
- Email teacher: "Your course is live!"
- Create EnrollmentSlot for INSTRUCTOR_LED
- Increment analytics
**Evidence:** `ApproveCourseUseCase.java:57-58`

---

### Q6: Concurrent approve cùng course?

**A:** JPA `@Version` optimistic lock:
```java
private Long version;
```
1. Req 1: load v1
2. Req 2: load v1
3. Req 1: save → v2
4. Req 2: save → OptimisticLockException
5. Client retry với backoff

---

### Q7: Tiptap content lưu dạng gì?

**A:** ProseMirror JSON:
```json
{
  "type": "doc",
  "content": [
    {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Chương 1"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "..."}]},
    {"type": "image", "attrs": {"src": "https://r2..."}}
  ]
}
```
Stored JSONB in `content_blocks`. FE Tiptap deserialize render/edit.
**Evidence:** `ContentBlock.java:14-68`

---

### Q8: Reject category dùng để gì?

**A:** Audit + analytics:
- `CONTENT_INCOMPLETE` — missing lessons
- `TECHNICAL_ISSUE` — broken links/videos
- `COMPLIANCE_ISSUE` — STCW không đạt
- `METADATA_MISSING` — no description

Uses:
1. Email feedback teacher
2. Admin dashboard chart
3. Auto policy: 3+ COMPLIANCE_ISSUE → flag teacher mandatory training
**Evidence:** `CourseRejectionCategory.java`

---

### Q9: R2 presigned PUT signature hoạt động sao?

**A:** AWS Signature V4 (R2 compatible):
1. Backend generate URL với query params `X-Amz-Algorithm`, `X-Amz-Credential`, `X-Amz-Date`, `X-Amz-Signature`
2. R2 verify signature dùng AWS_SECRET (chỉ backend biết)
3. Client PUT → R2 check signature + timestamp < 30 min
4. Không trust client với credentials (presigned time-limited)

```java
PutObjectRequest putRequest = PutObjectRequest.builder()
    .bucket(bucket).key(storageKey)
    .contentType(contentType).contentLength(fileSize).build();

PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
    .signatureDuration(PRESIGN_TTL)  // 30 min
    .putObjectRequest(putRequest).build();

return r2Presigner.get().presignPutObject(presignRequest).url().toString();
```

---

### Q10: Snapshot có bao gồm video URL không?

**A:** YES:
```json
{
  "detail": {"title":"...", "thumbnailUrl":"..."},
  "content": [
    {
      "lessonId": "uuid",
      "blocks": [
        {"type":"video", "data": {
          "hlsUrl":"https://r2.cdn/.../master.m3u8",
          "dashUrl":"https://r2.cdn/.../manifest.mpd"
        }}
      ]
    }
  ]
}
```
At publish time, video encoding (Shaka) đã complete → URL stable. Re-upload video → new publication với new URL.
- V1: video URL frozen
- V2 với new URL
- PINNED class stay V1 (old video)
- FOLLOW_LATEST class auto V2

---

# Kết luận phân hệ 2

Course Authoring + Learning Delivery xây dựng theo Clean Arch + DDD:

1. **Domain-centric:** Course aggregate quản lý FSM (DRAFT → PENDING → APPROVED), business rules trong domain
2. **Event-driven:** CourseApprovedEvent triggers publication snapshot + enrollment slots
3. **Scalable upload:** Presigned URL + dedicated video-worker VM
4. **Versioning:** course_publications snapshot + LearningClass.versionMode (PINNED/FOLLOW_LATEST)
5. **Maritime-specific:** 2-level category, STCW tags, IMO compliance
6. **Modern frontend:** Angular signals + OnPush, Tiptap MIT, decomposed components

**Key Trade-offs:**
- Tiptap (MIT) over CKEditor (GPL): commercial-friendly
- R2 over S3: lower egress
- Presigned URLs: bandwidth efficiency
- Shaka Packager: open-source, flexible
- Snapshot publications: version pinning
- 2-level category: UI simplicity
