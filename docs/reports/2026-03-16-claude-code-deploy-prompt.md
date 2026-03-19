# Prompt Gửi Claude Code để Deploy Batch Publication / PWA / Storage

Copy-paste prompt dưới đây cho Claude Code:

---

Bạn đang làm việc trong repo LMS Maritime tại `E:\Sach\Sua\LMS_hohulili`.

Mục tiêu của bạn là **gom, verify, deploy, và smoke test batch hiện tại** liên quan đến:

- publication-aware PWA/offline sync
- stale package refresh + rollback
- learner stale/exam gating
- `/student/storage` như offline control center theo thiết bị
- device-level offline settings:
  - default video quality
  - download on Wi-Fi only
  - auto-sync when online

## Bối cảnh quan trọng

- Phase A production smoke trước đó đã PASS.
- Batch hiện tại có **nhiều thay đổi local chưa commit** trong workspace.
- Không được overclaim “toàn bộ hệ thống đã xong tuyệt đối”.
- Mục tiêu của batch này là **deploy an toàn và verify đúng các flow publication/PWA/storage**.

## Phạm vi file chính cần chú ý

### Backend

- `backend/src/main/java/com/example/lms/shared/application/usecase/SyncUseCase.java`
- `backend/src/test/java/com/example/lms/shared/application/usecase/SyncUseCaseTest.java`

### Frontend

- `fe/src/app/api/interceptors/offline.interceptor.ts`
- `fe/src/app/core/db/lms-offline.db.ts`
- `fe/src/app/core/services/course-download.service.ts`
- `fe/src/app/core/services/network-status.service.ts`
- `fe/src/app/core/services/offline-sync.service.ts`
- `fe/src/app/core/services/offline-device-settings.service.ts`
- `fe/src/app/core/utils/offline-course-staleness.ts`
- `fe/src/app/core/utils/offline-course-staleness.spec.ts`
- `fe/src/app/features/learning/components/lesson-content/lesson-content.component.html`
- `fe/src/app/features/learning/components/lesson-content/lesson-content.component.ts`
- `fe/src/app/features/learning/models/learning.models.ts`
- `fe/src/app/features/learning/pages/course-learning.component.html`
- `fe/src/app/features/learning/pages/course-learning.component.ts`
- `fe/src/app/features/learning/services/learning.service.ts`
- `fe/src/app/features/student/quiz/student-quiz-taking.component.html`
- `fe/src/app/features/student/quiz/student-quiz-taking.component.ts`
- `fe/src/app/features/student/storage/student-storage-management.component.ts`
- `fe/src/app/features/student/storage/student-storage-management.component.html`
- `fe/src/app/shared/components/download-dialog/download-dialog.component.ts`

### Docs / handoff

- `docs/superpowers/specs/2026-03-16-student-storage-offline-control-center-design.md`
- `docs/runbooks/PHASE_B_PUBLICATION_PWA_CHECKLIST.md`
- `docs/reports/PHASE_B_EXECUTION_REPORT_TEMPLATE.md`
- `docs/reference/PUBLICATION_PWA_DEFINITION_OF_DONE.md`
- `docs/architecture/2026-03-16-course-publication-pwa-sync-model.md`
- `docs/runbooks/PWA_OFFLINE_RUNBOOK.md`
- `docs/runbooks/PUBLICATION_REFRESH_RUNBOOK.md`
- `docs/runbooks/SYNC_CONFLICT_RUNBOOK.md`
- `CHANGELOG.md`

## Yêu cầu thực hiện

### 1. Rà worktree và gom commit sạch

- Rà `git status` và xác nhận các file thay đổi hiện tại.
- Tạo commit sạch cho batch này.
- Không lẫn file ngoài scope nếu có.
- Nếu phát hiện file ngoài scope nhưng đang cần để build xanh, ghi rõ trong báo cáo.

### 2. Verify local trước khi deploy

Chạy tối thiểu:

```bash
cd E:\Sach\Sua\LMS_hohulili\backend
cmd /c "mvn.cmd -Dtest=SyncUseCaseTest,CourseQueryControllerV3ContractTest test -B"
```

```bash
cd E:\Sach\Sua\LMS_hohulili\fe
cmd /c npm run build
```

Lưu ý:

- Không fail build/test thì mới đi tiếp.
- Cảnh báo cũ đã biết:
  - `course-card.component.ts` optional-chain warning
  - CommonJS `shaka-player`
