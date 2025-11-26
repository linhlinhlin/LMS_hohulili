# Cleanup Duplicate Quizzes

## Problem
Server Error: "More than one row with the given identifier was found: ce10c56d-52ef-4362-b55c-2617685c52c0, for class: com.example.lms.entity.Quiz"

This error occurs when there are duplicate Quiz records in the database with the same ID.

## Solution

### Option 1: Using the API Endpoint (Recommended)

Call the cleanup endpoint to automatically remove duplicate quizzes:

```bash
curl -X POST http://localhost:8080/api/v1/quizzes/admin/cleanup-duplicates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

This endpoint will:
1. Find all lessons with multiple quizzes
2. Keep only the most recent quiz for each lesson
3. Delete all older duplicate quizzes
4. Return a report of what was cleaned up

### Option 2: Using SQL Script

If you prefer to run SQL directly:

1. Connect to your PostgreSQL database
2. Run the script: `api/cleanup-duplicate-quizzes.sql`

```bash
psql -U postgres -d lms_db -f api/cleanup-duplicate-quizzes.sql
```

### Option 3: Manual Cleanup

If you need to manually identify and delete duplicates:

```sql
-- Find lessons with multiple quizzes
SELECT lesson_id, COUNT(*) as quiz_count, STRING_AGG(id::text, ', ') as quiz_ids
FROM quizzes
WHERE lesson_id IS NOT NULL
GROUP BY lesson_id
HAVING COUNT(*) > 1;

-- For each lesson with duplicates, keep the most recent and delete others
-- Example: If lesson has quizzes with IDs [A, B, C] created at [2024-01-01, 2024-01-02, 2024-01-03]
-- Keep C (most recent) and delete A and B
```

## Prevention

To prevent this issue in the future:

1. Add a unique constraint on (lesson_id) in the quizzes table:
```sql
ALTER TABLE quizzes ADD CONSTRAINT unique_quiz_per_lesson UNIQUE (lesson_id);
```

2. Or modify the Quiz entity to enforce this at the application level:
```java
@Table(name = "quizzes", uniqueConstraints = {
    @UniqueConstraint(columnNames = "lesson_id", name = "unique_quiz_per_lesson")
})
```

## Verification

After cleanup, verify that no duplicates remain:

```sql
SELECT lesson_id, COUNT(*) as quiz_count
FROM quizzes
WHERE lesson_id IS NOT NULL
GROUP BY lesson_id
HAVING COUNT(*) > 1;

-- Should return 0 rows if cleanup was successful
```

## Root Cause Analysis

Duplicate quizzes typically occur when:
1. Quiz creation is called multiple times for the same lesson
2. Transaction rollback doesn't properly clean up
3. Concurrent requests create multiple quizzes simultaneously
4. Database migration issues

## Next Steps

1. Run the cleanup using Option 1 (API endpoint)
2. Monitor for any new duplicate quizzes
3. Consider adding the unique constraint mentioned above
4. Review the quiz creation logic to prevent future duplicates
