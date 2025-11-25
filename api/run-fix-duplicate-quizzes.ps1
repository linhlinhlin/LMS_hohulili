# PowerShell script to fix duplicate quizzes
# This script connects to PostgreSQL and runs the fix

$env:PGPASSWORD = "ho_hu_li_li_"

# First, check for duplicates
Write-Host "=== Step 1: Checking for duplicate quizzes ===" -ForegroundColor Cyan

$checkQuery = @"
SELECT 
    lesson_id, 
    COUNT(*) as quiz_count
FROM quizzes 
GROUP BY lesson_id 
HAVING COUNT(*) > 1;
"@

Write-Host "Running query to find duplicates..."
psql -h aws-1-ap-southeast-1.pooler.supabase.com -p 5432 -U "postgres.rljldvpboqapokzecfff" -d postgres -c "$checkQuery"

Write-Host ""
Write-Host "=== Step 2: View details of duplicate quizzes ===" -ForegroundColor Cyan

$detailQuery = @"
SELECT 
    q.id as quiz_id,
    q.lesson_id,
    q.title,
    q.created_at,
    (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count
FROM quizzes q
WHERE q.lesson_id IN (
    SELECT lesson_id 
    FROM quizzes 
    GROUP BY lesson_id 
    HAVING COUNT(*) > 1
)
ORDER BY q.lesson_id, q.created_at DESC;
"@

psql -h aws-1-ap-southeast-1.pooler.supabase.com -p 5432 -U "postgres.rljldvpboqapokzecfff" -d postgres -c "$detailQuery"

Write-Host ""
Write-Host "=== Step 3: Delete older duplicate quizzes (keeping most recent) ===" -ForegroundColor Yellow

# Delete quiz_questions for older duplicates
$deleteQuizQuestionsQuery = @"
DELETE FROM quiz_questions 
WHERE quiz_id IN (
    SELECT q.id 
    FROM quizzes q
    WHERE q.lesson_id IN (
        SELECT lesson_id 
        FROM quizzes 
        GROUP BY lesson_id 
        HAVING COUNT(*) > 1
    )
    AND q.id NOT IN (
        SELECT DISTINCT ON (lesson_id) id 
        FROM quizzes 
        ORDER BY lesson_id, created_at DESC
    )
);
"@

Write-Host "Deleting quiz_questions for older duplicates..."
psql -h aws-1-ap-southeast-1.pooler.supabase.com -p 5432 -U "postgres.rljldvpboqapokzecfff" -d postgres -c "$deleteQuizQuestionsQuery"

# Delete quiz_attempts for older duplicates (if table exists)
$deleteAttemptsQuery = @"
DELETE FROM quiz_attempts 
WHERE quiz_id IN (
    SELECT q.id 
    FROM quizzes q
    WHERE q.lesson_id IN (
        SELECT lesson_id 
        FROM quizzes 
        GROUP BY lesson_id 
        HAVING COUNT(*) > 1
    )
    AND q.id NOT IN (
        SELECT DISTINCT ON (lesson_id) id 
        FROM quizzes 
        ORDER BY lesson_id, created_at DESC
    )
);
"@

Write-Host "Deleting quiz_attempts for older duplicates..."
psql -h aws-1-ap-southeast-1.pooler.supabase.com -p 5432 -U "postgres.rljldvpboqapokzecfff" -d postgres -c "$deleteAttemptsQuery" 2>$null

# Delete the older duplicate quizzes
$deleteQuizzesQuery = @"
DELETE FROM quizzes 
WHERE lesson_id IN (
    SELECT lesson_id 
    FROM quizzes 
    GROUP BY lesson_id 
    HAVING COUNT(*) > 1
)
AND id NOT IN (
    SELECT DISTINCT ON (lesson_id) id 
    FROM quizzes 
    ORDER BY lesson_id, created_at DESC
);
"@

Write-Host "Deleting older duplicate quizzes..."
psql -h aws-1-ap-southeast-1.pooler.supabase.com -p 5432 -U "postgres.rljldvpboqapokzecfff" -d postgres -c "$deleteQuizzesQuery"

Write-Host ""
Write-Host "=== Step 4: Verify no more duplicates ===" -ForegroundColor Green
psql -h aws-1-ap-southeast-1.pooler.supabase.com -p 5432 -U "postgres.rljldvpboqapokzecfff" -d postgres -c "$checkQuery"

Write-Host ""
Write-Host "Done! Duplicate quizzes have been cleaned up." -ForegroundColor Green
