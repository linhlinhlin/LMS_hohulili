# Claude Code Handoff - Platform Status

> Ngày: 2026-03-16  
> Mục đích: handoff cho team Claude Code trước lượt deploy và production smoke tiếp theo  
> Phạm vi: download/offline, video streaming, quiz/exam, assessment delivery, certificate PDF, và trạng thái theo role

## 1. Kết luận điều hành

Hệ thống hiện **chưa nên được gọi là hoàn chỉnh end-to-end cho toàn bộ student / teacher / ORG_ADMIN / ADMIN**.

Trạng thái thực tế:

- nhiều phần lõi đã đúng hướng và đã có code
- nhiều batch quan trọng đã pass local build/test
- nhưng vẫn còn các nhánh cần deploy và smoke production trước khi được coi là “xanh”

Đặc biệt:

- learner online đang là phần mạnh nhất
- publication-aware PWA/offline là batch chiến lược mới, đã có nền code và test backend nhưng chưa production-verify
- publication governance cho teacher/admin/org admin mới mạnh ở backend hơn là full UI/runtime

## 2. Trạng thái theo luồng

### 2.1 Course download / PWA offline

**Trạng thái**: vàng đậm, local-ready, chưa production-proof

Đã có:

- download course vào IndexedDB
- internal video offline path
- queue sync cho progress / submission / quiz attempt
- stale detection và offline package metadata mới:
  - `publicationId`
  - `publicationNumber`
  - `versionModeSnapshot`
  - `staleReason`

Đã cấy xong trong nhánh hiện tại:

- `FOLLOW_LATEST` cho self-paced
- `PINNED` cho instructor-led class
- package cũ có thể được mark stale đúng ngữ cảnh hơn
- sync queue mang publication-aware metadata

Chưa nên gọi là xong:

- production smoke cho stale package / refresh package / sync after reconnect
- flow refresh package giữ progress với dữ liệu thật trên production
- conflict UX đầy đủ khi content publication đã đổi

### 2.2 Video streaming

**Trạng thái**: vàng, online khá chắc, offline còn cần production verify

Đã có:

- internal LMS video theo hướng adaptive player
- internal video offline path
- YouTube/external là nhánh riêng

Đúng policy hiện tại:

- internal LMS video: có thể offline nếu package hợp lệ
- YouTube/external: online-only

Chưa nên overclaim:

- chưa gọi là “YouTube-like hoàn chỉnh” cho mọi case production
- chưa chốt production smoke cho:
  - internal video playback sau deploy
  - package refresh không làm mất progress
  - reuse local asset/video khi publication thay đổi

### 2.3 Quiz / assessment / exam

**Trạng thái**: xanh-vàng, core model đã đúng hướng

Đã có:

- taxonomy chuẩn:
  - `PRACTICE`
  - `ASSESSMENT`
  - `EXAM`
- lesson-owned quiz là nguồn chân lý cho learner flow
- assignment-delivered assessment vẫn đi theo assignment flow
- class không được coi là chủ sở hữu quiz entity riêng

Offline policy đã khóa:

- `PRACTICE`: offline được
- `ASSESSMENT`: online-only
- `EXAM`: online-only

Teacher-facing:

- teacher tạo quiz trong lesson/course content là flow chính
- route `/teacher/quiz/create` đã được chuyển thành launcher/hub đúng boundary hơn

Chưa nên gọi là full done:

- publication-aware behavior của assessment trên stale package chưa production-smoke
- workflow review/publish/expose assessment metadata cho teacher/admin chưa hoàn chỉnh ở mọi màn hình

### 2.4 Certificate và PDF

**Trạng thái**: xanh-vàng

Đã có:

- issue/list/verify/download certificate ở backend
- PDF certificate thực sự tồn tại qua PDFBox
- verification token public đã có

Rule local mới đã có:

- learner phải hoàn thành course
- nếu có `EXAM` với `countsTowardCertificate = true`, learner phải pass toàn bộ các exam đó

Đúng boundary:

- certificate exam là lesson-owned quiz trong course
- không tạo certificate object riêng cho class

Chưa nên overclaim:

- chưa deploy-smoke production vòng mới cho rule exam chứng chỉ
- chưa verify production đủ các case:
  - hoàn thành 100% nhưng chưa pass exam
  - pass exam rồi mới issue certificate
  - tải PDF sau khi issue theo rule mới

## 3. Trạng thái theo role

### Student

**Mạnh nhất hiện tại**

Đã khá chắc:

- browse course
- enroll / self-enroll
- learner online
- lesson quiz flow
- certificate list / verify / tải PDF

