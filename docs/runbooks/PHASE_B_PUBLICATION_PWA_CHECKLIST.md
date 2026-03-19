# Phase B Publication / PWA Checklist

> Ngày: 2026-03-16  
> Đối tượng chính: Team Claude Code  
> Mục tiêu: triển khai và verify vòng tiếp theo sau khi Phase A đã pass production smoke

## 1. Mục tiêu của Phase B

Phase B không lặp lại Phase A. Phase này tập trung vào các phần còn nợ nhưng có ảnh hưởng lớn đến PWA và publication model:

1. `Self-paced stale package + refresh package`
2. `Instructor-led pinned class + adopt publication`
3. `Offline progress sync sau reconnect`
4. `Practice quiz offline sync`
5. `Certificate exam gating theo metadata`
6. `Sync conflict handling khi content đổi`

## 2. Không thuộc phạm vi Phase B

Không mở rộng thêm scope ở vòng này:

- không làm delta patch package
- không tối ưu reuse video asset giữa hai publication nếu chưa có sẵn
- không làm full UX governance cho teacher/admin nếu backend path chưa cần để smoke
- không đổi policy quiz offline:
  - `PRACTICE` offline được
  - `ASSESSMENT` và `EXAM` online-only

## 3. Điều kiện vào Phase B

Chỉ bắt đầu khi tất cả điều kiện sau đã đúng:

- Phase A production smoke đã pass
- production health `UP`
- V91 và V92 đã chạy
- canonical student endpoints đã verify
- team có ít nhất:
  - 1 course self-paced dùng để test publication update
  - 1 course instructor-led dùng để test class pinning
  - 1 course có `PRACTICE` quiz
  - 1 course có `EXAM` với `countsTowardCertificate = true`

## 4. Test data cần chuẩn bị

### A. Self-paced course

- course đã publish
- learner có thể self-enroll
- có ít nhất:
  - 1 lesson text
  - 1 internal video
  - 1 `PRACTICE` quiz

### B. Instructor-led course

- course có `deliveryMode = INSTRUCTOR_LED`
- có ít nhất 1 class
- class đang pin publication A

### C. Certificate course

- course có ít nhất 1 quiz `EXAM`
- `countsTowardCertificate = true`
- learner có enrollment và có thể đạt `completionPercent = 100`

### D. Conflict course

- course có một lesson/section mà sau khi learner tải package, teacher sẽ sửa hoặc xóa để tạo stale/conflict có chủ đích

## 5. Evidence bắt buộc phải lưu

Mỗi sub-phase phải lưu lại tối thiểu:

- URL hoặc endpoint đã test
- ảnh màn hình kết quả chính
- HTTP status và response body tóm tắt
- nếu lỗi: request URL đầy đủ, method, response headers, response body raw đầu tiên

Nếu là PWA/offline:

- chụp trạng thái package trước và sau refresh
- chụp `publicationId`, `publicationNumber`, `versionModeSnapshot`, `staleReason` nếu có thể

## 6. Trình tự chạy khuyến nghị

Chạy theo đúng thứ tự này để giảm nhiễu:

1. Self-paced publication refresh
2. Instructor-led pinned class
3. Practice quiz offline
4. Offline progress sync
5. Sync conflict
6. Certificate exam gating
7. Regression pass ngắn

## 7. Checklist chi tiết

### Phase B1 - Self-paced publication refresh

#### Mục tiêu

Xác nhận learner self-paced theo `FOLLOW_LATEST`, package cũ bị mark stale đúng, refresh xong vẫn giữ progress.

#### Các bước

1. learner self-enroll course self-paced
2. learner tải course về máy
3. ghi lại:
   - `courseId`
   - `publicationId`
   - `publicationNumber`
   - `contentVersion`
4. learner học dở:
   - hoàn thành 1 lesson text
   - xem một phần video
   - làm dở hoặc hoàn thành 1 `PRACTICE` quiz
5. teacher/admin publish release mới cho đúng course đó
6. learner mở lại app khi online
7. xác nhận package cũ bị mark `UPDATE_AVAILABLE`
8. learner vẫn đọc được package cũ trước khi bấm refresh
9. learner refresh package
10. xác nhận:
   - `publicationId` mới đã được ghi
   - progress cũ còn nếu lesson/section vẫn tồn tại

#### Pass criteria

- package cũ không biến mất âm thầm
- stale state hiện đúng
- refresh không làm mất progress hợp lệ

#### Stop condition

Dừng phase nếu:

- refresh làm mất sạch progress
- package không thể mở sau khi có publication mới
- self-paced không thấy update khi publication mới đã có thật

### Phase B2 - Instructor-led pinned class

#### Mục tiêu

Xác nhận class instructor-led mặc định theo `PINNED`, không tự nhảy sang publication mới cho tới khi adopt.

#### Các bước

1. tạo hoặc chọn class đang pin publication A
2. learner thuộc class đó tải package
3. publish publication B cho cùng course
4. learner online lại
5. xác nhận learner vẫn thấy A
6. admin/teacher gọi adopt publication cho class
7. learner online lại
8. xác nhận package cũ bị stale đúng kiểu class-adopted
9. learner refresh package

