# Thiết Kế `/student/storage` như Trung Tâm Điều Khiển Ngoại Tuyến

> Ngày: 2026-03-16
> Phạm vi: frontend learner storage, local device settings, offline package UX
> Trạng thái: approved for implementation

## Tóm tắt

`/student/storage` sẽ được chuẩn hóa thành **trung tâm điều khiển ngoại tuyến theo thiết bị** thay vì chỉ là trang liệt kê dữ liệu đã tải.

Thiết kế này khóa các quyết định sau:

- setting được lưu **theo thiết bị hiện tại**
- **không** cho người học chọn đường dẫn lưu vật lý
- người học được quản lý:
  - quota
  - chất lượng video mặc định
  - policy tải xuống
  - policy đồng bộ
  - refresh package
  - xóa dữ liệu ngoại tuyến
- `PRACTICE` có thể offline
- `ASSESSMENT` và `EXAM` luôn online-only
- package stale phải hiển thị rõ và dẫn người học sang cập nhật

## Mục tiêu

- giúp learner hiểu rõ dữ liệu ngoại tuyến đang chiếm bao nhiêu dung lượng
- cho learner kiểm soát cách tải video và cách app đồng bộ lại khi có mạng
- làm rõ trạng thái stale/conflict thay vì để lỗi xuất hiện âm thầm trong sync
- giữ route và mental model đơn giản cho PWA

## Ngoài phạm vi

- không cho chọn thư mục/path lưu trên ổ đĩa
- không sync setting này theo tài khoản trong V1
- không hỗ trợ offline cho YouTube/external video
- không mở offline cho `ASSESSMENT` hoặc `EXAM`
- không biến trang này thành download manager chi tiết kiểu desktop app

## Quyết định sản phẩm

### 1. Setting theo thiết bị

Các setting dưới đây được lưu local:

- `defaultVideoQuality`
- `downloadOnWifiOnly`
- `autoSyncWhenOnline`
- `persistentStorageRequestedAt`
- `lastManualSyncAt`

Lý do:

- phù hợp với mô hình PWA/browser storage
- tránh xung đột giữa nhiều thiết bị
- cho phép learner chọn chính sách khác nhau giữa laptop và điện thoại

### 2. Không cho chọn path

PWA phải dùng browser-managed storage:

- IndexedDB
- Cache Storage
- storage persistence API

Người học chỉ quản lý package/quota/policy, không quản lý filesystem path.

### 3. Offline policy

- `PRACTICE`: offline-eligible
- `ASSESSMENT`: online-only
- `EXAM`: online-only
- `YouTube/external video`: online-only
- `internal LMS video`: offline nếu người học chọn chất lượng tải phù hợp

## Information architecture

Thứ tự khối trên trang:

1. `Tổng quan dung lượng`
2. `Thiết lập ngoại tuyến trên thiết bị này`
3. `Trạng thái đồng bộ`
4. `Cảnh báo stale / conflict`
5. `Khóa học đã tải`
6. `Video ngoại tuyến`
7. `Xóa dữ liệu`

## Behavior matrix

### Thiết lập tải xuống

- `Chất lượng video mặc định`
  - lựa chọn: `Không tải / 360p / 720p / 1080p`
  - áp dụng cho download mới
  - là fallback cho refresh package khi course chưa có option riêng

- `Chỉ tải bằng Wi-Fi`
  - là policy device-level
  - V1 không cố detect Wi-Fi tuyệt đối như native app
  - dùng để kiểm soát việc app có cho phép bắt đầu download lớn hay không

### Thiết lập đồng bộ

- `Tự đồng bộ khi có mạng`
  - nếu bật: reconnect sẽ trigger sync theo flow hiện có
  - nếu tắt: queue vẫn giữ local, learner bấm `Đồng bộ ngay` khi muốn

- `Yêu cầu giữ bộ nhớ lâu dài`
  - gọi `navigator.storage.persist()`
  - hiển thị trạng thái granted/denied

### Package stale

- `UPDATE_AVAILABLE`
  - self-paced có publication mới
- `CLASS_ADOPTED_NEW_PUBLICATION`
  - class pinned đã chuyển sang publication khác
- `LEGACY_PACKAGE`
  - package cũ trước publication model

Hành vi:

- learner vẫn có thể đọc nội dung cũ
- `ASSESSMENT` và `EXAM` bị khóa
- CTA chính là `Cập nhật gói`
- route quiz trực tiếp phải bị chặn nếu assessment/exam đi từ stale package

### Refresh package

Refresh phải:

- giữ tiến trình hợp lệ
- rebind queue hợp lệ theo `publicationId` mới
- giữ `downloadOptions`
- rollback về snapshot cũ nếu refresh thất bại giữa chừng

## Copy UX

- `Có bản cập nhật`
- `Khóa học này đã có phiên bản mới. Bạn vẫn có thể xem nội dung đã tải, nhưng các bài kiểm tra trực tuyến sẽ bị khóa cho tới khi cập nhật.`
- `Cần cập nhật khóa học`
- `Gói ngoại tuyến hiện tại không còn khớp với phiên bản lớp học. Hãy cập nhật để tiếp tục đồng bộ và làm bài đúng cách.`
- `Bài kiểm tra này chỉ hỗ trợ trực tuyến`
- `Video từ nguồn ngoài không hỗ trợ tải ngoại tuyến`

## Tác động kỹ thuật

### Frontend

- thêm local settings service riêng cho offline storage policy
- `student-storage-management` đọc/ghi settings này
- `CourseDownloadService` dùng setting mặc định khi không có option riêng của course
- `OfflineSyncService` tôn trọng `autoSyncWhenOnline`
- `StorageManagerService` tiếp tục là nguồn quota/persistence state

### Runtime learner

- learner shell và quiz route tiếp tục dùng stale policy hiện có
- copy stale/conflict nên lấy từ helper dùng chung để tránh drift

## Acceptance criteria

- learner thấy rõ quota đã dùng và trạng thái persistence
- learner đổi được `chất lượng video mặc định`
- learner bật/tắt được `chỉ tải bằng Wi-Fi`
- learner bật/tắt được `tự đồng bộ khi có mạng`
- refresh package vẫn giữ progress hợp lệ
- stale package hiện cảnh báo rõ và dẫn sang cập nhật
- `ASSESSMENT/EXAM` không thể bị hiểu nhầm là offline-capable

## Giai đoạn triển khai

### V1

- local device settings
- UI `/student/storage` mới
- wiring vào download/refresh/sync

### V2

- analytics cho hành vi storage/sync
- policy tinh hơn cho mạng yếu / dữ liệu di động

