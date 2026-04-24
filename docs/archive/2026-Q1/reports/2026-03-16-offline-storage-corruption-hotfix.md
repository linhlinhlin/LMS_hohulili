# Production Report: Offline Storage Corruption Hotfix

> **Date**: 2026-03-16  
> **Environment**: Production (`https://holilihu.online`)  
> **Operator**: Codex  
> **Status**: Deploy successful, corruption fallback smoke passed

## Vấn đề gốc

Người dùng có thể rơi vào trạng thái `IndexedDB` bị hỏng hoặc không mở được, điển hình với log:

- `UnknownError: Internal error opening backing store for indexedDB.open`
- `Dexie: Workaround for Chrome UnknownError on open()`
- `Offline cache unavailable ... Falling back to online-only mode`

Đây có thể xảy ra khi:

- browser bị lỗi backing store
- dữ liệu site bị xóa không trọn vẹn
- người dùng hoặc môi trường thử nghiệm can thiệp trực tiếp vào file storage của trình duyệt

## Thay đổi đã deploy

### Recovery ladder cho IndexedDB

File:

- `fe/src/app/core/db/lms-offline.db.ts`

Flow mới:

1. thử mở DB như bình thường
2. nếu lỗi recoverable, xóa DB cùng tên và tạo lại
3. nếu vẫn lỗi, rotate sang DB name mới
4. chỉ sau khi các bước trên đều fail mới fallback `online-only`

### Health state cho offline storage

File:

- `fe/src/app/core/services/offline-storage-health.service.ts`

State runtime:

- `ready`
- `recovering`
- `online-only`

### UI recovery trên `/student/storage`

Files:

- `fe/src/app/features/student/storage/student-storage-management.component.ts`
- `fe/src/app/features/student/storage/student-storage-management.component.html`

Đã thêm:

- card cảnh báo recovery / online-only
- card `Chẩn đoán bộ nhớ ngoại tuyến`
- action `Đặt lại bộ nhớ ngoại tuyến`
- action `Mở danh sách khóa học` sau khi reset xong
- nút reset riêng trong vùng thao tác nguy hiểm
- nút `Sao chép chẩn đoán` để QA / support lấy payload cục bộ
- nút `Xóa lịch sử` để dọn log chẩn đoán trên thiết bị

### Copy fallback rõ hơn

File:

- `fe/src/app/core/services/course-download.service.ts`

Toast fallback nay hướng rõ người dùng vào:

- `Lưu trữ ngoại tuyến`
- reset bộ nhớ
- tải lại khóa học nếu cần

## Deploy

- Copy patch trực tiếp lên clone production: `/home/Admin/LMS_hohulili`
- Chạy deploy chuẩn trên server:

```bash
./deploy.sh
```

Kết quả:

- backend healthy
- frontend healthy
- caddy healthy
- `GET /actuator/health` trả `{"status":"UP"}`

## Smoke production

### 1. Health

- `GET https://holilihu.online/actuator/health` -> `200`

### 2. Storage route bình thường

Route:

- `/student/storage`

Quan sát:

- trang render đúng control center mới
- có các block:
  - `Lưu trữ ngoại tuyến`
  - `Chất lượng video mặc định`
  - `Chỉ tải khi có Wi‑Fi`
  - `Tự đồng bộ khi có mạng`
  - `Giữ bộ nhớ lâu dài`
  - `Đồng bộ ngay`

### 3. Smoke mô phỏng corruption

Phương pháp:

- dùng Playwright
- monkey-patch `indexedDB.open` ngay từ đầu browser context để ném `UnknownError`
- login bằng student account
- mở `/student/storage`

Console quan sát được:

- `IndexedDB open failed. Resetting offline cache database`
- `IndexedDB recreate on same name failed. Rotating database name`
- `Offline cache unavailable for this browser session. Falling back to online-only mode`

UI quan sát được:

- card `Bộ nhớ ngoại tuyến đang tạm không dùng được`
- card `Chẩn đoán bộ nhớ ngoại tuyến`
- copy giải thích learner vẫn có thể học online
- nút `Đặt lại bộ nhớ ngoại tuyến`
- nút `Sao chép chẩn đoán`

### 4. Smoke sao chép chẩn đoán

Phương pháp:

- tiếp tục dùng browser context mô phỏng `UnknownError`
- bấm nút `Sao chép chẩn đoán`
- đọc clipboard

Kết quả:

- clipboard có payload JSON
- payload chứa `generatedAt`
- payload chứa `UnknownError`
- payload có `health` và `events` để QA/support gửi lại cho dev

Điểm này xác nhận production không còn fail im lặng; fallback đã được surfacing đúng trên UI.

## Kết luận

Batch hotfix này đã giải quyết đúng lớp lỗi:

- corruption/backing-store failure của IndexedDB
- recovery không còn dừng quá sớm ở `delete same DB`
- learner có đường thoát rõ trên UI

## Phần chưa claim quá mức

- Chưa có automated test đầy đủ cho mọi biến thể corruption của từng browser.
- Chưa có telemetry server-side cho lỗi storage corruption; hiện chủ yếu dựa vào client console/runtime state.
- Structured telemetry hiện mới ở client-side local storage; chưa đẩy lên backend ingest.
- Chưa smoke trên thiết bị mobile thật với dữ liệu offline lớn.

## Bằng chứng cục bộ

- `E:\Sach\Sua\LMS_hohulili\.tmp-storage-debug.png`
- `E:\Sach\Sua\LMS_hohulili\.tmp-storage-corruption-simulated.png`
