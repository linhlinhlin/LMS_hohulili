# Changelog

Mọi thay đổi đáng chú ý của dự án này sẽ được ghi ở đây.

Định dạng bám theo tinh thần của [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), nhưng dùng tiếng Việt và phù hợp với cách vận hành của repo này.

## [Chưa phát hành]

### Video / Infrastructure

- Chuyển learner-facing adaptive playback từ Cloudflare Stream sang private `Cloudflare R2 + Shaka Packager`.
- Chốt bucket split production: public `lms-cdn` cho asset công khai và private `lms-storage` cho learner video/storage qua presigned URL.
- Thêm signed backend playback token, manifest rewrite, và segment redirect sang presigned R2 URL ngắn hạn cho adaptive playback.
- Repo giờ hỗ trợ multipart direct upload cho video lớn, thay vì chỉ dựa vào single presigned PUT cho mọi kích thước file.
- Production compose có thể chạy `video-worker` riêng để tách ingest khỏi web backend.
- Thêm cơ chế claim ingest job an toàn hơn trước khi xử lý, tạo nền cho scale ngang worker thay vì plain polling không khóa.
- Vá production bug cho multipart upload session: `multipart_upload_id` của R2 có thể dài hơn `varchar(255)`, nên schema đã được nới sang `text`.
- Ghi rõ operational truth mới: `video-worker` không thể chỉ nằm trên network Docker `internal`; worker phải có egress network để truy cập R2 trong lúc download source, upload renditions, và package manifests.
- Giữ offline profiles theo pipeline LMS (`SAVER`, `STANDARD`, `HIGH`, `ORIGINAL`) và cắt phụ thuộc runtime vào `streamVideoUid` cho asset-backed video.
- Smoke production đã pass với file thật `1080p`: `upload/init -> presigned PUT -> upload/confirm -> video-assets/from-upload -> READY/READY -> HLS -> DASH -> offline STANDARD -> 403 outsider`.
- Ghi rõ operational truth: nếu course đã `APPROVED` mà teacher thêm hoặc đổi `videoAssetId`, phải `submit-for-approval` lại và để admin `approve` lại vì learner đọc từ `course_publications` snapshot, không đọc draft trực tiếp.
- Ghi nhận baseline production hiện tại: ingest/package trên VM hiện có mất hơn `20 phút` cho file mẫu khoảng `156 MB` / `1080p`; ảnh hưởng upload-to-ready latency và throughput ingest, không ảnh hưởng playback của asset đã `READY`.
- Bổ sung stage timing logs trong ingest worker để tách rõ thời gian `materialize`, `probe`, từng `transcode`, `package`, và `upload adaptive package`.
- Tối ưu ingest/package theo hướng production-safe: adaptive manifests/segments giờ được upload song song với concurrency cấu hình được qua `VIDEO_PACKAGE_UPLOAD_CONCURRENCY`.
- Bổ sung các núm tuning env cho ingest experiments mà không cần vá code tiếp: `VIDEO_PACKAGE_UPLOAD_CONCURRENCY`, `VIDEO_ADAPTIVE_SEGMENT_DURATION_SECONDS`, `VIDEO_FFMPEG_PRESET`.
- Asset status API giờ có thể phản ánh `PROCESSING` theo ingest job đang chạy, thay vì để teacher nhìn thấy `PENDING` suốt cả phiên transcode dài.
- Tối ưu core transcode path theo hướng one-pass multi-rendition: worker giờ decode source một lần để sinh các rendition adaptive cần thiết, thay vì chạy `ffmpeg` lặp lại riêng cho `SAVER` và `STANDARD`.
- Production measurement mới trên VM hiện tại: sample `~156 MB / 1080p` giảm từ khoảng `21m22s` xuống `14m19s` để đạt `READY/READY` sau khi kết hợp `VIDEO_FFMPEG_PRESET=superfast` với one-pass transcode.
- Ghi rõ trade-off production hiện tại: preset `superfast` giúp teacher chờ ngắn hơn nhưng làm `SAVER` / `STANDARD` phình bitrate và storage so với baseline `veryfast`.
- Thêm script tái sử dụng `scripts/prod-video-smoke.ps1` để chạy smoke `upload -> confirm -> asset -> READY -> manifest` trên production bằng file thật.
- Thêm cache ngắn hạn cho raw manifest và presigned object redirect trong adaptive playback để giảm control-plane overhead khi nhiều learner cùng kéo một asset.
- Tách resource tuning production ra env vars như `VIDEO_WORKER_CPU_LIMIT` / `VIDEO_WORKER_MEMORY_LIMIT` / `BACKEND_CPU_LIMIT`, cho phép tăng worker hoặc rebalance backend-worker mà không sửa tay compose mỗi vòng tối ưu.
- Thêm architecture note `docs/architecture/2026-03-19-video-worker-and-playback-scale-plan.md` để chốt rõ: VM riêng cho worker giúp ingest/processing, còn playback scale lớn cần phase edge/cache riêng.
- Thêm topology worker riêng vận hành được thật: `docker-compose.video-worker.yml`, `.env.video-worker.example`, `deploy-video-worker.sh`, và profile `video-worker` trong production compose để app VM có thể tắt local worker bằng `ENABLE_LOCAL_VIDEO_WORKER=false` khi đã chuyển ingest sang VM riêng.
- Thêm architecture note `docs/architecture/2026-03-19-media-domain-edge-auth-plan.md` để chốt hướng scale playback tiếp theo: media custom domain trên R2, edge auth, cache key không phân mảnh theo token, và backend ra khỏi hot path segment delivery.
- Thêm spec `docs/superpowers/specs/2026-03-19-media-domain-edge-auth-design.md` và runbook `docs/runbooks/CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md` để phase `custom media domain + edge auth` có thể handoff trực tiếp cho team Cloudflare/backend.
- Backend adaptive playback giờ đã có feature flag cho phase media domain: khi đặt `VIDEO_MEDIA_DOMAIN` + `VIDEO_EDGE_AUTH_MODE=media_hmac_query` + `VIDEO_EDGE_HMAC_SECRET`, manifest object URLs có thể được rewrite sang media domain trực tiếp với token dạng `verify=<timestamp>-<base64mac>` tương thích Cloudflare timed HMAC; nếu thiếu hoặc sai config thì playback tự fallback về backend `/object` path hiện tại.
- Thêm Worker fallback template cho Cloudflare Free ở `cloudflare/workers/media-edge-auth-worker.js` cùng `wrangler.media-edge-auth.example.toml`, để validate cùng token `verify` mà backend đang sinh và đọc object trực tiếp từ bucket `lms-storage`.
- Bổ sung runbook setup/cutover cho production:
  - `docs/runbooks/CLOUDFLARE_R2_VIDEO_SETUP.md`
  - `docs/runbooks/VIDEO_R2_SHAKA_CUTOVER_CHECKLIST.md`

 - Production edge-auth rollout da duoc xac nhan end-to-end tren `media.holilihu.online`: request khong token tra `403`, con HLS/DASH signed media object request tra `200` qua Worker custom domain.
 - Va root cause media-domain rewrite: Shaka ghi media references theo package-root `segments/...`, khong nam duoi `hls/` hay `dash/`, nen backend da chuyen sang resolve `segments/...` ve `video-packages/{assetId}/segments/...` de tranh `404 Object not found`.
 - Da chay controlled production playback load batch sau cutover edge auth: health van `UP`, manifest/backend-control-plane va media-domain data-plane deu co baseline moi de team dung cho tuning va load-test phase sau.
 - Da bo sung them batch distributed playback tu hai origin (`local + dedicated worker VM`) voi fresh signed URLs; media-domain HLS object da giu duoc khoang `1441 req/s` o muc `100 + 100` conns va khoang `2826 req/s` o muc `200 + 200` conns trong khi app health van `UP`.
 - Giu lai `scripts/run-distributed-scenario.ps1` lam helper chinh thuc cho burst playback distributed, va loai bo helper thu nghiem khong on dinh de repo de van hanh hon.

