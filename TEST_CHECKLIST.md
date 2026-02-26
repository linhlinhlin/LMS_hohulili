# Checklist Test — Hệ thống LMS Hàng hải

> **Ngày tạo**: 2026-02-26 | **Phiên bản**: Production-ready (806 BE tests, 0 failures)

---

## 1. Truy cập hệ thống

| Môi trường | URL |
|------------|-----|
| Frontend | http://localhost:4200 |
| Backend API | http://localhost:8088/api/v3 |
| Swagger UI | http://localhost:8088/swagger-ui |
| Production | https://holilihu.online |

---

## 2. Tài khoản test

### Tài khoản gốc (mật khẩu đơn giản)
| Vai trò | Email | Mật khẩu | Ghi chú |
|---------|-------|-----------|---------|
| **ADMIN** | `admin@maritime.edu` | `admin123` | Quản trị toàn hệ thống |
| **ORG_ADMIN** | `orgadmin@maritime.edu` | `orgadmin123` | Chuyên viên quản lý |
| **TEACHER** | `teacher@maritime.edu` | `teacher123` | Giảng viên |
| **STUDENT** | `student@maritime.edu` | `student123` | Học viên |

### Tài khoản seed (dữ liệu mẫu STCW)

**Giảng viên** (mật khẩu chung: `Maritime@2026`)
| Email | Họ tên | Khóa học phụ trách |
|-------|--------|-------------------|
| `tranngocdai@maritime.edu` | PGS.TS Trần Ngọc Đại | NAV-101 Hàng hải Địa văn |
| `levanhung@maritime.edu` | TS. Lê Văn Hùng | NAV-201 ECDIS & Radar/ARPA |
| `nguyenminhquan@maritime.edu` | PGS.TS Nguyễn Minh Quân | ENG-101 Máy Diesel |
| `phamthihanh@maritime.edu` | TS. Phạm Thị Hạnh | ENG-201 Điện tàu biển |
| `vudinhthang@maritime.edu` | PGS.TS Vũ Đình Thắng | SAF-101 An toàn STCW |
| `doanvannam@maritime.edu` | TS. Đoàn Văn Nam | SAF-201 Chữa cháy nâng cao |
| `hoangthimai@maritime.edu` | PGS.TS Hoàng Thị Mai | LOG-101 Logistics vận tải |
| `buithanhson@maritime.edu` | TS. Bùi Thanh Sơn | LAW-101 Luật hàng hải |
| `nguyenducanh@maritime.edu` | TS. Nguyễn Đức Anh | NAV-301 Khí tượng & Điều động |
| `lethimylinh@maritime.edu` | ThS. Lê Thị Mỹ Linh | NAV-102 Tiếng Anh hàng hải |

**Học viên** (mật khẩu chung: `Student@2026`)
| Email | Họ tên |
|-------|--------|
| `nguyenvanan@sv.maritime.edu` | Nguyễn Văn An |
| `tranthibinh@sv.maritime.edu` | Trần Thị Bình |
| `lehoangcuong@sv.maritime.edu` | Lê Hoàng Cường |
| ... *(tổng 25 học viên, email theo mẫu `ten@sv.maritime.edu`)* |

**Admin seed** (mật khẩu: `Maritime@2026`)
| Email | Vai trò |
|-------|---------|
| `phamvanhai@maritime.edu` | ADMIN |
| `nguyenlanhuong@maritime.edu` | ORG_ADMIN |

---

## 3. Các flow cần test

### A. Đăng nhập & Phân quyền
- [ ] Đăng nhập ADMIN → thấy dashboard admin, menu đầy đủ (Users, Courses, Analytics, Settings, Logs)
- [ ] Đăng nhập ORG_ADMIN → thấy dashboard chuyên viên, **không** có Settings/Logs
- [ ] Đăng nhập TEACHER → thấy dashboard giảng viên, quản lý khóa học
- [ ] Đăng nhập STUDENT → thấy trang học viên, khóa học đã ghi danh
- [ ] Đăng xuất → redirect về trang login

### B. Quản lý khóa học (TEACHER)
- [ ] Login `tranngocdai@maritime.edu` → thấy khóa NAV-101 trong danh sách
- [ ] Mở khóa NAV-101 → thấy 7 chương, ~40 bài học
- [ ] Xem nội dung bài giảng → hiển thị text HTML hàng hải
- [ ] Tạo khóa học mới → nhập tiêu đề, mô tả, chọn category
- [ ] Upload thumbnail → file hiển thị đúng
- [ ] Thêm chapter → thêm lesson (LECTURE, VIDEO, QUIZ, ASSIGNMENT)
- [ ] Submit khóa học để duyệt → status chuyển PENDING

