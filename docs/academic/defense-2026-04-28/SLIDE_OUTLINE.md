# SLIDE OUTLINE — Bảo vệ TTTN VIMARU 2026-04-28

> Slide vài trang (10-12 slide). Mỗi slide 1 ý chính. Không nhồi text. Bullet ngắn. Slide phụ trợ — chính là biện luận miệng + Q&A.
>
> **Format đề xuất:** ratio 16:9, font sans-serif (Inter / Roboto / Open Sans), size title 36, body 20-24. Background trắng, accent `#0056D2` (design token dự án). Tránh emoji.

---

## SLIDE 1 — TITLE

```
═══════════════════════════════════════════════════════
  HỆ THỐNG HỌC TRỰC TUYẾN ĐẶC THÙ
  CHO HỌC VIÊN NGÀNH HÀNG HẢI
═══════════════════════════════════════════════════════

Nhóm 4 sinh viên — VIMARU
  Phạm Thị Minh Hồng  (CNT63ĐH)
  Nguyễn Thùy Linh    (CNT63ĐH)
  Nghiêm Thị Mỹ Linh  (KPM63ĐH)
  Nguyễn Mạnh Hùng    (CNT63ĐH)

GVHD: ThS. Phạm Trung Minh
Cơ sở thực tập: Cty CP giải pháp phần mềm trực tuyến VN
Hải Phòng, 2026-04-28
```

**Notes:** Logo trường + logo công ty góc trên. Domain `holilihu.online` góc dưới.

---

## SLIDE 2 — BÀI TOÁN

**Title:** Đặc thù học viên ngành hàng hải

**Content:**
- Thuyền viên công tác trên tàu xa bờ (vài tuần đến vài tháng)
- Mạng Internet **kém / gián đoạn / không có** (vệ tinh đắt, 1GB ≈ $50)
- Tablet/phone chia sẻ giữa nhiều thuyền viên
- Yêu cầu chứng chỉ quốc tế **STCW / IMO**
- LMS phổ thông (Moodle, Canvas) **không** giải quyết offline cho web

**Visual:** Hình ảnh tàu giữa biển + icon WiFi gạch chéo

---

## SLIDE 3 — GIẢI PHÁP TỔNG QUAN

**Title:** LMS Maritime — `holilihu.online`

**4 phân hệ chia theo Bounded Context (DDD):**

| Phân hệ | SV | Bài toán giải quyết |
|---|---|---|
| Quản trị hệ thống | Hồng | Multi-tenant 10+ tổ chức, RBAC 4-tier |
| Tạo khóa học | Thùy Linh | Tiptap editor + R2 video + publication snapshot |
| Đánh giá / Trắc nghiệm | Mỹ Linh | 11 domain model, 6 grading strategy, anti-cheat |
| **Tối ưu offline (PWA)** | **Hùng** | **TRỌNG TÂM — học offline trên tàu** |

---

## SLIDE 4 — KIẾN TRÚC HỆ THỐNG

**Title:** Clean Architecture + Domain-Driven Design

**Visual (sơ đồ ASCII hoặc draw.io):**
```
┌──────────────────────────────────────────────────┐
│  WEB        │ REST Controllers (@PreAuthorize)   │
├──────────────────────────────────────────────────┤
│  APPLICATION │ Use Cases (business orchestration)│
├──────────────────────────────────────────────────┤
│  DOMAIN     │ Aggregates + VOs + Repository Port │
│             │ (NO @Entity, NO Spring imports)    │
├──────────────────────────────────────────────────┤
│  INFRA      │ JPA Entity + Adapter + Security    │
└──────────────────────────────────────────────────┘
```

**Bullet:**
- Golden rule: `JpaRepository<JpaEntity, UUID>` — không phải `JpaRepository<DomainModel, UUID>`
- ArchUnit `CleanArchitectureTest` enforce convention
- 7 module: identity, course_authoring, learning_delivery, assessment, communication, ai_assistant, shared

---

## SLIDE 5 — TECH STACK

**Title:** Production-grade modern stack

**2 cột:**

**Backend**
- Java 21 (Virtual Threads — Project Loom)
- Spring Boot 3.2.6 + Spring Security 6
- PostgreSQL 16 (JSONB, audit trigger)
- Flyway 10 (118+ migrations)
- JJWT 0.12.3 (HS256)
- AWS SDK S3 (Cloudflare R2)
- 929 tests (JUnit 5 + Mockito + AssertJ + ArchUnit)

**Frontend**
- Angular 20.3 (Signals + OnPush)
- TypeScript 5
- Tiptap (MIT) editor
- Shaka Player 5 (HLS/DASH adaptive)
- Dexie.js 4 (IndexedDB ORM)
- Service Worker (NGSW + custom sw-wrapper)
- Tailwind + SCSS

**Infra**
- GCP Compute Engine (e2-medium app + e2-standard-4 video-worker)
- Caddy auto-HTTPS
- Cloudflare R2 + Cloudflare Worker edge auth
- GitHub Actions CI/CD (4 jobs)