### Video / Authoring

- Luá»“ng section video Ä‘Æ°á»£c siáº¿t thÃªm Ä‘á»ƒ `videoAssetId` trá»Ÿ thÃ nh source of truth:
  - validate asset thuá»™c quyá»n truy cáº­p cá»§a teacher/admin Ä‘ang thao tÃ¡c
  - tá»± Ä‘á»™ng loáº¡i bá» `videoUrl`, `videoType`, `streamVideoUid`, `cfObjectKey` khi Ä‘Ã£ cÃ³ asset
  - cháº·n gÃ¡n `streamVideoUid` thá»§ cÃ´ng cho luá»“ng táº¡o má»›i
- `POST /api/v3/sections/{sectionId}/video` nay tráº£ `410 Gone` Ä‘á»ƒ retire upload tháº³ng lÃªn Stream vÃ  buá»™c quay vá» asset pipeline chuáº©n.

- Thêm nền `video_assets`, `video_renditions`, `video_ingest_jobs` để chuẩn hóa video pipeline:
  - source master từ upload xác nhận
  - playback online qua Cloudflare Stream nếu khả dụng
  - profile ngoại tuyến riêng của LMS (`SAVER`, `STANDARD`, `HIGH`, `ORIGINAL`)
- Thêm `VideoAssetControllerV3` cho:
  - tạo asset từ upload đã xác nhận
  - xem trạng thái asset
  - retry ingest
