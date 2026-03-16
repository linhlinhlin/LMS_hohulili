# PWA / Offline Runbook

## Khi nào dùng

- sau deploy liên quan tới service worker, IndexedDB, offline sync, course download
- khi learner báo “đã tải course nhưng offline sai nội dung”
- khi team cần kiểm tra stale package, refresh package, hoặc sync queue

## Quy tắc trước khi test

- dùng đúng production origin `https://holilihu.online`
- nếu vừa deploy frontend/PWA, luôn reset service worker trước
- nếu package đang là legacy hoặc stale, không lấy package cũ làm kết luận cuối

## Reset service worker

1. mở `/reset-sw`
2. hard refresh
3. đăng nhập lại nếu cần
4. mở lại trang cần test

## Smoke cơ bản cho offline

1. đăng nhập learner
2. tải một khóa học self-paced
3. xác nhận course xuất hiện trong library/offline list
4. tắt mạng
5. mở lại lesson text đã tải
6. nếu course có internal video offline:
   - mở video
   - xác nhận player dùng nguồn local, không crash
7. nếu course có `PRACTICE` quiz:
   - mở quiz
   - làm bài
   - xác nhận queue sync tăng khi đang offline

## Smoke policy bắt buộc

### Quiz

- `PRACTICE`: được tải offline
- `ASSESSMENT`: không được tải offline
- `EXAM`: không được tải offline

Nếu learner offline mà gặp `ASSESSMENT` hoặc `EXAM`, UI phải báo online-only rõ ràng. Không chấp nhận trạng thái trắng hoặc im lặng.

### Video

- internal LMS video: có thể offline nếu package hợp lệ
- YouTube/external: online-only

## Kiểm tra package version

Khi rollout publication model, cần kiểm tra các điểm sau:

- package có `publicationId`
- package có `publicationNumber`
- package có `versionModeSnapshot`
- package có `staleReason` đúng khi stale

Nếu package không có `publicationId`, coi là `LEGACY_PACKAGE` và yêu cầu tải lại.

## Self-paced vs instructor-led

### Self-paced

- nếu course có publication mới:
  - learner online thấy content mới
  - package cũ phải được mark `UPDATE_AVAILABLE`

### Instructor-led

- class dùng `PINNED`
- course có publication mới nhưng class chưa adopt:
  - learner vẫn thấy content publication cũ
  - package không bị stale sai

## Khi course đã update

### Trường hợp self-paced

1. learner mở app online
2. kiểm tra có badge hoặc trạng thái cập nhật
3. learner vẫn được đọc package cũ trong lúc chưa refresh
4. learner refresh package
5. progress cũ phải còn nếu lesson/section vẫn tồn tại

### Trường hợp instructor-led pinned class

1. publish course mới
2. chưa adopt publication cho class
3. learner class đó vẫn học content cũ
4. sau khi adopt:
   - learner thấy package cũ stale
   - learner refresh package

## Khi sync bị lỗi

### Dấu hiệu

- queue không giảm sau khi online lại
- lesson/video progress không lên server
- package báo stale nhưng learner không được hướng dẫn refresh

### Kiểm tra nhanh

1. mở console, tìm lỗi IndexedDB / service worker
2. kiểm tra `/api/v3/sync/push`
3. kiểm tra `/api/v3/sync/pull`
4. kiểm tra `/api/v3/courses/versions`
5. đối chiếu `publicationId` của package với publication hiện tại

## Không được kết luận sai

- không kết luận “offline sync hỏng” chỉ vì package đang là `LEGACY_PACKAGE`
- không kết luận “course update không vào app” khi class đang `PINNED`
- không coi `ASSESSMENT`/`EXAM` không tải offline là bug; đó là policy
