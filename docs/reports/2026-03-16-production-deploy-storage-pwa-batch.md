# Production Deploy Report: Storage + PWA Batch

> **Date**: 2026-03-16
> **Environment**: Production (`https://holilihu.online`)
> **Operator**: Codex
> **Status**: Deploy successful, primary smoke passed

## Scope deployed

- Student storage control center (`/student/storage`)
- Device-level offline settings
- Publication-aware offline sync and stale handling
- Stale package gating for assessment/exam
- Learner text/quiz rendering fixes already present in working tree

## Deploy method

- SSH to production host: `Admin@holilihu.online`
- Production clone: `/home/Admin/LMS_hohulili`
- Secrets source: existing server-side `.env.prod`
- Deploy command: `./deploy.sh`

## Notes during deploy

- Initial foreground deploy timed out from the client side while frontend production build was running on the VM.
- Frontend build (`ng build --configuration=production`) caused temporary high load on the server.
- Deploy was relaunched in background with log file:
  - `/tmp/lms-deploy-20260316.log`
- Existing server working-tree diff was backed up before overlaying the batch:
  - `/tmp/lms-deploy-backup/predeploy-working-tree.patch`

## Final deploy result

- Backend container recreated and healthy
- Frontend container recreated and healthy
- Caddy healthy
- PostgreSQL healthy
- Public health endpoint returned `{"status":"UP"}`

## Production smoke

### Health

- `GET https://holilihu.online/actuator/health` -> `200`, body `{"status":"UP"}`

### Core authenticated student APIs

- `POST /api/v3/auth/login` -> `200`
- `GET /api/v3/auth/me` -> `200`, role `STUDENT`
- `GET /api/v3/student/courses/enrolled` -> `200`
- `GET /api/v3/student/certificates` -> `200`
- `GET /api/v3/courses?page=0&size=3` -> `200`

### Learner UI route verification

#### 1. Lesson route previously affected by mojibake

Verified route:

- `/student/learn/course/4494267a-756c-4be1-80d7-ca4f8f6f94c8/lesson/3846db3e-79e8-4e25-a08f-6f911c3d08d0`

Observed:

- No mojibake strings like `Tá»•ng quan`, `Ghi chÃº`, `LÃ m bÃ i tráº¯c nghiá»‡m`
- UI now renders:
  - `Tổng quan`
  - `Ghi chú`
  - `Tài liệu`
  - `Bài kiểm tra`
  - `Online-only`
  - `Làm bài trắc nghiệm`

#### 2. Quiz take route previously affected by blank question content

Verified route:

- `/student/quiz/take/9e3ac424-4346-43e9-ae83-85d3b0dddc47?...`

Observed:

- Question text renders correctly
- Options render correctly
- No blank `Câu hỏi 1 / A B C D` placeholder-only state
- Sample rendered content included:
  - `Suc chua xuong cuu sinh toi thieu la?`
  - `Hypothermia la gi?`
  - `EPIRB la thiet bi gi?`

### Student storage UI

Verified route:

- `/student/storage`

Observed blocks present on production:

- `Lưu trữ ngoại tuyến`
- `Tổng quan dung lượng`
- `Thiết lập ngoại tuyến trên thiết bị này`
- `Chất lượng video mặc định`
- `Chỉ tải khi có Wi‑Fi`
- `Tự đồng bộ khi có mạng`
- `Yêu cầu giữ dữ liệu lâu dài`
- `Đồng bộ ngay`

Evidence screenshot captured locally at:

- `E:\Sach\Sua\LMS_hohulili\.tmp-storage-smoke.png`

## Residual notes

- Some course/quiz content still appears without Vietnamese diacritics in the underlying seeded content, for example `Kiem tra chuong 1`. This is not mojibake; it is content data entered without accents.
- This deploy used the production clone working tree directly and did not create a clean git commit on the server.
- The production clone remains dirty after deploy because the deployed batch has not yet been committed/pushed through the normal git flow.

## Recommended next checks

1. Manual smoke on `/student/storage`:
   - change default video quality
   - toggle `Chỉ tải khi có Wi‑Fi`
   - toggle `Tự đồng bộ khi có mạng`
   - press `Đồng bộ ngay`
2. Manual smoke for stale package refresh
3. Manual smoke for stale `ASSESSMENT/EXAM` gating
4. Follow-up git hygiene:
   - commit the batch cleanly
   - push
   - reset production clone back to a tracked revision after release process is finalized
