# Cloudflare Media Domain + Edge Auth Runbook

Last updated: 2026-03-19

Runbook này dành cho phase scale playback tiếp theo, khi muốn để nhiều learner cùng xem một asset mà backend không còn đứng trong hot path của segment delivery.

## 1. Mục tiêu

Thiết lập:

- custom media domain `media.holilihu.online`
- media bucket gắn vào `lms-storage`
- edge auth cho segment/init object
- cache rules để media objects được share cache tốt hơn

## 2. Điều kiện trước khi làm

- adaptive playback hiện tại phải đang ổn qua backend path
- `lms-storage` đang chứa packaged media objects
- team đã hiểu đây là phase playback scale, không phải phase ingest worker

## 3. Kiểm tra Cloudflare plan

Vào Cloudflare Dashboard của zone `holilihu.online` và xác nhận plan hiện tại.

Decision:

- nếu zone là `Pro`, `Business`, hoặc `Enterprise`: ưu tiên WAF timed HMAC token auth
- nếu zone là `Free`: chuẩn bị fallback bằng Worker validation thay vì WAF HMAC

## 4. Tạo media custom domain

Trong bucket `lms-storage`:

1. vào `R2`
2. chọn bucket `lms-storage`
3. mở `Custom Domains`
4. attach:

```text
media.holilihu.online
```

5. chờ DNS/certificate hoàn tất

## 5. Tắt public dev URL của media bucket

Trên bucket `lms-storage`:

- tắt `Public Development URL (r2.dev)` sau khi media domain sẵn sàng

Lý do:

- media delivery production phải đi qua custom domain
- access control và cache policy sẽ tập trung trên hostname này

## 6. Cấu hình cache rules

Trên Cloudflare zone:

Tạo cache rule cho:

```text
Hostname equals media.holilihu.online
AND URI Path starts with /video-packages/
```

Khuyến nghị:

- eligible for cache
- cache everything trên immutable media objects
- ignore query string trong cache key
- enable tiered cache nếu plan cho phép

## 7. Cấu hình edge auth

### Option A — WAF timed HMAC

Dùng nếu zone đủ plan.

Thiết kế:

- backend sinh URL dạng:

```text
https://media.holilihu.online/video-packages/<assetId>/...?...&verify=<token>
```

- WAF custom rule validate `verify`

Checklist:

1. tạo secret dùng cho edge token
2. lưu secret đó vào backend secret manager / env
3. tạo WAF rule validate timed HMAC cho media path
4. block request nếu token invalid hoặc hết hạn

### Option B — Worker fallback

Dùng nếu không có WAF HMAC.

Thiết kế:

- request tới `media.holilihu.online` đi qua Worker
- Worker validate token
- nếu hợp lệ mới fetch object từ origin bucket

Trade-off:

- linh hoạt hơn
- nhưng custom code nhiều hơn

## 8. Thay đổi backend cần triển khai sau khi Cloudflare sẵn sàng

Backend sẽ cần:

- config media domain
- config edge auth mode
- config edge token secret
- rewrite manifest object URLs sang `media.holilihu.online`

Trong repo hiện tại, điểm sửa chính sẽ nằm ở:

- [AdaptiveVideoPlaybackService.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/service/AdaptiveVideoPlaybackService.java)
- [AdaptiveVideoPlaybackController.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/web/AdaptiveVideoPlaybackController.java)
- [VideoPlaybackTokenService.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/service/VideoPlaybackTokenService.java)

## 9. Smoke checklist

1. mở direct media URL với token hợp lệ
2. thử token hết hạn
3. thử sửa path nhưng giữ nguyên token
4. learner play HLS qua backend play endpoint
5. learner play DASH qua backend play endpoint
6. xác nhận segment requests đi vào `media.holilihu.online`
7. xác nhận backend không còn thấy volume `/object` tương ứng

## 10. Rollback

Nếu phase này lỗi:

1. backend quay lại rewrite về LMS `/object` URLs
2. giữ media custom domain nhưng không dùng trong manifests
3. điều tra auth/cache rules sau

## 11. Ghi chú vận hành

- Phase này không thay thế worker VM riêng; hai việc phục vụ hai nút thắt khác nhau.
- Worker VM riêng giúp `upload -> READY`.
- Media domain + edge auth giúp concurrent playback.
- Chỉ tắt backend `/object` path sau khi load-test và smoke pass ổn định.
