# 🚀 Video Progress Tracking - Quick Start Guide

## ✅ ĐÃ HOÀN THÀNH

### Backend ✅
- Database migration: Table `video_progress` created in Supabase
- VideoProgress Entity với 75% auto-completion logic
- VideoProgressRepository với optimized queries
- VideoProgressService với business logic
- VideoProgressController với 5 REST endpoints
- Backend running on port 8088

### Frontend ✅
- Video.js installed (free, no API key needed)
- VideoProgressApi service
- VideoPlayerTrackedComponent với real-time tracking
- LessonViewerComponent (example implementation)

## 🎯 NEXT STEPS

### 1. Test Backend API (ĐANG CHẠY)

Đợi backend compile xong (~30 giây), sau đó:

```powershell
cd d:\dev
.\test-video-progress-api.ps1
```

Script sẽ test:
- ✅ Login
- ✅ Track 40% → Should be LOCKED
- ✅ Track 80% → Should be UNLOCKED
- ✅ Check can proceed logic
- ✅ Get progress details

### 2. Lấy Section ID thực từ database

Để test với data thật, lấy section ID từ Supabase:

```sql
SELECT id, title FROM sections WHERE type = 'VIDEO' LIMIT 5;
```

Sau đó sửa trong `test-video-progress-api.ps1`:
```powershell
$testSectionId = "your-real-section-uuid-here"
```

### 3. Test Frontend

```powershell
cd d:\dev\fe
npm start
```

Truy cập: http://localhost:4200

### 4. Tích hợp vào Course Learning Component

Thay thế video player hiện tại bằng tracked player:

```typescript
// Trong course-learning.component.ts (hoặc tương tự)
import { VideoPlayerTrackedComponent } from '@shared/components/video-player-tracked';

@Component({
  // ...
  imports: [VideoPlayerTrackedComponent]
})
```

```html
<!-- Thay thế video player cũ -->
<app-video-player-tracked
  [videoUrl]="currentSection.videoUrl"
  [sectionId]="currentSection.id"
  [autoplay]="false"
  [trackingInterval]="5000"
/>
```

## 📊 Test Manual với Postman

### 1. Login
```
POST http://localhost:8088/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@lms.com",
  "password": "admin123"
}
```

Copy `token` từ response.

### 2. Track Progress (40%)
```
POST http://localhost:8088/api/v1/video-progress/track
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "sectionId": "your-section-uuid",
  "videoUrl": "https://pub-xxx.r2.dev/video.mp4",
  "currentPosition": 120,
  "duration": 300
}
```

### 3. Check Can Proceed
```
GET http://localhost:8088/api/v1/video-progress/{sectionId}/can-proceed
Authorization: Bearer YOUR_TOKEN
```

**Expected at 40%:**
```json
{
  "success": true,
  "data": {
    "canProceed": false,
    "currentProgress": 40.0,
    "message": "Watch 35% more to unlock next lesson"
  }
}
```

### 4. Track Progress (80%)
```
POST http://localhost:8088/api/v1/video-progress/track
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "sectionId": "your-section-uuid",
  "videoUrl": "https://pub-xxx.r2.dev/video.mp4",
  "currentPosition": 240,
  "duration": 300
}
```

### 5. Check Can Proceed Again
```
GET http://localhost:8088/api/v1/video-progress/{sectionId}/can-proceed
Authorization: Bearer YOUR_TOKEN
```

**Expected at 80%:**
```json
{
  "success": true,
  "data": {
    "canProceed": true,
    "currentProgress": 80.0,
    "message": "You can proceed to the next lesson"
  }
}
```

## 🎨 Frontend Integration Example

```typescript
// lesson-learning.component.ts
export class LessonLearningComponent {
  private videoProgressApi = inject(VideoProgressApi);
  
  canProceedToNext = signal<boolean>(false);
  lockMessage = signal<string>('');
  
  ngOnInit() {
    this.checkProgress();
    
    // Refresh every 10 seconds
    interval(10000).subscribe(() => {
      this.checkProgress();
    });
  }
  
  checkProgress() {
    this.videoProgressApi
      .canProceedToNext(this.currentSectionId)
      .subscribe(response => {
        this.canProceedToNext.set(response.data.canProceed);
        this.lockMessage.set(response.data.message);
      });
  }
}
```

```html
<!-- lesson-learning.component.html -->
<app-video-player-tracked
  [videoUrl]="currentSection.videoUrl"
  [sectionId]="currentSection.id"
/>

<div class="navigation">
  <button (click)="previousLesson()">← Previous</button>
  
  @if (canProceedToNext()) {
    <button (click)="nextLesson()">Next →</button>
  } @else {
    <div class="locked">
      🔒 {{ lockMessage() }}
    </div>
  }
</div>
```

## 🔍 Troubleshooting

### Backend không start
```powershell
# Check port 8088
Get-NetTCPConnection -LocalPort 8088 -State Listen
```

### Migration error
Kiểm tra trong Supabase SQL Editor:
```sql
SELECT * FROM video_progress LIMIT 1;
```

### Video.js CSS không load
Check `angular.json`:
```json
"styles": [
  "src/styles.scss",
  "node_modules/video.js/dist/video-js.min.css"
]
```

Restart dev server:
```powershell
cd fe
npm start
```

## 📈 Monitoring

### Check progress in Supabase
```sql
-- All progress
SELECT * FROM video_progress ORDER BY last_watched_at DESC;

-- Completed videos only
SELECT * FROM video_progress WHERE completed = true;

-- User's progress
SELECT 
  u.email,
  s.title AS section_title,
  vp.progress_percentage,
  vp.completed
FROM video_progress vp
JOIN users u ON vp.user_id = u.id
JOIN sections s ON vp.section_id = s.id
ORDER BY vp.last_watched_at DESC;
```

## 🎯 Success Criteria

✅ Backend API responds on port 8088  
✅ Login works and returns JWT token  
✅ Track progress at 40% → `completed = false`  
✅ Track progress at 80% → `completed = true`  
✅ Can proceed check works correctly  
✅ Frontend video player tracks progress every 5s  
✅ Progress overlay shows on video  
✅ Next lesson button locks/unlocks based on 75% rule

## 🚀 Deployment Checklist

- [ ] Test with real course data
- [ ] Verify all API endpoints work
- [ ] Test video player tracking
- [ ] Test 75% completion gate
- [ ] Test resume functionality
- [ ] Check mobile responsive
- [ ] Performance test with many students
- [ ] Add analytics/monitoring

---

**Status:** ✅ Ready for testing  
**Backend:** Running on port 8088  
**Database:** video_progress table created  
**Frontend:** Components ready  
**Next:** Run test script and integrate into course flow
