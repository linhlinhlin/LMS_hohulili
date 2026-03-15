# Onboarding Maritime LMS

Tài liệu này giúp teammate mới dựng môi trường local nhanh, không phải đoán tài liệu nào là chuẩn.

## 1. Hiểu nhanh runtime chuẩn

- Frontend local: `http://localhost:4200`
- Backend local trên host: `http://localhost:8088`
- Port nội bộ Spring Boot/container: `8080`
- Production API: same-origin `/api/*` sau `https://holilihu.online`
- Topology runtime được hỗ trợ: `docker-compose.yml` + `docker-compose.dev.yml` / `docker-compose.prod.yml`

## 2. Công cụ cần có

| Công cụ | Khuyến nghị |
|--------|-------------|
| Docker Desktop | Bản ổn định mới |
| Node.js | 22.x |
| Java | 21 |
| Maven | 3.9+ |
| Git | Bản ổn định mới |

## 3. Cách khởi động khuyến nghị

### Backend bằng Docker

```bash
cp .env.dev.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend
```

Kiểm tra:

```bash
curl -s http://localhost:8088/actuator/health
curl -s http://localhost:8088/api/v3/courses
```

### Frontend chạy local

```bash
cd fe
npm install
npm start
```

Mở `http://localhost:4200`.

## 4. Cách chạy thay thế

### Chạy full stack bằng Docker

```bash
cp .env.dev.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build --wait
```

### Chạy backend host-native

```bash
cd backend
SERVER_PORT=8088 mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

## 5. Tài khoản mặc định

| Vai trò | Email | Mật khẩu |
|--------|-------|----------|
| ADMIN | `admin@maritime.edu` | `admin123` |
| ORG_ADMIN | `orgadmin@maritime.edu` | `orgadmin123` |
| TEACHER | `teacher@maritime.edu` | `teacher123` |
| STUDENT | `student@maritime.edu` | `student123` |

Tài khoản seed mở rộng và luồng test tay nằm ở [docs/testing/TEST_CHECKLIST.md](docs/testing/TEST_CHECKLIST.md).

## 6. Đọc gì trước

- [README.md](README.md): tổng quan repo
- [CHANGELOG.md](CHANGELOG.md): thay đổi gần đây
- [CONTRIBUTING.md](CONTRIBUTING.md): nguyên tắc làm việc trong repo
- [backend/README.md](backend/README.md): backend runbook
- [fe/FRONTEND_ARCHITECTURE.md](fe/FRONTEND_ARCHITECTURE.md): frontend architecture
- [docs/README.md](docs/README.md): bản đồ docs

## 7. Lệnh thường dùng

### Backend

```bash
cd backend
mvn test -B
cd ..
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend --tail=100
```

### Frontend

```bash
cd fe
npm run build
npm test
```

## 8. Troubleshooting nhanh

### Backend không lên

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend --tail=100
```

### Frontend không gọi được API

Kiểm tra:

- `http://localhost:8088/actuator/health`
- `fe/proxy.conf.json`
- frontend dev có đang dùng `/api/*` thay vì hardcode host không

## 9. Khi cần đào sâu hơn

- runbook runtime: `docs/reference/`
- runbook thao tác: `docs/runbooks/`
- tài liệu kiến trúc: `docs/architecture/`
- testing: `docs/testing/`
- lịch sử kế hoạch và audit: `docs/plans/`, `docs/reports/`, `docs/research/`
