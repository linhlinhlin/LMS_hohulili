# Runbooks

Runbook là tài liệu thao tác thực chiến.

Đọc nhóm này khi cần:

- biết sau deploy phải smoke test gì
- reset PWA / service worker ra sao
- xử lý stale package, refresh package, và sync conflict
- kiểm tra learner flow, payment flow, và rollout publication

## Runbook hiện có

- `PRODUCTION_SMOKE_TEST.md`
- `DEDICATED_VIDEO_WORKER_RUNBOOK.md`
- `CLOUDFLARE_R2_VIDEO_SETUP.md`
- `CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md`
- `VIDEO_R2_SHAKA_CUTOVER_CHECKLIST.md`
- `PHASE_B_PUBLICATION_PWA_CHECKLIST.md`
- `PWA_OFFLINE_RUNBOOK.md`
- `OFFLINE_STORAGE_CORRUPTION_RUNBOOK.md`
- `PUBLICATION_REFRESH_RUNBOOK.md`
- `SYNC_CONFLICT_RUNBOOK.md`
- `PAYMENT_PAYOUT_RUNBOOK.md`
- `LEARNER_FLOW_RUNBOOK.md`

## Cách đọc theo thứ tự

Nếu team đang làm publication / PWA / offline:

1. `PHASE_B_PUBLICATION_PWA_CHECKLIST.md`
2. `PWA_OFFLINE_RUNBOOK.md`
3. `OFFLINE_STORAGE_CORRUPTION_RUNBOOK.md`
4. `PUBLICATION_REFRESH_RUNBOOK.md`
5. `SYNC_CONFLICT_RUNBOOK.md`

Nếu team đang kiểm tra production tổng quát:

1. `PRODUCTION_SMOKE_TEST.md`
2. runbook theo luồng cụ thể

Nếu team đang rollout hoặc kiểm tra video production:

1. `CLOUDFLARE_R2_VIDEO_SETUP.md`
2. `VIDEO_R2_SHAKA_CUTOVER_CHECKLIST.md`
3. `DEDICATED_VIDEO_WORKER_RUNBOOK.md` nếu muốn tách ingest khỏi app VM
4. `CLOUDFLARE_MEDIA_DOMAIN_EDGE_AUTH_RUNBOOK.md` nếu muốn scale concurrent playback
5. `PRODUCTION_SMOKE_TEST.md`
6. `PUBLICATION_REFRESH_RUNBOOK.md` nếu video mới được gắn vào course đã `APPROVED`
