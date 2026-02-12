package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.application.dto.CourseDTOs;
import com.example.lms.course_authoring.application.usecase.GetCourseDraftUseCase;
import com.example.lms.course_authoring.application.usecase.CourseAuthoringUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v3/teacher/courses")
@RequiredArgsConstructor
@Tag(name = "Teacher - Courses", description = "Endpoints for teachers to manage their courses")
public class TeacherCoursesControllerV3 {

    private final CourseAuthoringUseCase courseAuthoringUseCase;
    private final GetCourseDraftUseCase getCourseDraftUseCase;
    private final com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl enrollmentRepository;
    private final com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository userRepository;
    private final JpaCourseRepository jpaCourseRepository;
    private final JpaEnrollmentRepository jpaEnrollmentRepository;

    @GetMapping("/my-courses")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get courses created by the current teacher")
    public ResponseEntity<ApiResponse<Page<CourseDTOs.TeacherCourseResponse>>> getMyCourses(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status
    ) {
        if (currentUser == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("AUTH_ERROR", "Người dùng chưa xác thực"));
        }

        int safeSize = Math.min(size, 100);
        PageRequest pageable = PageRequest.of(page, safeSize);
        var response = courseAuthoringUseCase.getMyCourses(currentUser.getId(), pageable);

        // Batch-enrich with real stats (Coursera/Canvas pattern - avoid N+1)
        List<UUID> courseIds = response.getContent().stream()
                .map(CourseDTOs.TeacherCourseResponse::getId)
                .toList();

        if (!courseIds.isEmpty()) {
            Map<UUID, Long> enrollmentMap = new HashMap<>();
            for (Object[] row : jpaEnrollmentRepository.countEnrollmentsByCourseIds(courseIds)) {
                enrollmentMap.put((UUID) row[0], (Long) row[1]);
            }

            Map<UUID, Long> chapterMap = new HashMap<>();
            for (Object[] row : jpaCourseRepository.countChaptersByCourseIds(courseIds)) {
                chapterMap.put((UUID) row[0], (Long) row[1]);
            }

            Map<UUID, Long> lessonMap = new HashMap<>();
            for (Object[] row : jpaCourseRepository.countLessonsByCourseIds(courseIds)) {
                lessonMap.put((UUID) row[0], (Long) row[1]);
            }

            response.getContent().forEach(c -> {
                int enrolled = enrollmentMap.getOrDefault(c.getId(), 0L).intValue();
                c.setEnrolledCount(enrolled);
                c.setStudentsCount(enrolled);
                c.setSectionCount(chapterMap.getOrDefault(c.getId(), 0L).intValue());
                c.setLessonCount(lessonMap.getOrDefault(c.getId(), 0L).intValue());
            });
        }

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Object>> getCourseById(@PathVariable UUID courseId) {
        var draft = getCourseDraftUseCase.execute(courseId);
        return ResponseEntity.ok(ApiResponse.success(draft));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Object>> createCourse(
            @Valid @RequestBody CourseDTOs.CreateCourseRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        var result = courseAuthoringUseCase.createCourse(request, user.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PutMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Object>> updateCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody CourseDTOs.UpdateCourseRequest request) {
        courseAuthoringUseCase.updateCourse(courseId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công"));
    }

    @DeleteMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Object>> deleteCourse(@PathVariable UUID courseId) {
        courseAuthoringUseCase.deleteCourse(courseId);
        return ResponseEntity.ok(ApiResponse.success("Xóa thành công"));
    }

    @PostMapping("/{courseId}/submit-for-approval")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Object>> submitForApproval(@PathVariable UUID courseId) {
        courseAuthoringUseCase.submitForApproval(courseId);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi yêu cầu phê duyệt"));
    }

    @PostMapping("/{courseId}/cancel-approval")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Object>> cancelApproval(@PathVariable UUID courseId) {
        courseAuthoringUseCase.cancelApproval(courseId);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy yêu cầu phê duyệt"));
    }

    @GetMapping("/{courseId}/review-status")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Object>> getReviewStatus(@PathVariable UUID courseId) {
        var status = courseAuthoringUseCase.getReviewStatus(courseId);
        return ResponseEntity.ok(ApiResponse.success(status));
    }
    @GetMapping("/{courseId}/students")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get enrolled students for a course")
    public ResponseEntity<ApiResponse<java.util.List<StudentInfoResponse>>> getCourseStudents(
            @PathVariable UUID courseId
    ) {
        // Find all enrollments for the course
        var enrollments = enrollmentRepository.findByLearningClass_CourseId(courseId);

        var studentIds = enrollments.stream()
                .map(com.example.lms.learning_delivery.domain.model.Enrollment::getStudentId)
                .collect(java.util.stream.Collectors.toSet());

        var studentMap = userRepository.findAllById(studentIds).stream()
                .collect(java.util.stream.Collectors.toMap(UserJpaEntity::getId, u -> u));

        var response = enrollments.stream()
                .map(e -> {
                    String fullName = "Unknown";
                    String email = "Unknown";

                    UserJpaEntity user = studentMap.get(e.getStudentId());
                    if (user != null) {
                        fullName = user.getFullName();
                        email = user.getEmail();
                    }

                    return StudentInfoResponse.builder()
                        .id(e.getStudentId().toString())
                        .fullName(fullName)
                        .email(email)
                        .enrolledAt(e.getJoinedAt() != null ? e.getJoinedAt().toString() : null)
                        .progressPercentage(e.getCompletionPercent())
                        .build();
                })
                .collect(java.util.stream.Collectors.toMap(StudentInfoResponse::getId, p -> p, (p, q) -> p))
                .values().stream().toList();

        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách học viên"));
    }

    @lombok.Builder
    @lombok.Data
    public static class StudentInfoResponse {
        private String id;
        private String fullName;
        private String email;
        private String enrolledAt;
        private Integer progressPercentage;
    }
}
