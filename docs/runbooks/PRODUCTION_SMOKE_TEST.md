# Production Smoke Test

Đây là smoke test ngắn sau deploy hoặc sau thay đổi runtime quan trọng.

## 1. Health

```bash
curl -s https://holilihu.online/actuator/health
```

Kỳ vọng: `{"status":"UP"}`

## 2. Public app

- mở trang chủ
- mở course detail
- không có lỗi trắng trang

## 3. Auth

- đăng nhập thành công bằng 1 tài khoản hợp lệ
- đăng xuất thành công

## 4. Teacher

- mở dashboard teacher
- mở curriculum/editor
- mở ít nhất một modal section

## 5. Learner

- mở một course đã được entitlement
- vào một lesson
- nếu có quiz/video/file thì mở đúng một loại nội dung

## 6. Payment / payout

- mở payment entrypoint
- kiểm tra payout history / admin payout nếu batch đụng finance

## 7. Video

- if a new `videoAssetId` is attached to an already `APPROVED` course, run `teacher submit-for-approval` and `admin approve` before learner smoke because published learner content comes from publication snapshots
- nếu batch đụng video runtime, chạy checklist ở `VIDEO_R2_SHAKA_CUTOVER_CHECKLIST.md`
- ingest/package trên VM hiện tại có thể mất nhiều phút; chờ đến khi asset đạt `status=READY` và `adaptivePackagingStatus=READY` rồi mới smoke learner playback
- nếu teacher hỏi vì sao upload đã xong mà asset chưa `READY`, giải thích rõ đây là thời gian worker-side `ffprobe + ffmpeg + Shaka + upload package`, không chỉ là tốc độ mạng lúc upload file
- nếu ingest chậm hơn baseline mong đợi, xem log stage timings mới của worker và cân nhắc 3 núm tuning: `VIDEO_PACKAGE_UPLOAD_CONCURRENCY`, `VIDEO_ADAPTIVE_SEGMENT_DURATION_SECONDS`, `VIDEO_FFMPEG_PRESET`
- baseline mới trên production VM hiện tại là khoảng `14m19s` cho sample `~156 MB / 1080p` sau khi bật one-pass multi-rendition + `VIDEO_FFMPEG_PRESET=superfast`; nếu chậm hơn đáng kể, ưu tiên xem `transcode-adaptive-renditions` trong worker timings
- nếu cần chạy lại smoke video production bằng file thật, dùng `scripts/prod-video-smoke.ps1` thay vì ráp tay từng bước multipart
- nếu cần tăng worker, ưu tiên chỉnh `.env.prod` với `VIDEO_WORKER_CPU_LIMIT`, `VIDEO_WORKER_MEMORY_LIMIT`, rồi deploy lại thay vì sửa trực tiếp `docker-compose.prod.yml`
- nếu cần giảm control-plane overhead khi learner playback đông hơn, giữ `VIDEO_MANIFEST_CACHE_SECONDS` và `VIDEO_OBJECT_REDIRECT_CACHE_SECONDS` ở mức ngắn hạn hợp lý thay vì tắt cache hoàn toàn
- teacher upload smoke: `upload/init -> upload presigned PUT -> upload/confirm -> video-assets/from-upload`
- với file video lớn, chấp nhận trường hợp `upload/init` trả strategy multipart thay vì một `uploadUrl` đơn; smoke vẫn phải kết thúc ở `upload/confirm`
- nếu `upload/init` trả `500` khi dùng multipart trên production, kiểm tra ngay schema `upload_sessions.multipart_upload_id`; cột này phải đủ dài để chứa upload ID thật từ R2
- nếu asset ingest treo ở `PENDING/FAILED` với `UnknownHostException` tới `*.r2.cloudflarestorage.com`, kiểm tra `video-worker` có nằm trên một network Docker có egress ra internet, không chỉ network `internal`
- learner playback smoke:
  - `GET /api/v3/sections/{sectionId}/video/play?format=hls`
  - `GET /api/v3/sections/{sectionId}/video/play?format=dash`
- learner offline smoke:
  - `GET /api/v3/sections/{sectionId}/video/download?profile=STANDARD`
- verify learner không đủ entitlement bị `403`

Current production note:

- dedicated-worker ingest baseline for the sample `~156 MB / 1080p` file is about `7m33s`
- media object delivery truth is `media.holilihu.online`
- invalid or missing media tokens should return `403`
- signed HLS/DASH object requests should return `200`
- `scripts/prod-video-smoke.ps1` is the upload-to-ready helper
- `scripts/run-distributed-scenario.ps1` is the two-origin playback helper

## 8. PWA

- nếu batch đụng SW/offline, mở `/reset-sw` rồi kiểm tra lại
