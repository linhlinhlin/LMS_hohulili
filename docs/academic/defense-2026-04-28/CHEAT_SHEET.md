# CHEAT SHEET — IN RA CẦM VÀO PHÒNG BẢO VỆ

> Bảo vệ TTTN VIMARU — 2026-04-28 — đề tài LMS hàng hải

---

## NHÓM (4 SV)

| # | Sinh viên | Lớp | Phân hệ | File chi tiết |
|---|---|---|---|---|
| 1 | Phạm Thị Minh Hồng | CNT63ĐH | Quản trị hệ thống | `01-phan-he-quan-tri-hong.md` |
| 2 | Nguyễn Thùy Linh | CNT63ĐH | Tạo khóa học | `02-phan-he-tao-khoa-hoc-thuy-linh.md` |
| 3 | Nghiêm Thị Mỹ Linh | KPM63ĐH | Đánh giá / Trắc nghiệm | `03-phan-he-danh-gia-my-linh.md` |
| 4 | Nguyễn Mạnh Hùng | CNT63ĐH | Tối ưu offline / PWA | `04-phan-he-offline-pwa-hung.md` |

**GVHD:** ThS. Phạm Trung Minh — `minhpt@vimaru.edu.vn`
**Cơ sở thực tập:** Cty CP giải pháp phần mềm trực tuyến VN (Vinhomes Marina, Lê Chân, HP)
**Domain demo:** `https://holilihu.online` (paused, có runbook resume) — local: `http://localhost:8088 + 4200`

---

## TECH STACK 1 DÒNG

**BE:** Java 21 + Spring Boot 3.2.6 + PostgreSQL 16 + Flyway 10 + JJWT 0.12.3 + AWS SDK S3 (R2) + JUnit 5/Mockito/AssertJ/ArchUnit
**FE:** Angular 20.3 + Signals + RxJS 7 + TypeScript 5 + Sass + Dexie.js 4 + Shaka Player 5 + Tiptap (MIT)
**Infra:** GCP Compute Engine (e2-medium app + e2-standard-4 video-worker) + Caddy auto-HTTPS + Cloudflare R2 + Cloudflare Worker edge auth
**CI/CD:** GitHub Actions (4 jobs: backend tests, frontend build, compose validate, docker smoke) + GHCR images + SSH deploy gated `DEPLOY_ENABLED`

---

## SỐ LIỆU TỔNG

| Metric | Value |
|---|---|
| Backend Java files | 440+ |
| Backend tests | **929** (0 failures) |
| Backend endpoints | **295+** |
| Backend modules | 7 |
| Domain models | 43 |
| Use cases | 83 |
| Controllers | 35 |
| Migrations | 118+ |
| Frontend components | 215+ |
| Frontend services | 62 |
| Frontend routes | 108 |
| Frontend TS files | ~470 |
| Test coverage | ~85% |

---

## KIẾN TRÚC

### Clean Architecture + DDD (4 layer)
```
domain  -> application  -> infrastructure  -> web
(POJO)    (use case)      (JPA + adapter)    (REST controller)
```
**Golden Rule:** `JpaRepository<JpaEntity, UUID>` — KHÔNG bao giờ `JpaRepository<DomainModel, UUID>` ("Not a managed type" crash).

### 7 Module Backend
1. **identity** — User, Auth, JWT, Roles, Multi-tier admin (4 model, 36 endpoint)
2. **course_authoring** — Course, Chapter, Lesson, ContentBlock, Category, Tag, Review (8 model, 68 endpoint)
3. **learning_delivery** — LearningClass, Enrollment, Progress, Certificate, Video (9 model, 59 endpoint)
4. **assessment** — Assignment, Quiz, Question, Submission, Rubric, QuestionBank (11 model, 59 endpoint)
5. **communication** — Messages, Conversations (4 model, 6 endpoint)
6. **ai_assistant** — AI Chat SSE streaming (3 model, 11 endpoint)
7. **shared** — Value objects, events, exceptions, file service, payment, email, VNPay, admin settings (4 model, 18 endpoint)

