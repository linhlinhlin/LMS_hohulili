# Solution Summary: Fix Duplicate Quizzes

## Problem
```
Server Error: More than one row with the given identifier was found: 
ce10c56d-52ef-4362-b55c-2617685c52c0, for class: com.example.lms.entity.Quiz
```

## Root Cause
- Có nhiều bản ghi Quiz với cùng ID trong database
- Xảy ra khi quiz được tạo nhiều lần cho cùng 1 lesson
- Không có unique constraint để ngăn chặn

## Solution Implemented

### 1. Database Cleanup (Migration V999)
**File**: `api/src/main/resources/db/migration/V999__cleanup_duplicate_quizzes_and_add_unique_constraint.sql`

- Xóa tất cả duplicate quiz_questions
- Xóa tất cả duplicate quizzes (giữ lại quiz gần đây nhất)
- Thêm UNIQUE constraint: `UNIQUE (lesson_id)`

### 2. Entity Update
**File**: `api/src/main/java/com/example/lms/entity/Quiz.java`

```java
@Table(
    name = "quizzes",
    uniqueConstraints = {
        @UniqueConstraint(
            columnNames = "lesson_id",
            name = "unique_quiz_per_lesson"
        )
    }
)
```

### 3. Service Logic Enhancement
**File**: `api/src/main/java/com/example/lms/service/QuizService.java`

- Check nếu quiz đã tồn tại trước khi tạo
- Xử lý `DataIntegrityViolationException` gracefully
- Tự động return existing quiz nếu có duplicate attempt

## Implementation Steps

### Step 1: Build
```bash
cd api
mvn clean install
```

### Step 2: Run Application
```bash
mvn spring-boot:run
```
Migration sẽ tự động chạy

### Step 3: Verify
```sql
-- Check no duplicates remain
SELECT lesson_id, COUNT(*) as quiz_count
FROM quizzes
WHERE lesson_id IS NOT NULL
GROUP BY lesson_id
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

## Benefits

✅ **Permanent Fix**: Unique constraint ở database level
✅ **Graceful Handling**: Không throw error, return existing quiz
✅ **Backward Compatible**: Không break existing code
✅ **No Future Issues**: Không cần cleanup lại

## Testing

### Test 1: Create quiz twice
```bash
# First request
POST /api/v1/quizzes/lessons/{lessonId}
# Response: Quiz created with ID: ABC123

# Second request (same lessonId)
POST /api/v1/quizzes/lessons/{lessonId}
# Response: Quiz returned with ID: ABC123 (same ID)
```

### Test 2: Verify constraint
```bash
# Try to insert duplicate directly (should fail)
INSERT INTO quizzes (id, lesson_id, ...) VALUES (UUID1, LESSON_ID, ...);
INSERT INTO quizzes (id, lesson_id, ...) VALUES (UUID2, LESSON_ID, ...);
-- Second insert will fail with unique constraint violation
```

## Files Modified

1. ✅ `api/src/main/java/com/example/lms/entity/Quiz.java`
   - Added @UniqueConstraint annotation

2. ✅ `api/src/main/java/com/example/lms/service/QuizService.java`
   - Added duplicate check in createQuiz()
   - Added DataIntegrityViolationException handling
   - Added import for DataIntegrityViolationException

3. ✅ `api/src/main/resources/db/migration/V999__cleanup_duplicate_quizzes_and_add_unique_constraint.sql`
   - New migration file for cleanup and constraint

## Files Created

1. 📄 `IMPLEMENTATION_GUIDE.md` - Step-by-step guide
2. 📄 `SOLUTION_SUMMARY.md` - This file
3. 📄 `test-duplicate-quiz-fix.sh` - Test script
4. 📄 `CLEANUP_DUPLICATE_QUIZZES.md` - Original cleanup guide
5. 📄 `api/cleanup-duplicate-quizzes.sql` - SQL cleanup script

## Next Steps

1. Build and run the application
2. Migration will automatically cleanup duplicates
3. Verify no duplicates remain in database
4. Test creating quizzes for same lesson (should work without error)

## Rollback (if needed)

```sql
ALTER TABLE quizzes DROP CONSTRAINT unique_quiz_per_lesson;
```

But this is not recommended as it will allow duplicates again.