### C. Duyệt khóa học (ADMIN / ORG_ADMIN)
- [ ] Login admin → Quản lý khóa học → thấy khóa PENDING
- [ ] Approve khóa học → status = APPROVED
- [ ] Reject khóa học → nhập lý do → status = REJECTED
- [ ] Revoke khóa APPROVED → status = DRAFT

### D. Ghi danh & Học (STUDENT)
- [ ] Login `nguyenvanan@sv.maritime.edu` → thấy khóa đã ghi danh
- [ ] Duyệt danh sách khóa học → thấy 10+ khóa (FREE + PAID)
- [ ] Ghi danh khóa FREE → enrollment thành công
- [ ] Mở khóa học → xem danh sách chương/bài
- [ ] Xem bài giảng LECTURE → đọc nội dung
- [ ] Hoàn thành bài học → progress tăng

### E. Quiz / Kiểm tra
- [ ] Student mở bài QUIZ → thấy câu hỏi trắc nghiệm
- [ ] Làm bài quiz → chọn đáp án → nộp bài
- [ ] Xem kết quả → điểm, đúng/sai
- [ ] Teacher xem thống kê quiz → số lượt thi, điểm TB

### F. Bài tập (Assignment)
- [ ] Student xem danh sách bài tập
- [ ] Nộp bài tập (upload file / viết essay)
- [ ] Teacher xem submission → chấm điểm → nhập nhận xét

### G. Admin Operations
- [ ] ADMIN: Quản lý users → tạo/sửa/vô hiệu hóa tài khoản
- [ ] ADMIN: Xem audit logs
- [ ] ADMIN: Settings hệ thống
- [ ] ORG_ADMIN: Quản lý users (chỉ teacher/student, **không thể** tạo admin)
- [ ] ORG_ADMIN: Duyệt khóa học
- [ ] ORG_ADMIN: Xem analytics

### H. Tính năng khác
- [ ] Đánh giá khóa học (1-5 sao + nhận xét)
- [ ] Tin nhắn giữa users
- [ ] Thông báo (notifications)
- [ ] Hồ sơ cá nhân → sửa thông tin
- [ ] Đăng ký tài khoản mới (tự động role STUDENT)
- [ ] Quên mật khẩu → email reset

---

## 4. Dữ liệu mẫu có sẵn

### 10 Khóa học STCW
| Mã | Tên | Loại | Giá | Chế độ |
|----|------|------|-----|--------|
| NAV-101 | Hàng hải Địa văn và La bàn Từ | FREE | 0 | SELF_PACED |
| NAV-201 | ECDIS và Radar/ARPA | PAID | 2.500.000đ | INSTRUCTOR_LED |
| ENG-101 | Máy Diesel Tàu biển | FREE | 0 | SELF_PACED |
| ENG-201 | Điện và Tự động hóa Tàu | PAID | 2.000.000đ | INSTRUCTOR_LED |
| SAF-101 | Huấn luyện An toàn Cơ bản STCW | FREE | 0 | SELF_PACED |
| SAF-201 | Chữa cháy Nâng cao và Cứu hộ | PAID | 1.800.000đ | INSTRUCTOR_LED |
| LOG-101 | Quản lý Chuỗi cung ứng Vận tải biển | FREE | 0 | SELF_PACED |
| LAW-101 | Luật Hàng hải Quốc tế và Việt Nam | PAID | 1.500.000đ | SELF_PACED |
| NAV-301 | Khí tượng Hải dương và Điều động | PAID | 2.200.000đ | INSTRUCTOR_LED |
| NAV-102 | Tiếng Anh Hàng hải Chuyên ngành | PAID | 800.000đ | SELF_PACED |

### Dữ liệu tương tác
- 88 enrollments (đa dạng: 10-100% progress, ACTIVE/COMPLETED/DROPPED)
- 16 quizzes (PUBLISHED, có câu hỏi 4 đáp án)
- 32 bài tập (linked to ASSIGNMENT lessons)
- 18 đánh giá (4-5 sao trung bình)

---

## 5. API nhanh để verify

