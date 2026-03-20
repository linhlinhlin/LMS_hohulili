# Bề mặt production

Tài liệu này liệt kê các điểm vào production cần biết khi smoke test hoặc xử lý sự cố.

## Public surfaces

- Site chính: `https://holilihu.online`
- API same-origin: `https://holilihu.online/api/*`
- Health: `https://holilihu.online/actuator/health`
- Wiii: `https://wiii.holilihu.online`
- Public CDN assets: `https://cdn.holilihu.online`
- Private media delivery: `https://media.holilihu.online`

## Current production topology

- GCP project: `valued-range-443614-j4`
- Region / zone: `asia-southeast1-b`
- App VM:
  - name: `lms-production`
  - role: `backend + frontend + caddy + postgres`
  - machine type: `e2-medium`
  - private IP: `10.148.0.2`
- Dedicated ingest worker VM:
  - name: `lms-video-worker`
  - role: `video-worker`
  - machine type: `e2-standard-4`
  - private IP: `10.148.0.4`
- Current bucket split:
  - public/general assets: `lms-cdn`
  - private learner video/storage: `lms-storage`
- Current playback split:
  - manifest / entitlement / playback session token: backend on `holilihu.online`
  - HLS/DASH media objects: Cloudflare Worker custom domain on `media.holilihu.online`

## Runtime truth to remember

- Local `video-worker` on the app VM is intentionally disabled in production.
- The dedicated worker VM is the production ingest path.
- The worker VM currently reaches PostgreSQL through a private forward on the app VM.
- That private DB path is expected to use `sslmode=disable` on the worker JDBC URL unless the hop terminates PostgreSQL SSL itself.
- If the PostgreSQL forwarder on the app VM is implemented with `socat`, it must resolve the current `lms-db-1` container IP dynamically rather than pinning a stale Docker IP.
- Cloudflare Free production edge auth is implemented through a Worker custom domain, not WAF token rules.

## Bề mặt kiểm tra sau deploy

- đăng nhập
- course browse / course detail
- teacher curriculum/editor
- learner lesson view
- payment modal / payment callback
- teacher revenue / payout
- admin finance / payout / payment guard
- PWA reset và reinstall nếu có thay đổi service worker

## Cảnh báo thực tế

- service worker cũ có thể làm kết quả test sai nếu không reset cache
- payment cần tránh tạo side effect tài chính thật khi không cần thiết
- production smoke nên dùng fixture account đã biết trạng thái trước
- Nếu `media.holilihu.online` bắt đầu trả `404` thay vì `403/200`, kiểm tra lại Worker custom domain và route trước khi nghi backend.
- Nếu dedicated worker VM boot lỗi DB sau một lần restart app VM, kiểm tra lại private PostgreSQL forwarder trên `lms-production` trước khi nghi code video.
