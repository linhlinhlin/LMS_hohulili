# Video Progress Tracking System

Hệ thống theo dõi tiến độ xem video với quy tắc 75% completion để quản lý học tập.

## 🎯 Tính năng

- ✅ Theo dõi tiến độ xem video real-time
- ✅ Quy tắc 75%: Phải xem ít nhất 75% video mới hoàn thành bài học
- ✅ Khóa bài học tiếp theo cho đến khi hoàn thành 75%
- ✅ Resume từ vị trí đã xem lần trước
- ✅ Hiển thị progress overlay trên video player
- ✅ Tích hợp Video.js (FREE, không cần API key)

## 📁 Files đã tạo

### Backend (Java Spring Boot)

1. **Database Migration**
   - `api/src/main/resources/db/migration/V1_2__create_video_progress_table.sql`
   - Tạo bảng `video_progress` với các fields:
     - `user_id`, `section_id`: Foreign keys
     - `current_time`, `duration`: Thời gian xem (seconds)
     - `progress_percentage`: DECIMAL(5,2) - 0.00 đến 100.00
     - `completed`: Boolean - tự động = true khi >= 75%
     - `completion_date`: Timestamp

2. **Entity**
   - `api/src/main/java/com/example/lms/entity/VideoProgress.java`
   - Method quan trọng: `updateProgress(currentTime, duration)`
   - Tự động đánh dấu `completed = true` khi progress >= 75%

3. **Repository**
   - `api/src/main/java/com/example/lms/repository/VideoProgressRepository.java`
   - Queries: `isVideoCompleted()`, `getProgressPercentage()`, `countCompletedVideosInCourse()`

4. **Service**
   - `api/src/main/java/com/example/lms/service/VideoProgressService.java`
   - Method quan trọng:
     - `trackProgress()`: Lưu tiến độ xem
     - `canProceedToNextLesson()`: Kiểm tra quy tắc 75%
     - `isVideoCompleted()`: Check hoàn thành

5. **Controller**
   - `api/src/main/java/com/example/lms/controller/VideoProgressController.java`
   - 5 REST endpoints:
     - `POST /api/v1/video-progress/track` - Lưu tiến độ
     - `GET /api/v1/video-progress/{sectionId}` - Lấy tiến độ
     - `GET /api/v1/video-progress/my-progress` - Lấy tất cả tiến độ
     - `GET /api/v1/video-progress/{sectionId}/can-proceed` - Kiểm tra quy tắc 75%
     - `DELETE /api/v1/video-progress/{sectionId}` - Reset tiến độ

### Frontend (Angular)

1. **API Client**
   - `fe/src/app/api/client/video-progress.api.ts`
   - Service để gọi backend APIs

2. **Video Player Component**
   - `fe/src/app/shared/components/video-player-tracked/video-player-tracked.component.ts`
   - Tích hợp Video.js
   - Track progress mỗi 5 giây
   - Hiển thị progress overlay với circular progress bar
   - Resume từ vị trí đã xem

3. **Lesson Viewer Component (Example)**
   - `fe/src/app/features/student/lesson-viewer/lesson-viewer.component.ts`
   - Demo cách sử dụng video player tracked
   - Implement 75% completion gate
   - Khóa nút "Bài tiếp theo" cho đến khi đạt 75%

4. **Configuration**
   - `fe/angular.json`: Added Video.js CSS

## 🚀 Cài đặt

### 1. Backend Setup

**Khởi động lại backend để apply migration:**

```bash
cd api
./mvnw spring-boot:run
```

Kiểm tra log để confirm migration V1_2 đã chạy thành công:
```
Flyway Migration V1_2__create_video_progress_table.sql SUCCESS
```

### 2. Frontend Setup

**Video.js đã được cài đặt:**

```bash
cd fe
npm install  # Video.js đã có trong package.json
```

### 3. Verify Installation

**Test backend API:**
```bash
curl -X POST http://localhost:8088/api/v1/video-progress/track \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sectionId": "test-section-id",
    "currentTime": 120,
    "duration": 300
  }'
```

**Test frontend:**
Mở browser và truy cập lesson viewer component.

## 📖 Cách sử dụng

### 1. Trong Component của bạn

```typescript
import { VideoPlayerTrackedComponent } from 'path/to/video-player-tracked.component';

@Component({
  // ...
  imports: [VideoPlayerTrackedComponent]
})
export class YourComponent {
  videoUrl = 'https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/courses/video.mp4';
  sectionId = 'your-section-uuid';
}
```

```html
<app-video-player-tracked
  [videoUrl]="videoUrl"
  [sectionId]="sectionId"
  [autoplay]="false"
  [trackingInterval]="5000"
/>
```

### 2. Check 75% Rule trước khi cho phép tiếp tục

```typescript
private videoProgressApi = inject(VideoProgressApi);

checkCanProceed(sectionId: string): void {
  this.videoProgressApi.canProceedToNext(sectionId).subscribe(response => {
    if (response.success) {
      const canProceed = response.data.canProceed;
      const message = response.data.message;
      
      if (!canProceed) {
        // Disable "Next Lesson" button
        // Show message: "Watch 30% more to unlock next lesson"
      }
    }
  });
}
```