---

## SLIDE 6 — SỐ LIỆU

**Title:** Production-ready milestone

| Metric | Value |
|---|---|
| Backend Java files | 440+ |
| Backend tests | **929** (0 failures) |
| Backend endpoints | **295+** |
| Domain models | 43 |
| Use cases | 83 |
| Frontend components | 215+ |
| Frontend services | 62 |
| Frontend routes | 108 |
| Test coverage | ~85% |
| Code review | CI 4/4 jobs phải xanh |

**Footer:** Đã deploy production GCP `holilihu.online` (hiện paused tiết kiệm credit free-trial)

---

## SLIDE 7 — PHÂN HỆ 1 — QUẢN TRỊ (Hồng)

**Title:** Multi-tier RBAC + Audit + Security

**Bullet:**
- 4-tier role: ADMIN / ORG_ADMIN / TEACHER / STUDENT
- 3 lớp guard ORG_ADMIN không leo quyền (annotation + business + scoping)
- JWT 15min access + 30 ngày refresh, BCrypt password
- Audit log (JSONB old/new + DB trigger immutable, window ≤ 365 ngày SOC2)
- 23 admin route, 5 shared component lib (kpi-card, action-card, bulk-action-bar, kebab-menu, date-range-toggle)
- 91 backend file + 48 frontend component, ~37k LOC

**Visual:** Sơ đồ 4-tier role hierarchy

---

## SLIDE 8 — PHÂN HỆ 2 — TẠO KHÓA HỌC (Thùy Linh)

**Title:** Course Authoring + Learning Delivery

**Bullet:**
- DDD aggregate `Course` với FSM: DRAFT → PENDING → APPROVED / REJECTED
- Curriculum editor: Chapter → Lesson → ContentBlock (decompose 2,332 LOC → 5 focused component)
- **Tiptap (MIT)** thay CKEditor (GPL) — commercial-friendly, ProseMirror JSON
- **Presigned URL upload 3-step** (init → PUT R2 → confirm) — bandwidth efficient
- **Cloudflare R2** không egress charge (vs S3)
- **Shaka Packager** transcode HLS + DASH multi-bitrate (360p/480p/720p) trên dedicated video-worker VM
- **course_publications** snapshot — student read immutable, teacher edit draft độc lập
- **DeliveryMode lock** sau enrollment — không break student contract
- 2-level category + controlled vocabulary tag (V70)
- 101 BE file (course_authoring) + 140 BE (learning_delivery) + 26 FE component, 50+ endpoint

**Visual:** State machine FSM Course status

---

## SLIDE 9 — PHÂN HỆ 3 — ĐÁNH GIÁ (Mỹ Linh)

**Title:** Assessment + Quiz + Question Bank + Rubric

**Bullet:**
- **11 domain model** (cao nhất trong 7 module): Quiz, Question, QuizAttempt, Assignment, QuestionBank, Rubric, ...
- **6 grading strategy** (+ 1 ready: Math LaTeX symbolic): SingleChoice, MultipleChoice, TrueFalse, FillInBlank, ShortAnswer, Essay
- **3-step quiz attempt** (start → answer → submit) hỗ trợ offline-first sync
- **Anti-cheat:** server-side grading + strip correctOption khỏi student API + server-side shuffle + timeout + access password
- **Question Bank Community** (PUBLIC/PRIVATE × PERSONAL/DEPARTMENT/INSTITUTIONAL) — deep copy (không reference) cho edit independence
- **SpeedGrader** (Canvas SOTA pattern) — left submission, right rubric form, prev/next navigation
- **EditorJS** quiz (structured) + **Tiptap** content (rich text) — phù hợp use case
- 106 BE file + ~40 FE TS, 59 endpoint, 29 test class

**Visual:** Sơ đồ 3-step quiz attempt với offline branch

---

## SLIDE 10 — PHÂN HỆ 4 — OFFLINE/PWA (Hùng) — TRỌNG TÂM

**Title:** Tối ưu hoá dữ liệu trên thiết bị — giải quyết bài toán đặc thù

**Bullet:**
- **Dexie.js v6** IndexedDB (8 bảng, compound key `[userId+id]` multi-user isolation từ v4)
- **Cache API** video (HTTP 206 Range request, streaming write zero RAM)
- **Service Worker** custom (`sw-wrapper.js` merge NGSW + Range handler)
- **Background Sync API** (W3C 2024) — sync ngay cả khi app đóng
- **Shaka Player** adaptive bitrate (satellite 256kbps → auto 360p smooth)
- **Conflict resolution SOTA:** additive merge (videoProgress) / forward-only (lessonProgress) / server-wins (quizAttempt)
- **clientOperationId** dedup — crash giữa sync không duplicate request
- **DownloadCheckpoint** per-chapter atomic — crash resume từ chapter dở
- ~5,500 FE LOC + ~1,200 BE LOC