### 4-Tier RBAC
| Role | VN | Phạm vi |
|---|---|---|
| ADMIN | Quản trị hệ thống | Toàn hệ thống, settings, logs, delete |
| ORG_ADMIN | Chuyên viên quản lý | Trong tổ chức của mình |
| TEACHER | Giảng viên | Khóa của mình |
| STUDENT | Học viên | Đã enroll |

**3 lớp guard ORG_ADMIN không leo quyền:** @PreAuthorize + use case business guard + multi-tenant scoping.

---

## TEST ACCOUNT (DEMO)

| Role | Email | Pass |
|---|---|---|
| ADMIN | admin@maritime.edu | admin123 |
| ORG_ADMIN | orgadmin@maritime.edu | orgadmin123 |
| TEACHER | teacher@maritime.edu | teacher123 |
| STUDENT | student@maritime.edu | student123 |

**Seed (V54):**
- 10 teacher: `tranngocdai@maritime.edu` / `Maritime@2026`
- 25 student: `nguyenvanan@sv.maritime.edu` / `Student@2026`

---

## ĐẶC THÙ MARITIME (TRỌNG TÂM ĐỀ TÀI)

> "Xử lý đặc thù học viên trên tàu, mạng kém/không có" — phân hệ 4 (Hùng) là CORE

**Use case mẫu (kể trước hội đồng):**

1. **Cập cảng Hải Phòng** (72h Internet) → thuyền viên download khoá "An toàn hàng hải" 30h video (~8GB) qua port WiFi (50Mbps) ≈ 22 phút. Per-chapter checkpoint atomic, drop network resume từ chapter dở dang.

2. **Hành trình 30 ngày Thái Bình Dương** (0 Internet) → app hoạt động đầy đủ:
   - HTTP request → `offlineInterceptor` bắt → query Dexie → trả response 200 OK
   - Video play → SW intercept → Cache API + Range request → Shaka adaptive bitrate
   - Quiz PRACTICE làm offline → queue syncQueue
   - Progress saved local (lessonProgress, videoProgress)

3. **Cập cảng Kobe** (Internet) → `window.online` event → `syncWithPriority()` 3-step:
   - syncAll batch POST `/api/v3/sync/push`
   - pullServerState
   - checkContentFreshness
   - Backend `SyncUseCase` route by entityType → conflict resolution → return ackedOperationIds

4. **Multi-user isolation** — 2 thuyền viên chia sẻ tablet → Dexie compound key `[userId+id]` (v4+) đảm bảo A không thấy B's data.

5. **Bandwidth tiết kiệm** — Shaka Packager output HLS+DASH multi-bitrate (360p/480p/720p), satellite 256kbps → auto switch 360p, không buffer.

---

## STORYLINE 30S MỞ ĐẦU

> "Đề tài là LMS đặc thù hàng hải. Khác Moodle/Canvas, chúng em giải quyết bài toán thuyền viên trên tàu xa bờ, mạng yếu hoặc không có. Hệ thống chia 4 phân hệ: quản trị (Hồng), tạo khóa học (Thùy Linh), đánh giá (Mỹ Linh), tối ưu offline/PWA (Hùng). Stack: Spring Boot Java 21 + Angular 20 Signals + PostgreSQL 16 + Cloudflare R2. Kiến trúc Clean Architecture + DDD, 929 backend tests, 295 endpoint, 215 component. Đã deploy production GCP holilihu.online (hiện paused tiết kiệm credit). Phần đặc biệt nhất là PWA offline — anh Hùng implement Dexie.js + Service Worker + Cache API + Background Sync để học viên download khóa trước khi rời cảng, học offline 30 ngày, sync khi cập cảng. Em xin trình bày phần [tên phần đảm nhận]."

---

## DECISION TABLE (10 quyết định kỹ thuật quan trọng)

