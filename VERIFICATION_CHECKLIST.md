# Verification Checklist

## Pre-Deployment

- [ ] Code changes reviewed
- [ ] No compilation errors
- [ ] Migration file created and valid

## Deployment

- [ ] Build project: `mvn clean install`
- [ ] Start application: `mvn spring-boot:run`
- [ ] Wait for migration to complete (check logs)
- [ ] No migration errors in logs

## Post-Deployment Verification

### Database Check
- [ ] Run: `SELECT lesson_id, COUNT(*) FROM quizzes WHERE lesson_id IS NOT NULL GROUP BY lesson_id HAVING COUNT(*) > 1;`
- [ ] Result: 0 rows (no duplicates)

### Constraint Verification
- [ ] Run: `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='quizzes' AND constraint_type='UNIQUE';`
- [ ] Result: Should include `unique_quiz_per_lesson`

### Application Test
- [ ] Create a quiz for a lesson
- [ ] Try to create another quiz for same lesson
- [ ] Verify: Second request returns existing quiz (no error)

### Log Verification
- [ ] Check application logs for migration success message
- [ ] Check for any DataIntegrityViolationException handling logs
- [ ] No errors related to quiz creation

## Functional Testing

### Test Case 1: Normal Quiz Creation
```
1. Create lesson
2. Create quiz for lesson
3. Verify quiz created successfully
✅ Expected: Quiz created
```

### Test Case 2: Duplicate Quiz Prevention
```
1. Create lesson
2. Create quiz for lesson (Quiz A)
3. Try to create another quiz for same lesson
4. Verify response
✅ Expected: Returns Quiz A (same ID, no error)
```

### Test Case 3: Multiple Lessons
```
1. Create lesson 1
2. Create lesson 2
3. Create quiz for lesson 1
4. Create quiz for lesson 2
5. Verify both quizzes exist
✅ Expected: Both quizzes created successfully
```

### Test Case 4: Quiz Operations
```
1. Create quiz
2. Add questions to quiz
3. Update quiz settings
4. Delete quiz
✅ Expected: All operations work normally
```

## Rollback Plan (if needed)

If issues occur:
1. Stop application
2. Run: `ALTER TABLE quizzes DROP CONSTRAINT unique_quiz_per_lesson;`
3. Restart application
4. Investigate root cause

## Sign-Off

- [ ] All checks passed
- [ ] No errors in logs
- [ ] Functional tests passed
- [ ] Ready for production

**Verified by**: _______________
**Date**: _______________
**Notes**: _______________