#### Pass criteria

- trước khi adopt, learner class không bị stale sai
- sau khi adopt, stale state xuất hiện đúng
- refresh xong learner dùng publication mới

#### Stop condition

Dừng phase nếu:

- class tự nhảy publication khi chưa adopt
- learner class bị stale sai ngay sau khi course publish mới

### Phase B3 - Practice quiz offline

#### Mục tiêu

Xác nhận chỉ `PRACTICE` quiz mới được tải offline và submit queue hoạt động đúng.

#### Các bước

1. learner tải course có `PRACTICE` quiz
2. tắt mạng
3. mở quiz
4. làm bài
5. submit offline
6. bật mạng lại
7. chờ sync

#### Pass criteria

- quiz mở được offline
- queue sync tăng khi offline
- sau reconnect, server ack và queue giảm

#### Stop condition

Dừng phase nếu:

- `PRACTICE` quiz không mở được offline
- queue không sync sau khi reconnect

### Phase B4 - Offline progress sync

#### Mục tiêu

Xác nhận text/video progress offline được đồng bộ lên server sau khi reconnect.

#### Các bước

1. learner tải course có text + internal video
2. tắt mạng
3. đọc xong 1 lesson text
4. xem một phần video
5. bật mạng
6. đợi sync chạy
7. kiểm tra server/state online

#### Pass criteria

- lesson progress được đẩy lên
- video progress được merge theo hướng tiến lên
- item queue được ack bằng `clientOperationId`

#### Stop condition

Dừng phase nếu:

- queue bị kẹt không giảm
- progress online bị lùi
- video progress bị mất sau reconnect

### Phase B5 - Sync conflict

#### Mục tiêu

Xác nhận khi content đổi sau lúc learner đã tải package, hệ thống trả conflict rõ và không làm dữ liệu learner rơi vào trạng thái nửa đúng nửa sai.

#### Các bước

1. learner tải package
2. learner offline thao tác trên một lesson/section
3. teacher sửa hoặc xóa content tương ứng
4. learner online lại
5. theo dõi `/api/v3/sync/push` và `/api/v3/sync/pull`
6. xác nhận FE nhận conflict hoặc stale signal rõ

#### Pass criteria

- conflict được trả về có cấu trúc rõ
- learner được hướng dẫn refresh package
- không có crash hoặc trắng UI

#### Stop condition

Dừng phase nếu:

- sync silently fail
- conflict không được surface
- learner mất trạng thái mà không có thông báo

### Phase B6 - Certificate exam gating

#### Mục tiêu

Xác nhận certificate chỉ được issue khi learner hoàn thành khóa học và pass mọi `EXAM` có `countsTowardCertificate = true`.

#### Các bước

1. learner hoàn thành course tới `100%`
2. chưa pass exam chứng chỉ
3. thử issue certificate
4. xác nhận bị từ chối đúng nghiệp vụ
5. learner pass exam
6. issue lại certificate
7. tải PDF và verify token

#### Pass criteria

- chưa pass exam thì chưa được cấp certificate
- pass exam rồi issue thành công
- PDF tải được
- verify token hợp lệ

#### Stop condition

Dừng phase nếu:

- learner chưa pass exam nhưng vẫn issue được certificate
- learner đã pass exam nhưng vẫn bị chặn sai

### Phase B7 - Regression pass ngắn

Phải retest nhanh các regression đã fix trước đó:

- FREE course section quiz vẫn `200`
- canonical student endpoints vẫn `200`
- `ASSESSMENT` và `EXAM` vẫn online-only
- LEGACY course không bị coi là bug sai

## 8. Checklist ra quyết định

### Cho phép sign-off nếu

- tất cả sub-phase đạt pass criteria
- không có blocker P0/P1
- mọi lỗi còn lại đều là UX nhỏ hoặc docs follow-up

### Không sign-off nếu

- mất progress sau refresh
- class pinning sai boundary
- certificate issue sai rule exam
- sync queue không ack/reconcile được

## 9. Mẫu báo cáo trả về cho Codex

Claude Code nên báo lại theo format ngắn này:

1. `Sub-phase`
2. `Result: PASS | PARTIAL | FAIL`
3. `Evidence`
4. `Raw failing request` nếu có
5. `Assessment`
6. `Action needed from Codex`

## 10. Tài liệu phải mở kèm khi chạy

- `docs/architecture/2026-03-16-course-publication-pwa-sync-model.md`
- `docs/runbooks/PWA_OFFLINE_RUNBOOK.md`
- `docs/runbooks/PUBLICATION_REFRESH_RUNBOOK.md`
- `docs/runbooks/SYNC_CONFLICT_RUNBOOK.md`
- `docs/reports/2026-03-16-phase-a-final-verification.md`
- `docs/reports/PHASE_B_EXECUTION_REPORT_TEMPLATE.md`
