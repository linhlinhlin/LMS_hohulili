# Bug Fix: Khóa học mới tạo có status PENDING thay vì DRAFT

## Vấn đề
Sau khi teacher tạo khóa học mới, khóa học có status PENDING thay vì DRAFT, khiến teacher không thể sửa khóa học ngay sau khi tạo.

## Error Log
```
Khóa học đang được kiểm duyệt hoặc chưa được công khai
API Error: _HttpErrorResponse {status: 404, url: 'http://localhost:8088/api/v1/courses/a3c021b4-8ab0-48da-acac-3fdd9bbef1f9'}
```

## Nguyên nhân
Backend logic trong `CourseService.createCourse()` đã đúng - set status là DRAFT:
```java
Course course = Course.builder()
        .code(request.getCode())
        .title(request.getTitle())
        .description(request.getDescription())
        .teacher(teacher)
        .status(Course.CourseStatus.DRAFT)  // ✅ Đúng
        .build();
```

Nhưng có thể có một trong các vấn đề sau:
1. Database migration không đúng
2. Entity Course có default value là PENDING
3. Có trigger hoặc logic nào đó tự động chuyển status

## Giải pháp cần kiểm tra

### 1. Kiểm tra Entity Course
Xem có default value nào không:
```java
@Enumerated(EnumType.STRING)
@Column(name = "status", nullable = false)
private CourseStatus status = CourseStatus.DRAFT; // Phải là DRAFT
```

### 2. Kiểm tra Database Migration
Xem migration có set default value đúng không

### 3. Kiểm tra logic getCourseById
Logic hiện tại:
```java
boolean isTeacherOfCourse = currentUser != null && 
                           course.getTeacher() != null && 
                           course.getTeacher().getId().equals(currentUser.getId());

if (!isTeacherOfCourse && course.getStatus() != Course.CourseStatus.APPROVED) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error("Khóa học đang được kiểm duyệt hoặc chưa được công khai"));
}
```

Vấn đề có thể là `currentUser` null hoặc teacher ID không khớp.

## Hành động tiếp theo
1. Kiểm tra Entity Course xem có default value
2. Kiểm tra database xem khóa học mới tạo có status gì
3. Thêm logging để debug
