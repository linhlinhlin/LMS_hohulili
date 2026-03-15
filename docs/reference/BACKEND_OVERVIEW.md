# Tổng quan backend

Tài liệu này là điểm vào ngắn gọn cho backend.

## Công nghệ

- Java 21
- Spring Boot 3.2.6
- Spring Security
- Spring Data JPA
- PostgreSQL 16
- Flyway

## Kiến trúc

Backend đi theo mô hình Clean Architecture / DDD dạng modular monolith:

- `identity`
- `course_authoring`
- `learning_delivery`
- `assessment`
- `communication`
- `ai_assistant`
- `shared`
- `config`

Mỗi module có 3 lớp:

- `domain`
- `application`
- `infrastructure`

## Điểm cần nhớ

- repository JPA chỉ làm việc với `*JpaEntity`, không dùng domain model trực tiếp
- source of truth cho runtime conventions nằm ở `docs/reference/RUNTIME_CONVENTIONS.md`
- runbook backend sâu hơn nằm ở [backend/README.md](E:/Sach/Sua/LMS_hohulili/backend/README.md)

## Lệnh tối thiểu

```bash
cd backend
mvn test -B
```