**Visual chính:** Sơ đồ flow Cập cảng → Download → Hành trình offline → Cập cảng → Sync (3 phase, có icon tàu, WiFi, server)

---

## SLIDE 11 — DEMO

**Title:** Demo trực tiếp

**Bullet (kịch bản demo, ~3 phút):**

1. **Login admin** (`admin@maritime.edu`) → dashboard 4 KPI + system health
2. **Course review** → admin duyệt khóa học giảng viên submit (state DRAFT → PENDING → APPROVED)
3. **Login student** (`student@maritime.edu`) → enroll khóa, xem video Shaka
4. **Login teacher** (`teacher@maritime.edu`) → curriculum editor (Tiptap), upload video presigned URL
5. **PWA offline demo:**
   - DevTools → Network tab → Offline mode
   - Vẫn xem video offline (Cache API)
   - Submit quiz offline → toast "lưu đợi sync"
   - Network online lại → auto sync (Background Sync API trigger)

**Backup nếu fail:** mở screenshot/video record sẵn trong slide.

---

## SLIDE 12 — KẾT LUẬN + HƯỚNG PHÁT TRIỂN

**Title:** Kết luận

**Đã làm:**
- Hệ thống LMS đặc thù hàng hải đầy đủ chức năng (4 phân hệ, 295+ endpoint, 215+ component)
- Kiến trúc Clean Architecture + DDD chuẩn industry
- PWA offline solution SOTA cho web (chưa có LMS Vietnamese nào làm)
- Production-deployed `holilihu.online` (paused, có runbook resume)
- 929 tests, 85% coverage, CI/CD GitHub Actions 4 jobs

**Hướng phát triển:**
- Đa ngôn ngữ (Tiếng Anh) cho international shipping
- AI assistant trợ giảng 24/7 (đã có module `ai_assistant`, đang mở rộng)
- DRM (Widevine) cho content premium
- Mobile native app (React Native / Flutter wrapper)
- Tích hợp STCW certification authority để cấp chứng chỉ digital signed
- Scale lên 100k user với Redis + Read replica + Elasticsearch + k8s

**Lời cảm ơn:**
- ThS. Phạm Trung Minh — GVHD
- Cty CP giải pháp phần mềm trực tuyến VN — cơ sở thực tập
- Khoa CNTT — VIMARU

---

## SLIDE PHỤ (nếu cần — không bắt buộc trình bày)

### S-A. Sơ đồ ER tóm tắt

5 bảng chính: `users`, `courses`, `chapters`, `lessons`, `enrollments`. Foreign key + JSONB columns chính.

### S-B. CI/CD pipeline

```
push main -> Backend Tests
          -> Frontend Build
          -> Compose Validation
          -> Docker Smoke (boot dev stack)
          -> Build images -> GHCR
          -> SSH deploy GCP VM (gated DEPLOY_ENABLED)
```

### S-C. Test pyramid

```
       /\
      /E2E\          (Playwright offline-learning-smoke)
     /----\
    /Integ.\         (@SpringBootTest)
   /--------\
  /  Unit    \       (929 test, JUnit + Mockito)
 /------------\
```

---

## NOTES TRÌNH BÀY

- **Time budget:** 10-12 phút trình bày + 10-15 phút Q&A
- **Slide 1-3:** mở (1 phút)
- **Slide 4-6:** kiến trúc + tech (3 phút)
- **Slide 7-10:** 4 phân hệ (1.5 phút mỗi cái = 6 phút)
- **Slide 11-12:** demo + kết luận (2 phút)
- **Tổng:** ~12 phút

**Tone:**
- Vietnamese diacritics đầy đủ
- Tự tin, nói chậm rõ
- Mỗi slide nói 1 ý chính, không đọc text
- Pause sau mỗi quyết định kỹ thuật quan trọng (chờ giám khảo gật/lắc)

**Phân vai:**
- Hồng mở đầu + slide 1-6 (bài toán + kiến trúc + tech + số liệu)
- Hồng slide 7 (phân hệ 1)
- Thùy Linh slide 8 (phân hệ 2)
- Mỹ Linh slide 9 (phân hệ 3)
- Hùng slide 10 (phân hệ 4 — TRỌNG TÂM, dài nhất 2 phút)
- Hùng slide 11 (demo)
- Hồng slide 12 (kết luận + lời cảm ơn)

(hoặc phân vai khác tùy nhóm)

---

## CHECKLIST SLIDE

- [ ] Tải template chuẩn VIMARU (logo trường + format)
- [ ] Slide 1 có đầy đủ 4 SV + GVHD + cơ sở
- [ ] Sơ đồ ASCII có thể vẽ bằng draw.io / Excalidraw export PNG
- [ ] Test slide trên máy demo (font + ratio + projector)
- [ ] Backup PDF + ảnh screenshot demo (offline fallback)
- [ ] Print 4 bản handout (1 cho mỗi giám khảo) — 2 trang A4