- Thêm ingest pipeline nền:
  - pull binary từ storage hiện tại
  - probe bằng `ffprobe`
  - sinh rendition bằng `ffmpeg`
  - đẩy master/rendition về storage
  - gắn stream UID/playback URL nếu Cloudflare Stream khả dụng
- `VIDEO section` trong course authoring nay đi theo luồng:
  - presigned upload
  - `POST /api/v3/video-assets/from-upload`
  - lưu `videoAssetId` vào section payload
  - không còn dùng frontend direct call `uploadStreamVideo(...)` cho luồng tạo mới
- Enrich draft/published section content bằng metadata asset:
  - `videoAssetId`
  - `videoProcessingStatus`
  - `videoSourceKind`
  - `availableOfflineProfiles`
  - legacy `videoUrl` / `streamVideoUid` vẫn được fill làm fallback read-path
- `SectionVideoControllerV3` nay hỗ trợ asset-backed section cho:
  - play URL
  - download URL theo grouped profile
  - quality/profile sizes
  - unlink asset khỏi section mà không xóa mù stream media toàn cục
- Shared `app-video-upload` được kéo sang cùng pipeline asset để tránh tái sử dụng luồng upload video trực tiếp cũ trong tương lai.
- Trang `Thông tin khóa học` được ghi rõ `Video giới thiệu` hiện là liên kết preview công khai, không phải lesson video pipeline mới.

### Learner / Quiz

- Sửa guard truy cập `section quiz` để không chặn student trong khóa học `FREE`.
- Cho phép truy cập khi student có enrollment hợp lệ (`ACTIVE` hoặc `COMPLETED`) dù không đi qua payment flow.
- Sửa learner quiz renderer để hiểu `contentBlocks.data.content`, không còn vào `quiz/take` rồi trắng nội dung câu hỏi/đáp án.
- Chuẩn hóa metadata assessment cho quiz:
  - `PRACTICE`
  - `ASSESSMENT`
  - `EXAM`
- Chỉ cho phép `PRACTICE` tải và nộp offline; `ASSESSMENT` và `EXAM` là online-only.
- Route `/teacher/quiz/create` không còn tạo quiz qua legacy course/class path; nay là hub điều hướng sang flow lesson quiz hoặc assignment assessment.
- Gắn certificate issuance với rule:
  - phải hoàn thành 100%
  - phải pass mọi `EXAM` có `countsTowardCertificate = true`

### PWA / Publication / Sync

