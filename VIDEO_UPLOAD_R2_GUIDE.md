# 🎥 Video Upload với Cloudflare R2 Storage

## Tổng quan

Hệ thống hỗ trợ upload video trực tiếp lên **Cloudflare R2 Storage** (S3-compatible) với **10GB storage miễn phí**.

Video được lưu trữ an toàn trên R2 và có thể được truy cập qua public URL hoặc presigned URL.

---

## 📋 Yêu cầu

### Backend (Java Spring Boot)
- ✅ R2StorageService
- ✅ R2StorageController
- ✅ AWS SDK for S3 integration

### Frontend (Angular)
- ✅ R2StorageApi service
- ✅ VideoUploadComponent
- ✅ VideoPlayerComponent
- ✅ Tích hợp vào Course Curriculum Editor

---

## ⚙️ Cấu hình Backend

### 1. Tạo Cloudflare R2 Bucket

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vào **R2 Object Storage**
3. Tạo bucket mới (ví dụ: `lms-videos`)
4. Lấy thông tin:
   - Account ID
   - Access Key ID
   - Secret Access Key
   - Bucket name

### 2. Cấu hình Environment Variables

Thêm vào file `application-dev.yml` hoặc set environment variables:

```yaml
app:
  r2:
    enabled: true
    account-id: YOUR_ACCOUNT_ID
    access-key-id: YOUR_ACCESS_KEY_ID
    secret-access-key: YOUR_SECRET_ACCESS_KEY
    bucket: lms-videos
    endpoint: https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
    public-base-url: https://YOUR_BUCKET.r2.dev
    presign-ttl-seconds: 900
```

**Hoặc dùng Environment Variables:**

```bash
# Windows PowerShell
$env:R2_ENABLED="true"
$env:R2_ACCOUNT_ID="your_account_id"
$env:R2_ACCESS_KEY_ID="your_access_key"
$env:R2_SECRET_ACCESS_KEY="your_secret_key"
$env:R2_BUCKET="lms-videos"
$env:R2_ENDPOINT="https://your_account_id.r2.cloudflarestorage.com"
$env:R2_PUBLIC_BASE_URL="https://your_bucket.r2.dev"
$env:R2_PRESIGN_TTL="900"

# Linux/Mac
export R2_ENABLED=true
export R2_ACCOUNT_ID=your_account_id
export R2_ACCESS_KEY_ID=your_access_key
export R2_SECRET_ACCESS_KEY=your_secret_key
export R2_BUCKET=lms-videos
export R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
export R2_PUBLIC_BASE_URL=https://your_bucket.r2.dev
export R2_PRESIGN_TTL=900
```

### 3. Cấu hình Public Access (Tùy chọn)

Nếu muốn video có thể truy cập công khai:

1. Vào Cloudflare R2 Dashboard
2. Chọn bucket của bạn
3. Vào tab **Settings** > **Public Access**
4. Bật **Allow Public Access**
5. Copy **Public Bucket URL** (dạng: `https://your-bucket.r2.dev`)
6. Paste vào `R2_PUBLIC_BASE_URL`

---

## 🎬 Cách sử dụng trong Frontend

### Trong Course Curriculum Editor

1. Chọn **Chương** và **Bài học**
2. Thêm **Section** mới với type **VIDEO**
3. Trong phần "Upload Video lên Cloudflare R2":
   - Kéo thả file video hoặc click "chọn file"
   - Hỗ trợ: MP4, AVI, MOV, MKV
   - Kích thước tối đa: 500MB
4. Upload progress sẽ hiển thị
5. Sau khi upload xong, video URL tự động được set
6. Video có thể được preview ngay trong editor

### Hoặc nhập URL từ YouTube/Vimeo

Nếu không muốn upload lên R2, bạn có thể:
- Nhập URL YouTube: `https://youtube.com/watch?v=...`
- Nhập URL Vimeo: `https://vimeo.com/...`

---

## 🔧 API Endpoints

### Backend API

#### 1. Generate Presigned Upload URL
```http
POST /api/v1/storage/r2/presign-upload
Content-Type: application/json

{
  "objectKey": "videos/1234567890-video.mp4",
  "contentType": "video/mp4"
}
```

**Response:**
```json
{
  "uploadUrl": "https://your-bucket.r2.cloudflarestorage.com/...",
  "headers": {
    "Content-Type": "video/mp4"
  },
  "objectKey": "videos/1234567890-video.mp4",
  "publicUrl": "https://your-bucket.r2.dev/videos/1234567890-video.mp4"
}
```