- Nếu có warning mới, ghi lại.

### 3. Deploy

- Deploy code hiện tại lên môi trường phù hợp theo quy trình team.
- Batch này **không có migration DB mới bắt buộc phải thêm ngoài các phase đã deploy trước đó**, nên nếu deploy fail do DB/migration, coi đó là finding quan trọng.

### 4. Smoke test production hoặc staging

#### A. Storage page

Mở `/student/storage` với account student và xác nhận:

- trang load được
- hiển thị quota / used / free
- có card:
  - tổng quan dung lượng
  - thiết lập ngoại tuyến trên thiết bị này
  - trạng thái đồng bộ
  - khóa học đã tải
  - video ngoại tuyến
  - vùng xóa dữ liệu

#### B. Default video quality

- đổi `chất lượng video mặc định` trên `/student/storage`
- mở một course có thể tải
- mở download dialog
- xác nhận lựa chọn mặc định trong dialog khớp setting vừa chọn

#### C. Download on Wi-Fi only

Nếu môi trường/browser cho phép mô phỏng:

- bật `chỉ tải khi có Wi-Fi`
- thử bắt đầu download trên kết nối bị xem là metered/cellular/save-data
- kỳ vọng: app chặn lượt tải mới với copy rõ ràng

Nếu không mô phỏng được:

- ghi rõ limitation và xác nhận logic/code path bằng runtime evidence khả dụng

#### D. Auto-sync toggle

Case 1:
- bật `tự đồng bộ khi có mạng`
- tạo queue item offline
- reconnect
- kỳ vọng: app tự sync

Case 2:
- tắt `tự đồng bộ khi có mạng`
- tạo queue item offline
- reconnect
- kỳ vọng: app không tự sync
- bấm `Đồng bộ ngay`
- kỳ vọng: sync chạy

#### E. Stale package refresh

Smoke tối thiểu:

- có một downloaded course stale
- vào `/student/storage`
- xác nhận course hiện trạng thái stale
- bấm cập nhật
- kỳ vọng:
  - package refresh thành công
  - progress hợp lệ được giữ lại
  - queue hợp lệ được rebind theo `publicationId` mới

#### F. Stale package + assessment/exam gating

- dùng stale package
- thử mở `ASSESSMENT` hoặc `EXAM`
- kỳ vọng:
  - learner bị chặn đúng
  - UI dẫn người học sang `/student/storage` hoặc copy rõ cần cập nhật khóa học

#### G. Regression ngắn

Xác nhận không làm vỡ:

- quiz FREE course fix
- canonical student endpoints
- self-paced learner content open
- basic sync push/pull

## Evidence bắt buộc phải thu

- URL đã test
- account/role dùng để test
- ảnh chụp `/student/storage`
- ảnh download dialog thể hiện default video quality
- log hoặc screenshot cho auto-sync bật/tắt
- ảnh hoặc log stale refresh
- nếu fail: raw request URL + status + response body đầu tiên

## Format báo cáo ngược lại cho Codex

Dùng template:

- `docs/reports/PHASE_B_EXECUTION_REPORT_TEMPLATE.md`

Và báo theo cấu trúc:

1. `Deploy`
2. `Local verify`
3. `Smoke results`
4. `Blockers`
5. `Open questions`
6. `Go / No-Go recommendation`

## Quy tắc dừng

Dừng ngay và báo lại nếu gặp một trong các tình huống:

- build local không xanh
- backend sync tests fail
- `/student/storage` không load
- auto-sync toggle không có tác dụng thật
- stale refresh làm mất package cũ mà không rollback
- assessment/exam stale không bị chặn

## Kỳ vọng cuối

Tôi không cần bạn nói “mọi thứ hoàn hảo”.
Tôi cần một kết luận trung thực:

- `Deploy PASS / FAIL`
- `Smoke PASS / PARTIAL / FAIL`
- batch này có đủ an toàn để coi là production-ready hay chưa

---

## Ghi chú cho Claude Code

- Hãy làm việc theo kiểu evidence-first.
- Không test nhầm legacy path.
- Không gộp “storage page đẹp” với “sync/runtime đã đúng” thành một kết luận mơ hồ.
- Nếu có điểm nào không verify được trong browser/runtime, hãy nói rõ là `chưa verify được`, đừng suy đoán.
