# Dedicated Video Worker Runbook

Last updated: 2026-03-19

Runbook này dành cho lúc muốn tách ingest/video processing khỏi app VM chính.

## Khi nào nên dùng

Dùng khi:

- teacher upload video thường xuyên
- `upload -> READY` đang chậm vì `ffmpeg`
- muốn web/API ổn định hơn khi có transcode dài

Không coi đây là lời giải cuối cho concurrent playback lớn. VM riêng cho worker giúp ingest/processing, không tự đưa backend ra khỏi hot path của playback.

## VM khuyến nghị

Khởi đầu hợp lý:

- `4 vCPU / 8 GB RAM`

Nếu dự kiến nhiều video dài `1080p` hoặc muốn quay dần từ `superfast` về `veryfast`:

- `8 vCPU / 16 GB RAM`

## Chuẩn bị trên app VM chính

1. Mở `.env.prod`.
2. Đặt:

```env
ENABLE_LOCAL_VIDEO_WORKER=false
```

3. Redeploy app VM:

```bash
chmod +x deploy.sh
./deploy.sh
```

Lưu ý: chỉ làm bước này sau khi worker VM riêng đã sẵn sàng hoặc trong cùng cửa sổ rollout.

## Blocker hạ tầng hiện tại

Hiện production DB vẫn đang chạy trong Docker topology của app VM và không public ra ngoài host theo mặc định.

Nghĩa là worker VM riêng sẽ chưa nối DB được nếu chưa mở một đường private hợp lệ.

Hai hướng đúng:

1. Tạm thời mở PostgreSQL trên private IP của app VM và chỉ cho phép worker VM truy cập.
2. Sạch hơn về lâu dài: chuyển DB sang Cloud SQL hoặc một private DB endpoint riêng.

Không mở `5432` public ra Internet.

## Chuẩn bị trên worker VM

1. Clone repo hoặc copy revision đang chạy production.
2. Tạo env:

```bash
cp .env.video-worker.example .env.video-worker
```

3. Điền các giá trị tối thiểu:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://<private-db-host>:5432/lms?sslmode=disable
SPRING_DATASOURCE_USERNAME=lms
SPRING_DATASOURCE_PASSWORD=<same production password>

JWT_SECRET=<same production JWT secret>
JWT_EXPIRATION=86400000
JWT_REFRESH_EXPIRATION=604800000

APP_BASE_URL=https://holilihu.online
APP_CORS_ORIGINS=https://holilihu.online

CLOUDFLARE_R2_ENABLED=true
CLOUDFLARE_R2_ACCOUNT_ID=<same production account id>
CLOUDFLARE_R2_ACCESS_KEY=<same production access key>
CLOUDFLARE_R2_SECRET_KEY=<same production secret key>
CLOUDFLARE_R2_BUCKET=lms-cdn
CLOUDFLARE_R2_VIDEO_BUCKET=lms-storage
CLOUDFLARE_R2_PUBLIC_URL=https://cdn.holilihu.online

VIDEO_INGEST_ENABLED=true
VIDEO_FFMPEG_PRESET=superfast
VIDEO_WORKER_CPU_LIMIT=3.0
VIDEO_WORKER_MEMORY_LIMIT=3072M
VIDEO_WORKER_MEMORY_RESERVATION=2048M
```

Nếu worker VM đi qua private DB forwarder trên app VM, `sslmode=disable` là bắt buộc trừ khi chính hop đó terminate PostgreSQL SSL.

## Deploy worker VM

```bash
chmod +x deploy-video-worker.sh
./deploy-video-worker.sh
```

Nếu dùng file env khác:

```bash
./deploy-video-worker.sh .env.video-worker
```

## Kiểm tra sau deploy

```bash
docker compose --env-file .env.video-worker -f docker-compose.video-worker.yml ps
docker compose --env-file .env.video-worker -f docker-compose.video-worker.yml logs video-worker --tail=100
```

Kỳ vọng:

- container `video-worker` ở trạng thái `healthy`
- worker log có scheduler poll job
- khi upload asset mới, trạng thái tiến tới `PROCESSING` rồi `READY`

## Smoke ingest

Từ máy có quyền gọi production API, có thể dùng:

```powershell
powershell -File scripts/prod-video-smoke.ps1
```

Hoặc chạy manual:

1. `upload/init`
2. upload parts hoặc single direct-to-R2
3. `upload/confirm`
4. `POST /api/v3/video-assets/from-upload`
5. theo dõi asset tới `READY / READY`

## Rollback nhanh

Nếu worker VM riêng gặp sự cố:

1. Trên app VM chính đặt lại:

```env
ENABLE_LOCAL_VIDEO_WORKER=true
```

2. Redeploy app VM:

```bash
./deploy.sh
```

3. Điều tra worker riêng sau.

## Ghi chú vận hành

- Worker phải có egress ra internet/R2; không nhốt nó vào network chỉ `internal`.
- `SPRING_DATASOURCE_URL` nên đi qua private IP/VPN nếu hạ tầng cho phép.
- Nếu app VM dùng `socat` để forward PostgreSQL cho worker VM, đừng hardcode Docker IP như `172.19.x.x` vào systemd service. Hãy dùng một wrapper script hoặc `docker inspect` động để resolve IP hiện tại của `lms-db-1`, nếu không worker sẽ gãy ngay sau khi DB container đổi IP.
- Nếu DB vẫn nằm trong app VM hiện tại, rollout worker riêng chỉ nên bắt đầu sau khi đã có private DB path cho VM mới.
- Dùng cùng DB và cùng R2 buckets với app chính.
- Tách worker riêng giúp `upload -> READY` và throughput ingest tốt hơn, nhưng không phải lời giải cuối cho bài toán nhiều learner cùng xem một video. Phase đó vẫn cần custom media domain + edge auth.
