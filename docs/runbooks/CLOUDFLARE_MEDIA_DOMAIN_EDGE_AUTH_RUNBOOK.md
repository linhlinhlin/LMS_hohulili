# Cloudflare Media Domain + Edge Auth Runbook

Last updated: 2026-03-20

Runbook này dành cho phase scale playback tiếp theo, khi muốn để nhiều learner cùng xem một asset mà backend không còn đứng trong hot path của segment delivery.

## 0. Bạn cần làm gì

Nếu muốn bật phase này thật, phần Cloudflare vẫn cần thao tác ngoài repo:

1. tạo hostname `media.holilihu.online`
2. quyết định dùng:
   - `WAF timed HMAC` nếu zone là `Pro+`
   - hoặc `Worker fallback` nếu zone là `Free`
3. tạo shared secret cho edge auth
4. sau đó điền trên server:
   - `VIDEO_MEDIA_DOMAIN=https://media.holilihu.online`
   - `VIDEO_EDGE_AUTH_MODE=media_hmac_query`
   - `VIDEO_EDGE_HMAC_SECRET=<shared-secret>`
   - `VIDEO_EDGE_TOKEN_EXPIRY_SECONDS=300`

Repo đã có sẵn worker fallback template ở:

- [cloudflare/workers/media-edge-auth-worker.js](/E:/Sach/Sua/LMS_hohulili/cloudflare/workers/media-edge-auth-worker.js)
- [cloudflare/workers/wrangler.media-edge-auth.example.toml](/E:/Sach/Sua/LMS_hohulili/cloudflare/workers/wrangler.media-edge-auth.example.toml)

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

File template trong repo:

- [cloudflare/workers/media-edge-auth-worker.js](/E:/Sach/Sua/LMS_hohulili/cloudflare/workers/media-edge-auth-worker.js)
- [cloudflare/workers/wrangler.media-edge-auth.example.toml](/E:/Sach/Sua/LMS_hohulili/cloudflare/workers/wrangler.media-edge-auth.example.toml)

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

### Baseline da xac nhan tren production

Tinh den 2026-03-20, rollout `media.holilihu.online` da duoc xac nhan tren production:

- request khong token tra `403`
- HLS signed media segment tra `200`
- DASH signed media object tra `200`

Batch synthetic co kiem soat tu mot client:

- `HLS master manifest`
  - `50` ket noi trong `10s`: khoang `102 req/s`, avg latency `435 ms`
  - `100` ket noi trong `10s`: khoang `147 req/s`, avg latency `664 ms`
- `backend /object redirect`
  - `100` ket noi trong `10s`: khoang `473 req/s`, `302` as expected
  - `200` ket noi trong `10s`: khoang `491 req/s`, `302` as expected
- `media-domain HLS segment`
  - `100` ket noi trong `10s`: khoang `342 req/s`, avg latency `290 ms`
  - `200` ket noi trong `10s`: khoang `293 req/s`, avg latency `671 ms`
  - `300` ket noi trong `10s`: khoang `412 req/s`, avg latency `732 ms`, co `1` client-side error trong ca burst
- `media-domain DASH object`
  - `100` ket noi trong `10s`: khoang `615 req/s`, avg latency `161 ms`
  - `200` ket noi trong `10s`: khoang `1171 req/s`, avg latency `170 ms`

Sau ca batch lon nay, `https://holilihu.online/actuator/health` van tra `UP`.

Khong duoc doc baseline nay nhu load-test cuoi cung cho nhieu learner that; day la moc xac nhan production da on dinh hon va cho thay data plane qua media domain khoe hon ro ret so voi control-plane manifest path.

### Baseline distributed da xac nhan tu hai origin

Batch nay dung hai origin cung luc:

- local machine
- dedicated `lms-video-worker` VM

Tat ca URL media deu duoc mint moi ngay truoc khi chay vi token `verify` hien co TTL ngan.

- `media-domain HLS object`, `100 + 100` ket noi, `15s`
  - local: khoang `597 req/s`, avg latency `168 ms`, `100% 2xx`
  - worker VM: khoang `844 req/s`, avg latency `118 ms`, `100% 2xx`
  - tong hop: khoang `1441 req/s`, health sau batch van `UP`
- `media-domain HLS object`, `200 + 200` ket noi, `15s`
  - local: khoang `1176 req/s`, avg latency `171 ms`, `100% 2xx`
  - worker VM: khoang `1650 req/s`, avg latency `121 ms`, `100% 2xx`
  - tong hop: khoang `2826 req/s`, health sau batch van `UP`
- `HLS master manifest`, `50 + 50` ket noi, `15s`
  - local: khoang `215 req/s`, avg latency `232 ms`, `100% 2xx`
  - worker VM: khoang `277 req/s`, avg latency `180 ms`, `100% 2xx`
  - tong hop: khoang `491 req/s`, health sau batch van `UP`

Doc ket qua dung muc:

- batch nay da gan hon mot so viewer that so voi single-origin burst
- nhung day van la synthetic distributed test, khong phai many-region real-user benchmark
- manifest/control plane van cham hon data plane qua `media.holilihu.online`, nen phase tiep theo neu can scale nua se tiep tuc toi uu manifest path

### Manifest/control-plane cache guardrails

Tu phase cache-policy hardening, backend manifest/control-plane khong duoc coi la CDN data-plane:

- HLS/DASH manifest response chi cache private tren client, co `s-maxage=0` de shared cache/proxy khong giu manifest co playback token.
- Khi `VIDEO_EDGE_AUTH_MODE=media_hmac_query`, effective manifest TTL bi gioi han nho hon `VIDEO_EDGE_TOKEN_EXPIRY_SECONDS` 5 giay. Vi du edge token 300s thi manifest TTL toi da la 295s, du cau hinh `VIDEO_MANIFEST_CACHE_SECONDS` cao hon.
- Backend `/object` fallback va object redirect cache TTL bi gioi han nho hon `VIDEO_SEGMENT_PRESIGN_TTL_SECONDS` 5 giay.
- `/actuator/health` group `videoPipeline` expose `effectiveManifestCacheSeconds` va `effectiveObjectRedirectCacheSeconds` de smoke checklist doi chieu config that.

### Package-path nuance quan trong

Shaka Packager trong repo nay ghi media references theo package root:

- `hls/saver.m3u8` chua `segments/saver/init.mp4`
- `dash/manifest.mpd` chua `segments/audio/init.mp4`, `segments/standard/$Number$.m4s`

Vi vay backend khong duoc resolve `segments/...` theo thu muc manifest (`hls/` hoac `dash/`), neu khong se sinh sai key nhu:

- `video-packages/{assetId}/hls/segments/...`
- `video-packages/{assetId}/dash/segments/...`

Key dung phai la:

- `video-packages/{assetId}/segments/...`

Neu smoke media domain tra `404` nhung Worker/token van dung, day la diem can kiem tra dau tien.

Script helper da duoc xac nhan cho batch distributed nay la `scripts/run-distributed-scenario.ps1`; hay dung script nay thay cho cac helper thu nghiem cu.

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
- Worker fallback trong repo validate đúng token dạng `verify=<timestamp>-<base64mac>` mà backend hiện đang sinh, nên có thể triển khai trên Cloudflare Free mà không cần đổi backend contract lần nữa.
