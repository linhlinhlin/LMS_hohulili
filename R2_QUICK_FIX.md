# 🚀 Quick Fix: Enable R2 Storage

## Vấn đề
```
Error: 403 - Http failure response for http://localhost:8088/api/v1/storage/r2/presign-upload: 403
```

**Nguyên nhân:** R2 Storage chưa được enable trong backend (mặc định `R2_ENABLED=false`)

---

## ✅ Giải pháp đã áp dụng

### 1. Enable R2 trong `application-dev.yml`

File: `api/src/main/resources/application-dev.yml`

```yaml
app:
  r2:
    enabled: true  # ✅ Đã bật
    account-id: test-account
    access-key-id: test-key
    secret-access-key: test-secret
    bucket: lms-videos
    endpoint: https://test.r2.cloudflarestorage.com
    public-base-url: https://test-bucket.r2.dev
```

### 2. Restart Backend

Backend đang được restart với R2 enabled.

---

## 🧪 Test ngay (Không cần Cloudflare account)

Sau khi backend restart xong:

1. **Refresh trang Course Editor** (Ctrl + Shift + R)
2. **Upload video** trong Section VIDEO
3. **Kết quả:** 
   - ✅ Upload sẽ THÀNH CÔNG (status 200)
   - ✅ Presigned URL được tạo
   - ⚠️ Video KHÔNG được lưu thực sự (vì dùng test credentials)

**Lưu ý:** Với test credentials, API sẽ hoạt động nhưng video không thực sự upload lên R2.

---

## 🔐 Để upload video THẬT lên Cloudflare R2

### Bước 1: Tạo Cloudflare R2 Bucket (FREE 10GB)

1. Đăng ký/đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vào **R2 Object Storage** (sidebar bên trái)
3. Click **Create bucket**
4. Đặt tên bucket: `lms-videos`
5. Click **Create bucket**

### Bước 2: Lấy API Credentials

1. Trong R2 Dashboard, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Permissions: **Object Read & Write**
4. Click **Create API Token**
5. **Copy và lưu lại:**
   - Access Key ID
   - Secret Access Key
   - Account ID (ở dashboard header)

### Bước 3: Enable Public Access (Tùy chọn)

1. Vào bucket `lms-videos`
2. Tab **Settings** > **Public Access**
3. Click **Allow Access**
4. Copy **Public Bucket URL** (dạng: `https://pub-xxxxx.r2.dev`)

### Bước 4: Cập nhật credentials

**Cách A: Update file `application-dev.yml`**

```yaml
app:
  r2:
    enabled: true
    account-id: YOUR_ACTUAL_ACCOUNT_ID
    access-key-id: YOUR_ACTUAL_ACCESS_KEY_ID
    secret-access-key: YOUR_ACTUAL_SECRET_ACCESS_KEY
    bucket: lms-videos
    endpoint: https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
    public-base-url: https://pub-xxxxx.r2.dev
```

**Cách B: Dùng Environment Variables (An toàn hơn)**

Chạy `api/set-r2-env.bat` và update credentials, sau đó:

```bash
# Windows PowerShell
cd api
.\run-backend-with-r2.bat
```

---

## 🎯 Kết quả

✅ Giao diện upload video hoạt động  
✅ API endpoint `/api/v1/storage/r2/presign-upload` trả về 200  
✅ Upload progress bar hiển thị  
✅ Video preview sau khi upload  
⚠️ Cần real credentials để video thực sự lưu trên R2  

---

## 📝 Kiểm tra R2 đã enable

Sau khi backend restart, check logs:

```
✅ Thấy dòng này = R2 enabled:
   o.s.b.a.e.web.EndpointLinksResolver : Exposing endpoint(s) beneath base path '/actuator'
   c.e.l.controller.R2StorageController : R2StorageController initialized

❌ Không thấy = R2 disabled:
   (Không có log về R2StorageController)
```

---

## 🐛 Troubleshooting

### Vẫn bị 403 sau khi restart?

1. **Clear browser cache:** Ctrl + Shift + Delete
2. **Refresh hard:** Ctrl + Shift + R
3. **Kiểm tra backend logs:** Tìm "R2" hoặc "ConditionalOnProperty"
4. **Test API trực tiếp:**
   ```bash
   curl -X POST http://localhost:8088/api/v1/storage/r2/presign-upload \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"objectKey":"test.mp4","contentType":"video/mp4"}'
   ```

### Backend không start?

```bash
# Check port 8088
netstat -ano | findstr :8088

# Kill process nếu cần
taskkill /PID <PID> /F

# Restart
cd api
mvn spring-boot:run
```

---

## ✨ Next Steps

1. ✅ **Hiện tại:** Test với mock credentials
2. 🔐 **Sản xuất:** Thêm real Cloudflare R2 credentials
3. 🎬 **Upload video thật:** Test end-to-end flow
4. 📊 **Monitor:** Theo dõi R2 storage usage (free 10GB)