#### 2. Generate Presigned Download URL
```http
POST /api/v1/storage/r2/presign-download
Content-Type: application/json

{
  "objectKey": "videos/1234567890-video.mp4"
}
```

#### 3. Delete Object
```http
DELETE /api/v1/storage/r2/object/{objectKey}
```

#### 4. Get Public URL
```http
GET /api/v1/storage/r2/public-url?objectKey=videos/1234567890-video.mp4
```

---

## 📊 Giới hạn Cloudflare R2

### Free Tier (10GB)
- ✅ 10GB storage
- ✅ Class A operations: 1 million/month (write, list)
- ✅ Class B operations: 10 million/month (read)
- ✅ Egress: Free (không giới hạn bandwidth)

### Paid Tier (nếu vượt quota)
- $0.015/GB/month storage
- $4.50/million Class A operations
- $0.36/million Class B operations
- Egress: vẫn free

---

## 🔐 Bảo mật

### Presigned URLs
- ✅ URLs có thời gian hết hạn (mặc định 15 phút)
- ✅ Không cần authentication để upload/download trong thời gian URL còn hiệu lực
- ✅ URL được tạo server-side, an toàn

### Access Control
- Private bucket: Chỉ truy cập qua presigned URL
- Public bucket: Truy cập trực tiếp qua public URL

---

## 🐛 Troubleshooting

### 1. Upload thất bại - CORS Error

**Giải pháp:** Cấu hình CORS cho R2 bucket:

```json
[
  {
    "AllowedOrigins": ["http://localhost:4200", "https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 2. Video không play được

**Nguyên nhân:** Browser không hỗ trợ codec hoặc MIME type không đúng

**Giải pháp:**
- Đảm bảo video là MP4 H.264
- Check `Content-Type` header trong response

### 3. R2 không được enable

**Lỗi:** `R2StorageController` không khả dụng

**Giải pháp:**
```bash
# Set environment variable
$env:R2_ENABLED="true"

# Restart backend
mvn spring-boot:run
```

---

## 📝 Code Examples

### Upload video từ Component

```typescript
import { VideoUploadComponent, VideoUploadResult } from '@shared/components/video-upload';

@Component({
  template: `
    <app-video-upload 
      [maxFileSize]="500 * 1024 * 1024"
      (videoUploaded)="onVideoUploaded($event)"
      (videoRemoved)="onVideoRemoved()">
    </app-video-upload>
  `
})
export class MyComponent {
  onVideoUploaded(result: VideoUploadResult) {
    console.log('Video uploaded:', result.publicUrl);
    // Save to database
    this.saveVideoUrl(result.publicUrl);
  }

  onVideoRemoved() {
    console.log('Video removed');
  }
}
```

### Direct API call

```typescript
import { R2StorageApi } from '@api/client/r2-storage.api';

// Upload with progress
this.r2StorageApi.uploadToR2WithProgress(
  file,
  (progress) => console.log(`Upload: ${progress}%`)
).subscribe({
  next: (result) => console.log('Uploaded:', result.publicUrl),
  error: (err) => console.error('Upload failed:', err)
});
```

---

## ✅ Testing

### Test upload flow

1. Start backend: `mvn spring-boot:run`
2. Start frontend: `npm start` (in fe folder)
3. Đăng nhập với tài khoản teacher
4. Vào Course Editor
5. Chọn bài học > Thêm section VIDEO
6. Upload video từ máy tính
7. Kiểm tra:
   - Upload progress bar
   - Video preview sau khi upload
   - Video URL được set đúng
   - Video có thể play được

---

## 📚 Tham khảo

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for Java S3](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/examples-s3.html)
- [Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

---

## 🎯 Kết luận

Chức năng upload video đã được implement đầy đủ **end-to-end**:

✅ **Backend:** R2 Storage Service + Controller  
✅ **Frontend:** Video Upload Component + API Integration  
✅ **UI:** Tích hợp vào Course Curriculum Editor  
✅ **Storage:** Cloudflare R2 (10GB miễn phí)  
✅ **Security:** Presigned URLs với expiration  
✅ **UX:** Drag & drop, progress bar, preview  

**Video của người dùng sẽ được lưu trực tiếp trên Cloudflare R2 Storage! 🎉**
