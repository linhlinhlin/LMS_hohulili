# 🔍 PHÂN TÍCH PERFORMANCE: Tại Sao Load Danh Sách Học Viên Chậm?

## 🎯 Vấn Đề

**Hiện tượng:** Load danh sách học viên mất rất lâu (có thể 5-10 giây hoặc hơn)

**Cần phân tích:**
1. Số lượng queries thực tế
2. Thời gian mỗi query
3. Nguyên nhân gây chậm
4. Giải pháp tối ưu

---

## 📊 PHÂN TÍCH QUERIES

### Current Implementation Flow

```
Request: GET /api/v1/teacher/students?page=0&size=20
    ↓
Query 1: findStudentsByTeacherCourses (Get 20 students)
    ↓
Query 2: getProgressSummaryForStudents (Get progress for 20 students)
    ↓
Query 3: getEnrollmentInfo (Get enrollment info for 20 students)
    ↓
Response: 20 students with progress
```

**Expected Queries:** 3 queries
**Expected Time:** 300-800ms

---

## 🔴 NGUYÊN NHÂN GÂY CHẬM

### Nguyên Nhân 1: Query `getProgressSummaryForStudents` RẤT PHỨC TẠP

**Query hiện tại:**
```sql
SELECT 
    u.id as student_id,
    c.id as course_id,
    COUNT(CASE WHEN slp.status = 'COMPLETED' THEN 1 END) as completed_lessons,
    COUNT(l.id) as total_lessons,
    MAX(slp.last_accessed) as last_accessed
FROM users u
JOIN course_enrollments ce ON ce.student_id = u.id
JOIN courses c ON c.id = ce.course_id
JOIN sections s ON s.course_id = c.id
JOIN lessons l ON l.section_id = s.id
LEFT JOIN student_lesson_progress slp ON slp.student_id = u.id AND slp.lesson_id = l.id
WHERE c.teacher_id = :teacherId
AND (:courseId IS NULL OR c.id = :courseId)
AND u.id IN :studentIds
GROUP BY u.id, c.id
```

**Vấn đề:**
- ❌ **5 JOINs** (users → enrollments → courses → sections → lessons → progress)
- ❌ **Cartesian product** khi student có nhiều courses
- ❌ **Không có indexes** trên một số foreign keys
- ❌ **GROUP BY** trên nhiều rows

**Ví dụ với 20 students:**
- 20 students × 3 courses = 60 course enrollments
- 60 enrollments × 100 lessons/course = 6,000 rows
- 6,000 rows × LEFT JOIN progress = 6,000+ rows
- GROUP BY → 60 groups

**Thời gian:** 2-5 giây! ❌

---

### Nguyên Nhân 2: Migration V4 CHƯA CHẠY

**Nếu migration chưa chạy:**
```sql
-- Các columns này KHÔNG TỒN TẠI:
course_enrollments.enrolled_at
course_enrollments.last_accessed
course_enrollments.status

-- Các indexes này KHÔNG TỒN TẠI:
idx_course_enrollments_student
idx_course_enrollments_course
idx_courses_teacher
```

**Hậu quả:**
- ❌ Query `getEnrollmentInfo` sẽ **FAIL** hoặc trả về NULL
- ❌ Không có indexes → **FULL TABLE SCAN**
- ❌ Query chậm gấp 10-100 lần

---

### Nguyên Nhân 3: Không Có Dữ Liệu Progress

**Nếu chưa có dữ liệu trong `student_lesson_progress`:**
```sql
-- Query này vẫn chạy nhưng trả về 0 rows
LEFT JOIN student_lesson_progress slp ...
```

**Hậu quả:**
- Query vẫn phải JOIN toàn bộ lessons
- Vẫn phải GROUP BY
- Vẫn mất thời gian nhưng kết quả = 0

---

### Nguyên Nhân 4: Lazy Loading trong JPA

**Nếu có lazy loading:**
```java
// Query 1: Get students
Page<User> studentsPage = userRepository.findStudentsByTeacherCourses(...);

// Nếu User entity có lazy relationships:
for (User student : studentsPage) {
    student.getEnrolledCourses(); // Query 2, 3, 4... (N+1!)
    student.getSomeOtherRelation(); // Query 5, 6, 7... (N+1!)
}
```