Chưa production-proof hoàn toàn:

- stale package khi course update
- refresh package giữ progress
- full offline sync sau reconnect theo publication-aware model

### Teacher

**Khá mạnh, nhưng post-publish workflow chưa full**

Đã có:

- authoring lesson / quiz / assignment
- video nội bộ theo section/lesson direction
- chọn `PRACTICE / ASSESSMENT / EXAM`

Chưa nên gọi là hoàn chỉnh:

- sửa course đã publish theo draft/publication workflow trên mọi màn hình
- review publication request end-to-end
- adopt publication flow ở lớp học từ UI hoàn chỉnh

### ORG_ADMIN / ADMIN

**Backend đã có nền, UI/runtime chưa full**

Đã có:

- quyền review/approve/course ops
- publication model ở backend
- class adopt publication endpoint ở backend

Chưa xong:

- governance UI đầy đủ cho publication lifecycle
- production runbook thực chiến cho release adoption / stale package / class pinning ở mức UI

## 4. Đã hoàn thành ở local branch mới nhất

### Code / contract

- publication model nền
- class version pinning
- draft mutation guard
- learner/public query đọc publication snapshot
- teacher draft query tách khỏi learner/public query
- offline package metadata publication-aware
- sync queue metadata publication-aware

### Verification

Đã pass local:

- frontend build
- backend compile
- targeted backend tests cho publication/PWA batch

Lệnh test đã pass:

```bash
cmd /c "mvn.cmd -Dtest=ApproveCourseUseCaseTest,UpdateCourseUseCaseTest,ManageContentBlockUseCaseV3Test,CreateLearningClassUseCaseV3Test,SelfEnrollUseCaseTest,SyncUseCaseTest,CourseQueryControllerV3ContractTest,CourseAuthoringControllerV3Test,TeacherCoursesSecurityTest,ClassControllerSecurityTest test -B"
```

## 5. Chưa được tuyên bố done

Team không nên tuyên bố các câu sau:

- “PWA/offline đã hoàn chỉnh”
- “publication model đã verify xong production”
- “mọi role đã hoàn chỉnh end-to-end”
- “khi course đổi nội dung thì cứ tạo course mới”
- “video offline/streaming đã chốt tuyệt đối cho production”

## 6. Deploy + smoke đề xuất cho ngày mai

### Phase A - Deploy

1. deploy migration publication/version mode
2. deploy backend publication-aware query + sync contract
3. deploy frontend offline metadata + stale detection

### Phase B - Smoke self-paced

1. learner self-paced tải course
2. verify package metadata mới
3. publish release mới
4. learner thấy `update available`
5. refresh package
6. verify progress còn giữ

### Phase C - Smoke instructor-led

1. class pin publication A
2. publish publication B
3. learner class vẫn thấy A
4. admin/teacher adopt B
5. learner thấy stale đúng
6. refresh package

### Phase D - Smoke certificate

1. course có exam chứng chỉ
2. learner hoàn thành 100% nhưng chưa pass exam
3. verify chưa issue certificate
4. learner pass exam
5. verify issue certificate thành công
6. tải PDF và verify token

### Phase E - Smoke offline policy

1. `PRACTICE` quiz tải offline được
2. `ASSESSMENT` không tải offline
3. `EXAM` không tải offline
4. internal video offline mở được
5. YouTube/external không tạo “ảo giác offline”

## 7. Tài liệu team cần đọc trước khi deploy

- `docs/architecture/STREAMING_PWA_ROADMAP.md`
- `docs/architecture/2026-03-16-course-publication-pwa-sync-model.md`
- `docs/runbooks/PWA_OFFLINE_RUNBOOK.md`
- `docs/runbooks/PUBLICATION_REFRESH_RUNBOOK.md`
- `docs/runbooks/SYNC_CONFLICT_RUNBOOK.md`
- `docs/reference/RUNTIME_CONVENTIONS.md`

## 8. Kết luận handoff

Batch hiện tại đã đủ mạnh để bước vào vòng deploy + production smoke có kiểm soát.

Điểm mạnh:

- boundary đang đúng hơn rõ rệt
- test backend cho batch publication/PWA đã khóa
- docs truth đã được cập nhật để tránh overclaim

Điểm còn nợ:

- production verification
- conflict UX hoàn chỉnh
- publication governance UI cho teacher/admin/org admin

Nói ngắn gọn:

- **student core learning**: khá mạnh
- **teacher authoring**: mạnh nhưng post-publish chưa full
- **org/admin governance**: có nền backend, chưa full UX
- **PWA/offline khi course update**: đúng hướng, chưa production-proof
