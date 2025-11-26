# Implementation Guide: Fix Duplicate Quizzes

## Giải pháp lâu dài và hiệu quả

Đã thực hiện các thay đổi sau:

### 1. Database Migration (V999)
- File: `api/src/main/resources/db/migration/V999__cleanup_duplicate_quizzes_and_add_unique_constraint.sql`
- Cleanup tất cả duplicate quizzes (giữ lại quiz gần đây nhất)
- Thêm UNIQUE constraint trên cột `lesson_id`

### 2. Entity Update
- File: `api/src/main/java/com/example/lms/entity/Quiz.java`
- Thêm `@UniqueConstraint` annotation
- Đảm bảo chỉ có 1 quiz per lesson ở mức application

### 3. Service Logic Update
- File: `api/src/main/java/com/example/lms/service/QuizService.java`
- Thêm check: nếu quiz đã tồn tại, return existing quiz
- Xử lý `DataIntegrityViolationException` gracefully
- Tự động return existing quiz nếu có duplicate attempt

## Các bước thực hiện

### Step 1: Build project
```bash
cd api
mvn clean install
```

### Step 2: Run migration
Migration sẽ tự động chạy khi ứng dụng start:
```bash
mvn spring-boot:run
```

### Step 3: Verify cleanup
Kiểm tra database:
```sql
SELECT lesson_id, COUNT(*) as quiz_count
FROM quizzes
WHERE lesson_id IS NOT NULL
GROUP BY lesson_id
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

## Lợi ích

✅ **Ngăn chặn duplicate**: Unique constraint ở database level
✅ **Graceful handling**: Nếu có duplicate attempt, tự động return existing
✅ **Backward compatible**: Không break existing code
✅ **Lâu dài**: Không cần phải cleanup lại trong tương lai

## Testing

Thử tạo 2 quiz cho cùng 1 lesson:
```bash
# Request 1
POST /api/v1/quizzes/lessons/{lessonId}
# Response: Quiz created

# Request 2 (same lessonId)
POST /api/v1/quizzes/lessons/{lessonId}
# Response: Existing quiz returned (không error)
```

## Rollback (nếu cần)

Nếu cần rollback:
```sql
ALTER TABLE quizzes DROP CONSTRAINT unique_quiz_per_lesson;
```