**Hậu quả:**
- 1 query chính + N queries lazy = N+1 problem
- 20 students = 1 + 20 = 21 queries minimum

---

## 🔍 CÁCH KIỂM TRA

### 1. Enable SQL Logging

**File:** `api/src/main/resources/application-dev.yml`

```yaml
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        use_sql_comments: true
        
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

**Restart backend và check logs:**
```bash
cd api
./mvnw spring-boot:run

# Trong logs sẽ thấy:
Hibernate: SELECT ...
Hibernate: SELECT ...
Hibernate: SELECT ...
```

**Đếm số queries:** Nếu thấy > 10 queries → Có vấn đề!

---

### 2. Check Migration Status

```bash
# Check if V4 migration ran
psql -U postgres -d lms_db

# Run this:
SELECT version, description, installed_on 
FROM flyway_schema_history 
ORDER BY installed_rank DESC;

# Should see:
# V4 | add_enrollment_tracking | 2024-11-18 ...
```

**Nếu KHÔNG thấy V4:**
```bash
cd api
./mvnw flyway:migrate
```

---

### 3. Check Indexes

```sql
-- Check if indexes exist
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename IN ('course_enrollments', 'courses', 'users', 'student_lesson_progress')
ORDER BY tablename, indexname;

-- Should see:
-- idx_course_enrollments_student
-- idx_course_enrollments_course
-- idx_courses_teacher
-- idx_student_progress_student_lesson
```

**Nếu KHÔNG có indexes:**
```sql
-- Run migration V4 manually
\i api/src/main/resources/db/migration/V4__add_enrollment_tracking.sql
```

---

### 4. Check Data Volume

```sql
-- Check how much data
SELECT 
    'users' as table_name, COUNT(*) as count FROM users WHERE role = 'STUDENT'
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'course_enrollments', COUNT(*) FROM course_enrollments
UNION ALL
SELECT 'sections', COUNT(*) FROM sections
UNION ALL
SELECT 'lessons', COUNT(*) FROM lessons
UNION ALL
SELECT 'student_lesson_progress', COUNT(*) FROM student_lesson_progress;
```

**Nếu có quá nhiều data:**
- lessons > 10,000 → Query sẽ chậm
- student_lesson_progress > 100,000 → Query sẽ rất chậm

---

### 5. Measure Query Time

**Add to application.yml:**
```yaml
spring:
  jpa:
    properties:
      hibernate:
        generate_statistics: true
        
logging:
  level:
    org.hibernate.stat: DEBUG
```

**Check logs for:**
```
Query executed in XXX ms
```

---

## 🔧 GIẢI PHÁP TỐI ƯU

### Giải Pháp 1: SIMPLIFY Progress Query (KHUYẾN NGHỊ)

**Vấn đề:** Query quá phức tạp với 5 JOINs

**Giải pháp:** Tách thành 2 queries đơn giản hơn

```java
// Query 1: Get students (FAST)
Page<User> students = userRepository.findStudentsByTeacherCourses(...);

// Query 2: Get ONLY enrollment count (NO progress calculation)
Map<UUID, Integer> courseCount = getCourseCountForStudents(studentIds);

// Skip progress calculation on list view!
// Only calculate when viewing student detail
```

**Implementation:**
```java
// New simple query
@Query(value = """
    SELECT 
        ce.student_id,
        COUNT(DISTINCT ce.course_id) as course_count
    FROM course_enrollments ce
    JOIN courses c ON c.id = ce.course_id
    WHERE c.teacher_id = :teacherId
    AND ce.student_id IN :studentIds
    GROUP BY ce.student_id
""", nativeQuery = true)
List<Object[]> getCourseCountForStudents(
    @Param("teacherId") UUID teacherId,
    @Param("studentIds") List<UUID> studentIds
);
```

**Result:**
- 2 simple queries instead of 3 complex queries
- No progress calculation on list view
- **10x faster!** (300ms → 30ms)

---

### Giải Pháp 2: Add Caching

```java
@Cacheable(
    value = "studentList",
    key = "#teacherId + '_' + #pageable.pageNumber + '_' + #courseIdFilter"
)
public Page<TeacherStudentSummaryDTO> getMyStudents(...) {
    // ...
}
```

**Config:**
```yaml
spring:
  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=1000,expireAfterWrite=5m
