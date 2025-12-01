# 🔄 Hướng Dẫn Restart Backend

## Đã Sửa Backend Code

File đã sửa: `api/src/main/java/com/example/lms/service/AdminService.java`

**Thay đổi**: Cho phép admin từ chối (thu hồi) khóa học đã được duyệt.

---

## Cách Restart Backend

### Option 1: Sử dụng IDE (Recommended)

1. **Nếu đang chạy trong IntelliJ IDEA hoặc Eclipse**:
   - Nhấn nút "Stop" (hình vuông đỏ)
   - Nhấn nút "Run" (hình tam giác xanh) để restart

2. **Hoặc sử dụng Maven**:
   ```bash
   cd api
   mvn spring-boot:run
   ```

### Option 2: Sử dụng Terminal/Command Line

1. **Tìm process đang chạy**:
   ```powershell
   # Windows PowerShell
   Get-Process -Name java | Where-Object {$_.Path -like "*lms*"}
   ```

2. **Kill process**:
   ```powershell
   # Thay <PID> bằng Process ID từ lệnh trên
   Stop-Process -Id <PID> -Force
   ```

3. **Start lại backend**:
   ```powershell
   cd api
   mvn spring-boot:run
   ```

### Option 3: Sử dụng Docker (nếu có)

```bash
cd api
docker-compose down
docker-compose up -d
```

---

## Kiểm Tra Backend Đã Restart

1. **Xem log console** - Tìm dòng:
   ```
   Started LmsApplication in X.XXX seconds
   ```

2. **Test API endpoint**:
   ```bash
   curl http://localhost:8088/api/v1/health
   ```

3. **Hoặc mở browser**: http://localhost:8088/swagger-ui.html

---

## Sau Khi Restart

### Test Lại Chức Năng Từ Chối:

1. **Login as Admin**
2. **Vào trang "Quản lý khóa học"**
3. **Chọn một khóa học đã APPROVED**
4. **Click nút "Từ chối" hoặc "Thu hồi"**
5. **Nhập lý do từ chối**
6. **Click "Từ chối khóa học"**

### Kết Quả Mong Đợi:
- ✅ Không còn lỗi "Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt"
- ✅ Khóa học chuyển từ APPROVED → REJECTED
- ✅ Alert thành công hiện ra
- ✅ Danh sách khóa học được refresh

---

## Nếu Vẫn Gặp Lỗi

1. **Kiểm tra log backend** - Xem có error gì không
2. **Clear browser cache** - Ctrl + Shift + Delete
3. **Restart frontend** - Nếu cần
4. **Kiểm tra database** - Xem status của course

---

**Created**: December 1, 2024