```bash
# Health check
curl http://localhost:8088/actuator/health

# Danh sách khóa học
curl http://localhost:8088/api/v3/courses?page=0&size=20

# Đăng nhập
curl -X POST http://localhost:8088/api/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maritime.edu","password":"admin123"}'
```

---

## 6. Giao diện học viên (Student Lesson Viewer)

### Sidebar bài học
- [ ] Hiển thị header "CẤU TRÚC KHÓA HỌC" + "N Chương · M Bài học"
- [ ] Chapter có icon folder (mở/đóng khi expand/collapse)
- [ ] Lesson có icon loại nội dung: play (VIDEO), description (TEXT), attach_file (FILE), quiz (QUIZ)
- [ ] Bài đang học: nền xanh nhạt, chữ xanh
- [ ] Bài đã hoàn thành: checkmark xanh lá, chữ mờ
- [ ] Đánh số "Bài 1.1: Tên bài" đúng thứ tự

### Nội dung bài học
- [ ] VIDEO: hiển thị trong container bo tròn, có shadow, nền xám nhạt
- [ ] TEXT: hiển thị trong card trắng, có border + shadow nhẹ
- [ ] Tiêu đề bài: dạng "Bài 1.1: Tên bài học" (có đánh số)
- [ ] Previous/Next navigation hoạt động đúng

### Responsive
- [ ] Mobile: sidebar ẩn, có nút mở overlay
- [ ] Desktop: sidebar + content cạnh nhau

---

## 7. PWA & Offline

### Test cơ bản (Chrome DevTools)
- [ ] Mở Chrome → DevTools → Application → Service Workers → thấy ngsw-worker.js active
- [ ] Network → Offline → F5 → app vẫn load được (app shell từ cache)
- [ ] Tắt offline → duyệt vài trang → bật offline → các trang đã xem vẫn hiển thị

### Test trên thiết bị thật
- [ ] iPad/iPhone: Add to Home Screen → mở app → tắt WiFi → app vẫn chạy
- [ ] Android: Install PWA → tắt WiFi → app vẫn chạy
- [ ] Tắt WiFi 5+ phút → quay lại → app không crash (iOS đã fix)
- [ ] Tắt WiFi 24h → F5 → app vẫn load (cache 7 ngày)

### PWA Recovery (khi SW bị hỏng)
- [ ] Truy cập `holilihu.online/reset-sw` → thấy "Resetting PWA..." → redirect về trang chủ
- [ ] Truy cập `holilihu.online/?reset-sw` → SW + cache bị xóa → reload clean
- [ ] DevTools → Application → Service Workers → thấy `navigationRequestStrategy: freshness`
- [ ] Tắt mạng 3 lần reload liên tiếp → auto-recovery kích hoạt (xóa SW + reload)

### Download khóa học offline
- [ ] Student → khóa đã ghi danh → nút Download → tải về thành công
- [ ] Tắt mạng → mở khóa đã download → xem được nội dung bài học
- [ ] Progress vẫn được lưu offline (IndexedDB)

---

## 8. Lưu ý khi test

- **Khóa PAID**: Cần tích hợp VNPay sandbox để test thanh toán (hiện chưa có merchant credentials thật)
- **Email**: Dev environment dùng SMTP mock, prod dùng Resend API
- **Video**: Cần upload video thật để test player (Shaka Player adaptive streaming)
- **PWA Offline**: Test trên Chrome → DevTools → Network → Offline
- **Swagger UI**: http://localhost:8088/swagger-ui → thử API trực tiếp với JWT token

---

## 9. Deploy Production

### Lệnh deploy chuẩn
```bash
cd /home/Admin/lms
./deploy.sh
```

### Lưu ý quan trọng
- **LUÔN** dùng `deploy.sh` hoặc lệnh đầy đủ với `--env-file .env.prod`
- **KHÔNG** chạy `docker compose up` thiếu `--env-file .env.prod` — backend sẽ crash do sai password DB và JWT secret
- Nếu postgres password bị lệch:
  ```bash
  docker exec lms-postgres psql -U lms -d lms -c "ALTER USER lms WITH PASSWORD '<pass-from-env-prod>';"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart backend
  ```

### Kiểm tra sau deploy
```bash
# Tất cả 4 containers phải Healthy
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod ps

# API health (qua Caddy reverse proxy)
curl -s https://holilihu.online/actuator/health
# Expected: {"status":"UP"}

# Test login
curl -s -X POST http://localhost:8088/api/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maritime.edu","password":"admin123"}'
```