### 3. Resume từ vị trí đã xem

Component tự động load progress khi khởi tạo:

```typescript
ngOnInit(): void {
  // Tự động gọi getProgress() và seek đến vị trí đã xem
  this.loadExistingProgress();
}
```

## ⚙️ Configuration

### Tracking Interval

Mặc định track mỗi 5 giây. Thay đổi qua input:

```html
<app-video-player-tracked
  [trackingInterval]="3000"  <!-- Track mỗi 3 giây -->
/>
```

### 75% Threshold

Ngưỡng 75% được hardcode trong backend:

```java
// VideoProgress.java
if (!this.completed && progress >= 75.0) {
    this.completed = true;
    this.completionDate = LocalDateTime.now();
}
```

Để thay đổi, sửa trong file `VideoProgress.java` và restart backend.

## 🎨 UI Components

### Progress Overlay

Hiển thị ở góc phải trên video player:
- Circular progress bar (0-100%)
- Màu xanh khi >= 75%
- Message: "Cần xem X% nữa" hoặc "✓ Hoàn thành bài học"

### Locked Message

Khi chưa đạt 75%:
```
🔒 Bài học tiếp theo đã khóa
   Watch 30% more to unlock next lesson
```

## 📊 Database Schema

```sql
CREATE TABLE video_progress (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    section_id UUID NOT NULL REFERENCES sections(id),
    current_time INTEGER,          -- seconds
    duration INTEGER,              -- seconds
    progress_percentage DECIMAL(5,2),  -- 0.00-100.00
    completed BOOLEAN DEFAULT FALSE,
    completion_date TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, section_id)
);
```

## 🔒 Security

- Tất cả API endpoints yêu cầu JWT authentication
- `@AuthenticationPrincipal User` để lấy current user
- Không cho phép user track progress cho user khác
- Validate sectionId tồn tại trong database

## 🧪 Testing

### Manual Test Flow

1. Login vào hệ thống
2. Truy cập lesson viewer
3. Play video và xem ~40% → Check progress overlay hiển thị đúng
4. Pause video → API call track progress
5. Try click "Bài tiếp theo" → Should be locked
6. Continue watching to 75% → Button unlocked
7. Refresh page → Video should resume from last position

### API Test với curl

```bash
# 1. Track progress (40%)
curl -X POST http://localhost:8088/api/v1/video-progress/track \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sectionId":"uuid","currentTime":120,"duration":300}'

# 2. Check can proceed (should be false)
curl -X GET http://localhost:8088/api/v1/video-progress/uuid/can-proceed \
  -H "Authorization: Bearer $TOKEN"

# Response: {"canProceed":false,"currentProgress":40.0,"message":"Watch 35% more..."}

# 3. Track progress (80%)
curl -X POST http://localhost:8088/api/v1/video-progress/track \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sectionId":"uuid","currentTime":240,"duration":300}'

# 4. Check can proceed (should be true)
curl -X GET http://localhost:8088/api/v1/video-progress/uuid/can-proceed \
  -H "Authorization: Bearer $TOKEN"

# Response: {"canProceed":true,"currentProgress":80.0,"message":"You can proceed..."}
```

## 🐛 Troubleshooting

### Migration không chạy

```bash
# Check Flyway status
SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC;

# Manual apply migration (nếu cần)
psql -U postgres -d lms_db -f V1_2__create_video_progress_table.sql
```

### Video.js CSS không load

Kiểm tra `angular.json`:
```json
"styles": [
  "node_modules/video.js/dist/video-js.min.css"
]
```

### CORS Error

Nếu video từ R2 không load, check CORS policy trong Cloudflare:
```json
{
  "AllowedOrigins": ["http://localhost:4200"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"]
}
```

### Progress không update

1. Check console logs
2. Verify JWT token valid
3. Check sectionId tồn tại
4. Verify video player `timeupdate` event firing

## 📈 Future Enhancements

- [ ] Analytics dashboard: Xem thống kê completion rate
- [ ] Email notification khi hoàn thành khóa học
- [ ] Certificate generation khi hoàn thành 100%
- [ ] Video speed tracking (phát hiện skip video)
- [ ] Mobile app support
- [ ] Offline viewing với sync sau

## 💰 Cost

**FREE - $0/month**
- Video.js: Open source, miễn phí
- Cloudflare R2: 10GB storage miễn phí
- Backend: Self-hosted
- Database: PostgreSQL (local hoặc cloud free tier)

**So sánh với Cloudflare Stream:** $5/month + $1/1000 views

## 📚 References

- Video.js Documentation: https://videojs.com/
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Spring Boot: https://spring.io/projects/spring-boot
- Angular Signals: https://angular.io/guide/signals

## 🤝 Support

Nếu có vấn đề:
1. Check console logs (browser + backend)
2. Verify database migration successful
3. Test API endpoints với curl
4. Check JWT token valid

---

**Tạo bởi:** GitHub Copilot  
**Ngày:** 2024  
**Version:** 1.0.0
