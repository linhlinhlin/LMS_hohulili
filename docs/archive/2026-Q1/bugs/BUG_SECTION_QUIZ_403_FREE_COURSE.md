# BUG: Student bị 403 khi làm quiz trong khóa học miễn phí

> **Reported**: 2026-03-15 | **Severity**: P0 — Critical (chặn học viên làm bài)
> **Reporter**: QA Team (via Claude Code audit)
> **Status**: Đã deploy và verify production

---

## Mô tả

Học viên (student) không thể làm bài trắc nghiệm (section quiz) trong khóa học **miễn phí** (priceType = FREE). API trả về HTTP 403.

## Reproduce

1. Đăng nhập bằng `student@maritime.edu` / `student123`
2. Vào khóa học "mmm" (id: `a2120d11-...`, priceType: FREE)
3. Vào bài học → click làm quiz
4. **Kết quả**: Trang trắng, console 403

**URL test trực tiếp**:
```
GET /api/v3/quizzes/lessons/49c6721b-.../sections/1a78ccad-...
Authorization: Bearer {student_token}
→ HTTP 403 (empty body)
```

## Root Cause

File: `backend/.../assessment/infrastructure/web/QuizControllerV3.java`
Method: `verifySectionQuizAccess()` (line 686-701)

```java
private void verifySectionQuizAccess(CourseJpaEntity course, LessonJpaEntity lesson, UserJpaEntity user) {
    if (user.getRole() == UserJpaEntity.UserRole.STUDENT) {
        boolean lessonFree = Boolean.TRUE.equals(lesson.getIsFree());  // ← kiểm tra lesson.isFree
        boolean paid = paymentTransactionJpaRepository.existsByStudentIdAndCourseIdAndStatus(
                user.getId(), course.getId(),
                PaymentTransactionJpaEntity.PaymentStatus.COMPLETED);  // ← kiểm tra payment
        if (!lessonFree && !paid) {
            throw new AccessDeniedException("Bạn cần thanh toán để mở bài kiểm tra này");
        }
    }
}
```

**Vấn đề**: Access check chỉ kiểm tra 2 điều kiện:
1. `lesson.isFree` → FALSE (lesson không được đánh dấu free riêng)
2. `paymentTransaction.COMPLETED` → không tồn tại (khóa học miễn phí → không có payment)

**Thiếu kiểm tra**:
- `course.priceType == FREE` → khóa học miễn phí → nên cho truy cập
- `enrollment` → student đã enroll → nên cho truy cập

## Đề xuất fix

```java
private void verifySectionQuizAccess(CourseJpaEntity course, LessonJpaEntity lesson, UserJpaEntity user) {
    if (user.getRole() == UserJpaEntity.UserRole.STUDENT) {
        // FREE courses → always accessible
        if (course.getPriceType() == CourseJpaEntity.PriceType.FREE) return;

        // Free lesson → accessible
        if (Boolean.TRUE.equals(lesson.getIsFree())) return;

        // Enrolled → accessible
        boolean enrolled = enrollmentJpaRepository.existsByStudentIdAndCourseId(user.getId(), course.getId());
        if (enrolled) return;

        // Paid → accessible
        boolean paid = paymentTransactionJpaRepository.existsByStudentIdAndCourseIdAndStatus(
                user.getId(), course.getId(),
                PaymentTransactionJpaEntity.PaymentStatus.COMPLETED);
        if (paid) return;

        throw new AccessDeniedException("Bạn cần đăng ký hoặc thanh toán để mở bài kiểm tra này");
    }
    verifyLessonOwnership(lesson.getId(), user);
}
```

## Tác động

- **Tất cả student** không thể làm quiz trong khóa học FREE
- Khóa học PAID cũng bị nếu student enrolled qua admin (không qua payment flow)
- Ảnh hưởng cả section quiz GET + POST submit endpoints (cùng dùng `verifySectionQuizAccess`)

## Files liên quan

| File | Line | Mô tả |
|------|------|-------|
| `QuizControllerV3.java` | 274-288 | `getSectionQuiz()` — GET section quiz |
| `QuizControllerV3.java` | 290-320 | `submitSectionQuiz()` — POST submit answers |
| `QuizControllerV3.java` | 686-701 | `verifySectionQuizAccess()` — access check (BUG HERE) |

## Dữ liệu test

- Course: `a2120d11-b347-4e6b-92e4-dc7b2433416b` (title: "mmm", priceType: FREE)
- Lesson: `49c6721b-73a7-457e-94f3-f4cee2069845` (title: "Bài 1: 7")
- Section: `1a78ccad-b844-4d6b-bb74-4778b70a863c` (type: QUIZ, title: "1.1:", 1 question)
- Student: `student@maritime.edu` / `student123`

## Verify production

- Ngày verify: `2026-03-15`
- `GET /api/v3/quizzes/lessons/49c6721b-73a7-457e-94f3-f4cee2069845/sections/1a78ccad-b844-4d6b-bb74-4778b70a863c`
  - Kết quả: `HTTP 200`
  - Payload: title `1.1:`, `1` câu hỏi
- `POST /api/v3/quizzes/lessons/49c6721b-73a7-457e-94f3-f4cee2069845/sections/1a78ccad-b844-4d6b-bb74-4778b70a863c/submit`
  - Kết quả: `HTTP 200`
  - Payload: `status = SUBMITTED`, `score = 100`, `totalQuestions = 1`