- Thêm `course_publications` làm learner-facing source of truth cho course đã publish.
- Thêm `draftChangeStatus` cho course shell để tách draft workflow khỏi publication đang live.
- Kích hoạt `learning_classes.courseVersionId` và `versionMode` (`PINNED` / `FOLLOW_LATEST`) cho class.
- Tách teacher draft content query khỏi learner/public course query.
- Chuẩn hóa offline package metadata theo publication:
  - `publicationId`
  - `publicationNumber`
  - `versionModeSnapshot`
  - `staleReason`
- Mở rộng sync contract cho offline queue:
  - `clientOperationId`
  - `occurredAt`
  - `courseId`
  - `publicationId`
  - `entityId`
  - `baseServerUpdatedAt`
- `sync/pull` trả thêm snapshot tối thiểu cho `courseStates`, `lessonProgress`, `videoProgress`, `quizAttempts`, và `conflicts`.
- Frontend offline sync nay `push` xong sẽ `pull` progress/server state về local cache để hòa giải lesson progress, video progress, và stale flag cho package `PINNED`.
- Refresh stale package nay giữ lại tiến trình hợp lệ, rebinding lại sync queue theo `publicationId` mới, và giữ `downloadOptions` cũ khi tải lại.
- Nếu refresh stale package thất bại giữa chừng, client sẽ restore lại snapshot gói cũ thay vì để người học rơi vào trạng thái mất package.
- Learner shell và route `quiz/take` nay chặn `ASSESSMENT`/`EXAM` khi người học đang dùng gói ngoại tuyến stale; UI dẫn thẳng về trang `Lưu trữ ngoại tuyến` để cập nhật.
- Gom copy/policy `stale package` về helper dùng chung cho learner shell, storage page, và quiz taking để giảm drift giữa các luồng.
- Chuẩn hóa `/student/storage` thành trung tâm điều khiển ngoại tuyến theo thiết bị thay vì chỉ là trang liệt kê dữ liệu đã tải.
- Thêm `OfflineDeviceSettingsService` cho:
  - chất lượng video mặc định
  - giới hạn tải xuống theo kết nối
  - tự đồng bộ khi có mạng
  - dấu mốc xin persistence / đồng bộ thủ công
- Download dialog và course download flow nay tôn trọng setting thiết bị, thay vì hardcode `720p`.
- Auto-sync khi reconnect nay tôn trọng setting theo thiết bị; người học vẫn có thể ép `Đồng bộ ngay` thủ công từ trang lưu trữ.
- Hardening lỗi hỏng `IndexedDB`/backing store cho PWA:
  - thêm health state cho kho ngoại tuyến
  - recovery ladder `reopen -> recreate same DB -> rotate DB name -> online-only`
  - thêm action `Đặt lại bộ nhớ ngoại tuyến` trên `/student/storage`
  - thêm telemetry client-side cục bộ không phụ thuộc `IndexedDB` và nút `Sao chép chẩn đoán` cho QA/support
- Giảm log nhiễu của PWA/AI runtime:
  - `navigator.storage.persist()` bị từ chối không còn spam console như lỗi
  - `Đặt lại bộ nhớ ngoại tuyến` nay thử thêm nhánh đổi DB name mới nếu reset bằng tên mặc định vẫn kẹt
  - Wiii iframe chỉ được mount khi panel thật sự mở, và bị ẩn trên các màn admin vận hành như `offline-storage`, `settings`, `logs`
  - toast fallback online-only nay hướng rõ người học vào `Lưu trữ ngoại tuyến` để reset và tải lại gói nếu cần
- Thêm ingest telemetry V1 cho lỗi offline storage:
  - `POST /api/v3/client-telemetry/offline-storage` cho client gửi best-effort các event `recreate-failed`, `disabled`, `manual-reset`
  - `GET /api/v3/admin/client-telemetry/offline-storage` cho `ADMIN` tra cứu log gần đây theo user/event type
  - lưu log vào bảng `offline_storage_telemetry` để QA/admin không còn phụ thuộc hoàn toàn vào clipboard cục bộ
- Thêm UI `ADMIN-only` cho telemetry offline storage:
  - route `/admin/offline-storage`
  - sidebar mục `Bộ nhớ ngoại tuyến` trong nhóm `Hệ thống`
  - bảng log có filter theo `eventType` và tìm theo email/tên người dùng
  - panel chi tiết hiển thị `dbName`, `requiresRedownload`, `errorName`, `userAgent`, và payload chẩn đoán
