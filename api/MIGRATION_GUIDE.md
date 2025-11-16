# 🔄 HƯỚNG DẪN MIGRATION DATABASE

## 📋 Tổng quan

File này hướng dẫn cách chạy migration để thêm các fields mới vào bảng `courses`.

---

## 🎯 Migration V3: Add Course Review Fields

**File:** `src/main/resources/db/migration/V3__add_course_review_fields.sql`

**Mục đích:** Thêm các trường để track thông tin admin review khóa học

**Các trường được thêm:**
- `review_comment` (TEXT): Nhận xét của admin
- `reviewed_at` (TIMESTAMP): Thời gian duyệt
- `reviewed_by_id` (UUID): ID của admin duyệt

---

## 🚀 Cách chạy Migration

### Option 1: Tự động (Khuyến nghị)

Migration sẽ tự động chạy khi khởi động ứng dụng Spring Boot:

```bash
cd api
mvn spring-boot:run
```

Flyway sẽ tự động:
1. Kiểm tra version hiện tại trong database
2. Chạy các migration chưa được thực thi
3. Cập nhật bảng `flyway_schema_history`

---

### Option 2: Chạy thủ công với Maven

```bash
cd api
mvn flyway:migrate
```

---

### Option 3: Chạy thủ công với SQL

Nếu không dùng Flyway, chạy trực tiếp SQL:

```bash
# PostgreSQL
psql -U postgres -d lms_db -f src/main/resources/db/migration/V3__add_course_review_fields.sql

# MySQL
mysql -u root -p lms_db < src/main/resources/db/migration/V3__add_course_review_fields.sql
```

---

## ✅ Kiểm tra Migration đã chạy

### Kiểm tra bảng courses:

```sql
-- PostgreSQL
\d courses

-- MySQL
DESCRIBE courses;

-- SQL Standard
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'courses' 
AND column_name IN ('review_comment', 'reviewed_at', 'reviewed_by_id');
```

**Kết quả mong đợi:**
```
 column_name    | data_type
----------------+-----------
 review_comment | text
 reviewed_at    | timestamp
 reviewed_by_id | uuid
```

---

### Kiểm tra Flyway history:

```sql
SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;
```

**Kết quả mong đợi:**
```
 installed_rank | version | description                  | type | script                                    | success
----------------+---------+------------------------------+------+-------------------------------------------+---------
              3 | 3       | add course review fields     | SQL  | V3__add_course_review_fields.sql          | t
              2 | 2       | ...                          | SQL  | V2__...sql                                | t
              1 | 1       | ...                          | SQL  | V1__...sql                                | t
```

---

## 🔧 Troubleshooting

### Lỗi: "Migration checksum mismatch"

**Nguyên nhân:** File migration đã bị sửa sau khi chạy lần đầu

**Giải pháp:**
```sql
-- Xóa record trong flyway_schema_history
DELETE FROM flyway_schema_history WHERE version = '3';

-- Chạy lại migration
mvn flyway:migrate
```

---

### Lỗi: "Column already exists"

**Nguyên nhân:** Migration đã chạy trước đó

**Giải pháp:**
```sql
-- Kiểm tra xem column đã tồn tại chưa
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'courses' AND column_name = 'review_comment';

-- Nếu đã tồn tại, không cần làm gì
-- Nếu chưa tồn tại, chạy lại migration
```

---

### Lỗi: "Foreign key constraint fails"

**Nguyên nhân:** Bảng `users` chưa tồn tại hoặc không có column `id`

**Giải pháp:**
```sql
-- Kiểm tra bảng users
SELECT * FROM users LIMIT 1;

-- Nếu không có, cần chạy migration tạo bảng users trước
```

---

## 🔄 Rollback Migration (Nếu cần)

### Rollback với Flyway:

```bash
# Rollback về version trước
mvn flyway:undo
```

### Rollback thủ công:

```sql
-- Xóa các column đã thêm
ALTER TABLE courses
DROP COLUMN IF EXISTS review_comment,
DROP COLUMN IF EXISTS reviewed_at,
DROP COLUMN IF EXISTS reviewed_by_id;

-- Xóa foreign key constraint
ALTER TABLE courses
DROP CONSTRAINT IF EXISTS fk_courses_reviewed_by;

-- Xóa indexes
DROP INDEX IF EXISTS idx_courses_reviewed_by;
DROP INDEX IF EXISTS idx_courses_reviewed_at;

-- Xóa record trong flyway_schema_history
DELETE FROM flyway_schema_history WHERE version = '3';
```

---

## 📊 Kiểm tra dữ liệu sau Migration

### Test với dữ liệu mẫu:

```sql
-- Tạo khóa học test
INSERT INTO courses (id, code, title, description, status, teacher_id, created_at)
VALUES (
    gen_random_uuid(),
    'TEST001',
    'Test Course',
    'Test Description',
    'PENDING',
    (SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1),
    NOW()
);

-- Simulate admin approval
UPDATE courses
SET 
    status = 'APPROVED',
    review_comment = 'Khóa học đã được duyệt',
    reviewed_at = NOW(),
    reviewed_by_id = (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
WHERE code = 'TEST001';

-- Kiểm tra kết quả
SELECT 
    c.code,
    c.title,
    c.status,
    c.review_comment,
    c.reviewed_at,
    u.full_name as reviewed_by
FROM courses c
LEFT JOIN users u ON c.reviewed_by_id = u.id
WHERE c.code = 'TEST001';
```

---

## 🎯 Best Practices

1. **Backup trước khi migrate:**
```bash
# PostgreSQL
pg_dump -U postgres lms_db > backup_before_v3.sql

# MySQL
mysqldump -u root -p lms_db > backup_before_v3.sql
```

2. **Test trên môi trường dev trước:**
```bash
# Set profile to dev
export SPRING_PROFILES_ACTIVE=dev
mvn spring-boot:run
```

3. **Monitor logs khi migrate:**
```bash
tail -f logs/spring.log | grep -i "flyway\|migration"
```

4. **Verify sau khi migrate:**
```bash
# Run integration tests
mvn test -Dtest=AdminControllerIntegrationTest
```

---

## 📞 Hỗ trợ

Nếu gặp vấn đề khi chạy migration:

1. Kiểm tra logs: `logs/spring.log`
2. Kiểm tra Flyway history: `SELECT * FROM flyway_schema_history`
3. Kiểm tra database schema: `\d courses` (PostgreSQL) hoặc `DESCRIBE courses` (MySQL)
4. Liên hệ team dev nếu cần hỗ trợ

---

**Ngày tạo:** 16/11/2025  
**Version:** 1.0  
**Tác giả:** Kiro AI Assistant
