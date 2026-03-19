# Spec: Khôi phục lỗi hỏng bộ nhớ ngoại tuyến PWA

> Ngày: 2026-03-16  
> Trạng thái: Đã implement local, build xanh  
> Phạm vi: Frontend PWA / IndexedDB / `/student/storage`

## Bối cảnh

Trong thực tế, bộ nhớ ngoại tuyến của trình duyệt có thể bị hỏng hoặc mở không được, đặc biệt khi:

- người dùng tự xóa một phần dữ liệu profile của trình duyệt
- browser gặp lỗi `IndexedDB` backing store
- migration hoặc upgrade cũ để lại trạng thái không nhất quán

Console log điển hình:

- `UnknownError: Internal error opening backing store for indexedDB.open`
- `Dexie: Workaround for Chrome UnknownError on open()`
- `Offline cache unavailable ... Falling back to online-only mode`

Đây là failure mode thật của hệ offline, không nên coi là lỗi hiếm rồi bỏ qua.

## Mục tiêu

- Không để app chỉ có một bước `delete same DB` rồi chịu thua.
- Tự cứu tối đa trước khi rơi sang `online-only`.
- Cho người học một đường thoát rõ ràng trên UI.
- Không yêu cầu người học đụng vào file hệ thống hay thư mục profile của browser.

## Quyết định triển khai

### 1. Health state cho kho ngoại tuyến

Thêm snapshot runtime cho trạng thái bộ nhớ ngoại tuyến:

- `ready`
- `recovering`
- `online-only`

Metadata đi kèm:

- `dbName`
- `lastRecoveryAction`
- `requiresRedownload`
- `lastErrorName`
- `lastErrorMessage`
- `updatedAt`

### 2. Recovery ladder

Khi `IndexedDB.open()` lỗi recoverable, client đi theo thứ tự:

1. thử mở lại theo flow hiện tại
2. xóa DB cùng tên và tạo lại
3. nếu vẫn lỗi, xoay sang một DB name mới sạch
4. chỉ khi tất cả đều fail mới rơi sang `online-only`

Điều này xử lý được case backing store hỏng nhưng browser vẫn không mở nổi DB cũ ngay cả sau `deleteDatabase()`.

### 3. Reset thủ công trên UI

Trang `/student/storage` phải có action:

- `Đặt lại bộ nhớ ngoại tuyến`

Action này:

- xóa toàn bộ DB ngoại tuyến đã biết
- dọn cache offline liên quan
- tạo lại DB sạch
- giữ hệ thống ở trạng thái sẵn sàng tải lại gói mới

Thông điệp phải rõ:

- dữ liệu offline cục bộ sẽ bị xóa
- dữ liệu đã sync trên server không bị xóa
- người học có thể phải tải lại khóa học và video

### 4. Copy UX rõ nghĩa

Không dùng một câu chung cho mọi lỗi.

Các trạng thái chính:

- đang tự kiểm tra lại bộ nhớ ngoại tuyến
- bộ nhớ ngoại tuyến đã được tự khôi phục
- bộ nhớ ngoại tuyến đã được đặt lại
- bộ nhớ ngoại tuyến đang tạm không dùng được

## Thay đổi đã implement

### DB runtime

File: `fe/src/app/core/db/lms-offline.db.ts`

- thêm health snapshot runtime
- lưu active DB name trong `localStorage`
- nhớ danh sách DB names đã dùng
- thêm `resetOfflineStorage()`
- thêm `subscribeOfflineStorageHealth(...)`
- thêm recovery step `rotate DB name`
- khi lỗi nặng, mới fallback `online-only`

### Service

File: `fe/src/app/core/services/offline-storage-health.service.ts`

- bridge runtime health sang Angular signals
- expose action reset cho UI

### UI storage center

Files:

- `fe/src/app/features/student/storage/student-storage-management.component.ts`
- `fe/src/app/features/student/storage/student-storage-management.component.html`

Đã thêm:

- recovery card đầu trang
- nút `Đặt lại bộ nhớ ngoại tuyến`
- action chuyển sang danh sách khóa học sau khi đã reset xong
- danger-zone có reset riêng ngoài action xóa toàn bộ

### Copy fallback

File: `fe/src/app/core/services/course-download.service.ts`

Khi offline DB không dùng được, toast giờ hướng người dùng vào:

- `Lưu trữ ngoại tuyến`
- reset bộ nhớ
- tải lại khóa học nếu cần

## Hành vi mong đợi

### Case A: lỗi nhẹ, recreate cùng tên recover được

- app vẫn vào offline bình thường
- UI báo hệ thống đã tự khôi phục
- learner cần tải lại gói offline nếu muốn dùng lại

### Case B: recreate cùng tên thất bại, rotate DB name recover được

- app chuyển sang DB mới sạch
- không khóa cả session quá sớm
- UI báo cần tải lại khóa học

### Case C: cả recreate và rotate đều fail

- app fallback `online-only`
- learner vẫn học online được
- storage page có action reset rõ ràng

## Test matrix cần smoke

1. DB mở bình thường
2. same-name recreate recover được
3. same-name recreate fail nhưng rotate recover được
4. rotate fail, app rơi `online-only`
5. reset bằng UI xong, learner tải lại course được
6. stale package + DB corruption cùng lúc vẫn hiển thị copy rõ

## Lưu ý vận hành

- Không hướng user tự vào thư mục profile để xóa lẻ file.
- Nếu cần support, ưu tiên:
  1. vào `/student/storage`
  2. bấm `Đặt lại bộ nhớ ngoại tuyến`
  3. tải lại khóa học
- Chỉ dùng browser `Clear site data` khi reset trong app không recover được.
