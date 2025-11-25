# Teacher Test Data - Quick Start Guide

## 📦 Tổng Quan

File `seed-teacher-test-data.sql` tạo dữ liệu mẫu thực tế để test và demo Teacher Domain, bao gồm:
- 2 Teachers
- 10 Students  
- 3 Courses (100, 50, 30 lessons)
- 21 Enrollments
- Realistic progress data

## 🚀 Cách Sử Dụng

### 1. Chạy SQL Script

**Option A: Sử dụng psql command line**
```bash
cd api
psql -U postgres -d lms_db -f seed-teacher-test-data.sql
```

**Option B: Sử dụng DBeaver/pgAdmin**
1. Mở file `seed-teacher-test-data.sql`
2. Execute script
3. Xem output messages

**Option C: Sử dụng Spring Boot**
```bash
# Copy file vào resources/db/migration
cp seed-teacher-test-data.sql src/main/resources/db/migration/V999__seed_teacher_test_data.sql

# Restart application
./mvnw spring-boot:run
```

### 2. Verify Data

```sql
-- Check teachers
SELECT username, full_name, role FROM users WHERE role = 'TEACHER';
-- Expected: 2 rows

-- Check students  
SELECT username, full_name FROM users WHERE role = 'STUDENT';
-- Expected: 10 rows

-- Check courses
SELECT code, title, teacher_id FROM courses;
-- Expected: 3 rows

-- Check enrollments
SELECT c.title, COUNT(ce.student_id) as students
FROM courses c
LEFT JOIN course_enrollments ce ON c.id = ce.course_id
GROUP BY c.id, c.title;
-- Expected: Course 1: 8, Course 2: 8, Course 3: 5

-- Check progress
SELECT 
    u.full_name,
    COUNT(slp.id) as completed,
    ROUND(COUNT(slp.id) * 100.0 / 100, 2) as progress
FROM users u
LEFT JOIN student_lesson_progress slp ON u.id = slp.student_id
WHERE u.role = 'STUDENT'
GROUP BY u.id, u.full_name
ORDER BY progress DESC;
-- Expected: Student01: 80%, Student02: 50%, Student03: 20%, Student04: 5%
```

### 3. Test API

**Login as Teacher:**
```bash
curl -X POST http://localhost:8088/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher1","password":"password123"}'
```

**Get All Students:**
```bash
curl -X GET "http://localhost:8088/api/v1/teacher/students?page=0&size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get Students in Specific Course:**
```bash
curl -X GET "http://localhost:8088/api/v1/teacher/students?courseId=44444444-4444-4444-4444-444444444401" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Search Students:**
```bash
curl -X GET "http://localhost:8088/api/v1/teacher/students?search=Nguyễn" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Dữ Liệu Chi Tiết

### Login Credentials

| Username | Password | Role | Full Name |
|----------|----------|------|-----------|
| teacher1 | password123 | TEACHER | Captain John Smith |
| teacher2 | password123 | TEACHER | Captain Sarah Johnson |
| student01 | password123 | STUDENT | Nguyễn Văn An |
| student02 | password123 | STUDENT | Trần Thị Bình |
| ... | password123 | STUDENT | ... |

### Courses

| Code | Title | Lessons | Students |
|------|-------|---------|----------|
| MAR-SAFE-101 | Maritime Safety | 100 | 8 |
| MAR-NAV-101 | Navigation Basics | 50 | 8 |
| MAR-ENG-101 | Ship Engineering | 30 | 5 |

### Student Progress

| Student | Course 1 | Course 2 | Course 3 | Overall |
|---------|----------|----------|----------|---------|
| Student01 | 80% ⭐⭐⭐⭐⭐ | 0% | 0% | 27% |
| Student02 | 50% ⭐⭐⭐ | 0% | 0% | 17% |
| Student03 | 20% ⭐ | 0% | 0% | 7% |
| Student04 | 5% | 0% | 0% | 2% |
| Student05-10 | 0% | 0% | 0% | 0% |

## 🎯 Test Scenarios

### Scenario 1: High Performer
- Student: student01 (Nguyễn Văn An)
- Progress: 80/100 lessons
- Expected: Shows up at top of list, high progress percentage

### Scenario 2: Struggling Student
- Student: student03 (Lê Văn Cường)
- Progress: 20/100 lessons
- Expected: Needs teacher attention, low progress

### Scenario 3: Multiple Courses
- Students: student01-05
- Enrolled in: 2-3 courses each
- Expected: Overall progress is average of all courses

### Scenario 4: Single Course
- Students: student09-10
- Enrolled in: 1 course only
- Expected: Overall progress = course progress

## 🔧 Troubleshooting

### Issue: "relation does not exist"
**Solution:** Run migrations first
```bash
./mvnw flyway:migrate
```

### Issue: "duplicate key value"
**Solution:** Data already exists, clean up first
```sql
DELETE FROM student_lesson_progress;
DELETE FROM course_enrollments;
DELETE FROM lessons;
DELETE FROM sections;
DELETE FROM courses WHERE teacher_id IN (
    SELECT id FROM users WHERE username IN ('teacher1', 'teacher2')
);
DELETE FROM users WHERE username LIKE 'teacher%' OR username LIKE 'student%';
```

### Issue: "password authentication failed"
**Solution:** Check PostgreSQL credentials in application.yml

## 📈 Performance Benchmarks

Expected performance with this dataset:

| Endpoint | Expected Time | Notes |
|----------|--------------|-------|
| GET /teacher/students | < 500ms | 10 students, 3 courses |
| GET /teacher/students?courseId=X | < 300ms | 5-8 students |
| GET /teacher/students?search=X | < 400ms | Client-side filter |
| GET /teacher/students/{id} | < 200ms | Single student detail |

## 🎨 Visual Structure

```
Teacher1
├── MAR-SAFE-101 (100 lessons)
│   ├── Student01 (80%) ⭐⭐⭐⭐⭐
│   ├── Student02 (50%) ⭐⭐⭐
│   ├── Student03 (20%) ⭐
│   ├── Student04 (5%)
│   └── Student05-08 (0%)
│
├── MAR-NAV-101 (50 lessons)
│   └── Student03-10 (0%)
│
└── MAR-ENG-101 (30 lessons)
    └── Student01-05 (0%)
```

## 📝 Next Steps

1. ✅ Run seed script
2. ✅ Verify data in database
3. ✅ Test API endpoints
4. ✅ Measure performance
5. ✅ Demo to team
6. ✅ Discuss architecture decisions

## 🔗 Related Documents

- `TEACHER_DATA_FLOW_DISCUSSION.md` - Detailed analysis
- `TEACHER_STUDENT_COMPARISON.md` - Architecture comparison
- `.kiro/specs/teacher-domain-comprehensive/` - Full spec

---

**Created:** 2024-11-18  
**Author:** Kiro AI Assistant  
**Purpose:** Testing and demonstration of Teacher Domain