- Thêm analytics nhẹ cho màn `ADMIN` offline storage telemetry:
  - endpoint `GET /api/v3/admin/client-telemetry/offline-storage/analytics`
  - summary cards cho `totalEvents`, `affectedUsers`, `online-only`, `requiresRedownload`
  - trend `7/14/30 ngày`
  - `topRoutes` và `topPlatforms`
- Chuan hoa analytics telemetry offline storage tren production:
  - gom label `Win32` / `windows` thanh `Windows`
  - bo sung `topBrowsers`
  - bo sung `normalizedPlatform` va `browserFamily` cho tung dong log admin
- Recover production VM sau incident deploy bang cach reset instance va redeploy tuan tu `backend -> frontend`, tranh build dong thoi gay nghen health check.

### Tài liệu

- Dựng lại trục tài liệu chuẩn theo hướng Việt-first.
- Thêm `CONTRIBUTING.md`, nhóm `docs/reference/`, và `docs/runbooks/`.
- Làm sạch docs index, tách rõ tài liệu chuẩn, tài liệu working, và tài liệu historical.
- Thêm spec `docs/superpowers/specs/2026-03-16-learner-quiz-policy-normalization.md`.
- Thêm spec `docs/superpowers/specs/2026-03-16-admin-offline-storage-telemetry-ui-design.md`.
- Thêm spec `docs/superpowers/specs/2026-03-16-admin-offline-storage-telemetry-analytics-light.md`.
- Rewrite `docs/architecture/STREAMING_PWA_ROADMAP.md` theo truth pass, không overclaim PWA/offline đã hoàn tất.
- Thêm canonical spec `docs/architecture/2026-03-16-course-publication-pwa-sync-model.md`.
- Thêm runbook:
  - `docs/runbooks/PWA_OFFLINE_RUNBOOK.md`
  - `docs/runbooks/PUBLICATION_REFRESH_RUNBOOK.md`
  - `docs/runbooks/SYNC_CONFLICT_RUNBOOK.md`

### Runtime verification

- Production smoke Phase A-E da PASS cho:
  - deploy V91 + V92
  - self-paced flow
  - canonical student enrollment va certificate endpoints
  - canonical instructor-led class listing
  - offline policy metadata
  - sync push contract co ban
- Xac nhan cac `403` duoc bao truoc do la do test nham legacy path, khong phai production regression.

## [2026-03-15]

### Thêm

- Bổ sung spec triển khai video adaptive streaming theo section ở `docs/architecture/2026-03-15-adaptive-video-v1-implementation-plan.md`.

### Cải thiện

- Làm sạch kho tài liệu và xóa bộ export trùng lặp của investigation PWA.

## [2026-03-14]

### Payment / Payout

- Hoàn thiện kiểm soát payment completion, revoke access sau refund, payout guardrails, và soft-cancel payout.
- Chuẩn hóa message `Đã hủy` cho payout teacher/admin.
- Sửa malformed JSON ở login để trả `400` thay vì `500`.

## [2026-03-12] - [2026-03-13]

### Authoring / Learner

- Hardening các luồng curriculum section-level quiz.
- Sửa create/edit question với `text + formula + image`.
- Ổn định learner embedded quiz, media section, và các regression liên quan.

## [2026-03-04]

### Upload / Course Editor

- Nâng cấp upload system sang flow presigned URL 3 bước.
- Redesign course info page và cải thiện course editor consistency.

## Ghi chú cập nhật

- Chỉ ghi các thay đổi có tác động đến hành vi hệ thống, vận hành, docs chuẩn, hoặc trải nghiệm người dùng.
- Nếu thay đổi lớn nhưng vẫn đang trong quá trình triển khai, ghi vào `Chưa phát hành`.
- Mỗi thay đổi runtime quan trọng nên cập nhật cả `CHANGELOG.md` và tài liệu chuẩn tương ứng trong `docs/`.