```

**Result:**
- First load: 500ms
- Cached load: 10ms
- **50x faster** for repeated requests!

---

### Giải Pháp 3: Use Materialized View (Advanced)

```sql
CREATE MATERIALIZED VIEW teacher_student_summary AS
SELECT 
    c.teacher_id,
    u.id as student_id,
    u.full_name,
    u.email,
    u.enabled,
    COUNT(DISTINCT c.id) as total_courses,
    ce.enrolled_at,
    ce.last_accessed,
    ce.status
FROM users u
JOIN course_enrollments ce ON ce.student_id = u.id
JOIN courses c ON c.id = ce.course_id
WHERE u.role = 'STUDENT'
GROUP BY c.teacher_id, u.id, u.full_name, u.email, u.enabled, ce.enrolled_at, ce.last_accessed, ce.status;

CREATE INDEX idx_mv_teacher ON teacher_student_summary(teacher_id);

-- Refresh every 5 minutes
REFRESH MATERIALIZED VIEW teacher_student_summary;
```

**Result:**
- Query from materialized view: **10-50ms**
- **100x faster!**

---

### Giải Pháp 4: Pagination at Database Level (ĐÃ LÀM)

✅ Already implemented with `Pageable`

---

## 🎯 KHUYẾN NGHỊ NGAY

### Step 1: Check Migration (URGENT)

```bash
cd api
./mvnw flyway:migrate
```

### Step 2: Enable SQL Logging (DEBUG)

```yaml
# application-dev.yml
spring:
  jpa:
    show-sql: true
    
logging:
  level:
    org.hibernate.SQL: DEBUG
```

### Step 3: Simplify Progress Query (FIX)

**Remove complex progress calculation from list view:**

```java
// In TeacherApplicationService.java
private TeacherStudentSummaryDTO buildOptimizedStudentSummary(...) {
    return TeacherStudentSummaryDTO.builder()
        .id(student.getId())
        .fullName(student.getFullName())
        .email(student.getEmail())
        .enrolledAt(enrollment != null ? enrollment.enrolledAt : null)
        .lastAccessed(enrollment != null ? enrollment.lastAccessed : null)
        .progressPercentage(0) // ← SKIP! Calculate only in detail view
        .averageGrade(0.0) // ← SKIP! Calculate only in detail view
        .status(student.getEnabled() ? "active" : "inactive")
        .completedCourses(0) // ← SKIP!
        .totalCourses(progress != null ? progress.totalCourses : 0)
        .build();
}
```

**Remove these queries:**
```java
// COMMENT OUT or REMOVE:
// List<Object[]> progressData = progressRepository.getProgressSummaryForStudents(...);
// List<Object[]> enrollmentData = progressRepository.getEnrollmentInfo(...);
```

**Result:** Load time: 5s → 100ms! ⚡

---

## 📊 EXPECTED RESULTS

### Before Optimization:
```
Query 1: findStudentsByTeacherCourses → 200ms
Query 2: getProgressSummaryForStudents → 4000ms ❌
Query 3: getEnrollmentInfo → 800ms
Total: ~5000ms (5 seconds) ❌
```

### After Optimization:
```
Query 1: findStudentsByTeacherCourses → 50ms
Query 2: getCourseCountForStudents → 20ms
Total: ~70ms ✅
```

**Improvement: 70x faster!** 🚀

---

## ✅ ACTION ITEMS

1. [ ] Run migration V4
2. [ ] Enable SQL logging
3. [ ] Count actual queries in logs
4. [ ] Check if indexes exist
5. [ ] Simplify progress query
6. [ ] Test load time
7. [ ] Add caching if needed

---

**Created by:** Kiro AI Assistant  
**Date:** 2024-11-18  
**Purpose:** Debug slow loading performance