| # | Decision | WHY |
|---|---|---|
| 1 | **JWT** không session | Stateless scale ngang, mobile-friendly, cross-domain CORS dễ |
| 2 | **Clean Arch + DDD** không anemic | Testability, business clarity, swappability |
| 3 | **PostgreSQL 16** không MongoDB | JSONB native, ACID, audit trigger, relational join |
| 4 | **Flyway** không Hibernate DDL | SQL control, rollback path, SOC2 versioned |
| 5 | **Cloudflare R2** không AWS S3 | Không egress charge, CF CDN VN gần |
| 6 | **Tiptap MIT** không CKEditor GPL | Commercial-friendly, bundle nhỏ, ProseMirror |
| 7 | **Shaka Packager + HLS/DASH** không raw MP4 | Adaptive bitrate, segment caching, cross-platform |
| 8 | **Presigned URL upload** không backend stream | Bandwidth, concurrency, failed chunk retry |
| 9 | **Dexie.js** không raw IDB | Transaction safety, type safe, migration |
| 10 | **Cache API video** không Dexie blob | HTTP 206 Range, streaming write, zero RAM spike |

---

## 5 CÂU HỎI HAY HỎI NHẤT

1. **"Vì sao chọn Spring Boot/Java 21?"** — Type safe, virtual threads (10k concurrent), Spring Security maturity, ecosystem PostgreSQL/Flyway. Node.js callback hell. Python GIL.
2. **"Clean Arch + DDD áp dụng thế nào?"** — 4 layer (domain/app/infra/web), JPA chỉ ở infra (`*JpaEntity`), domain pure POJO. ArchUnit enforce. `AuthenticateUserUseCaseV2.java` 35 dòng.
3. **"PWA offline hoạt động sao?"** — SW intercept fetch, Cache API video (Range 206), Dexie IDB course content, syncQueue queue mutations, Background Sync sync khi online. Compound key `[userId+id]` multi-user isolation.
4. **"Multi-tier admin sao đảm bảo ORG_ADMIN không leo quyền?"** — 3 lớp: @PreAuthorize + use case business guard (`validateUserProvisioningRequest`) + multi-tenant scoping organizationId. `MultiTierAdminSecurityTest:134-147` test cụ thể.
5. **"Test bao nhiêu? Coverage thế nào?"** — 929 BE test (JUnit + Mockito + AssertJ + ArchUnit), 85% coverage, CI 4 jobs xanh bắt buộc merge. E2E Playwright `offline-learning-smoke.spec.ts` cover offline flow.

---

## DEMO COMMAND CHEAT (nếu giám khảo yêu cầu)

```bash
# Stack đang chạy?
docker ps | grep lms
curl http://localhost:8088/actuator/health

# Login admin
curl -s -X POST http://localhost:8088/api/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maritime.edu","password":"admin123"}'

# Open browser
http://localhost:4200/login
# admin@maritime.edu / admin123

# Database
docker exec lms-db-1 psql -U lms -d lms -c "SELECT count(*) FROM users"
```

---

## NẾU BÍ — câu trả lời sẵn

**"Em không biết, em chưa nghiên cứu phần đó."** → tốt hơn fabricate.

**"Theo design hiện tại thì...,nhưng nếu phải mở rộng em sẽ..."** → đánh thẳng vào điểm chưa làm + hướng phát triển.

**"Câu này nằm ngoài scope đề tài, em xin ghi nhận và nghiên cứu thêm."** → cho câu hỏi quá lệch.

---

## CHECKLIST CUỐI CÙNG (tối hôm trước)

- [ ] Đọc xong 4 brief + Q&A bank + cheat sheet
- [ ] Login thử 4 account demo OK
- [ ] Backend running `localhost:8088/actuator/health` = UP
- [ ] Frontend running `localhost:4200` = 200 OK
- [ ] Mở 5 file code key trên IDE sẵn (cho phép mở quickly nếu cần):
  - `User.java`
  - `AuthenticateUserUseCaseV2.java`
  - `Course.java`
  - `QuizAttemptUseCase.java`
  - `lms-offline.db.ts`
- [ ] Slide xem qua 1 lần, không sai chính tả
- [ ] Mặc lịch sự (sơ mi + quần dài)
- [ ] Mang laptop + sạc + dây mạng dự phòng
- [ ] Print cheat sheet này (1 trang A4 2 mặt nếu cần)

**Bình tĩnh. Code đã có, chỉ cần biện luận. Defense brief đã viết sẵn câu trả lời cho 80+ câu hỏi.**

Chúc cả nhóm bảo vệ thành công.
