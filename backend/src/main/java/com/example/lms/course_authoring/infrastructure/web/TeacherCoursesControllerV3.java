package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.application.dto.CourseDTOs;
import com.example.lms.course_authoring.application.dto.AuthoringDTOs;
import com.example.lms.course_authoring.application.usecase.GetCourseDraftUseCase;
import com.example.lms.course_authoring.application.usecase.CourseAuthoringUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.service.AdaptiveVideoPlaybackService;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetPresentationService;
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
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewJpaRepository courseReviewRepository;
    private final com.example.lms.course_authoring.infrastructure.service.CoursePublicationService coursePublicationService;
    private final VideoAssetPresentationService videoAssetPresentationService;
    private final AdaptiveVideoPlaybackService adaptiveVideoPlaybackService;
    private final com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository classTeacherJpaRepository;
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewEventJpaRepository reviewEventRepository;

    @GetMapping("/my-courses")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
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

        // Google Classroom pattern: include co-taught courses in the same list
        Page<CourseDTOs.TeacherCourseResponse> response = jpaCourseRepository
                .findByTeacherIdIncludingCoTeaching(currentUser.getId(), pageable)
                .map(entity -> mapEntityToResponse(entity, currentUser.getId()));

        // Batch-enrich with real stats (Coursera/Canvas pattern - avoid N+1)
        List<UUID> courseIds = response.getContent().stream()
                .map(CourseDTOs.TeacherCourseResponse::getId)
                .toList();

        if (!courseIds.isEmpty()) {
            Map<UUID, Long> studentCountMap = new HashMap<>();
            for (Object[] row : jpaEnrollmentRepository.countDistinctStudentsGroupedByCourseIds(courseIds)) {
                studentCountMap.put((UUID) row[0], (Long) row[1]);
            }

            Map<UUID, Long> chapterMap = new HashMap<>();
            for (Object[] row : jpaCourseRepository.countChaptersByCourseIds(courseIds)) {
                chapterMap.put((UUID) row[0], (Long) row[1]);
            }

            Map<UUID, Long> lessonMap = new HashMap<>();
            for (Object[] row : jpaCourseRepository.countLessonsByCourseIds(courseIds)) {
                lessonMap.put((UUID) row[0], (Long) row[1]);
            }

            Map<UUID, Double> ratingMap = new HashMap<>();
            for (Object[] row : courseReviewRepository.getAverageRatingsByCourseIds(courseIds)) {
                ratingMap.put((UUID) row[0], Math.round((Double) row[1] * 10.0) / 10.0);
            }

            // Latest rejection category/reason per course (for UI banner on rejected drafts).
            Map<UUID, com.example.lms.course_authoring.infrastructure.persistence.entity.CourseReviewEventJpaEntity> latestRejectionMap = new HashMap<>();
            for (var ev : reviewEventRepository.findByCourseIdInOrderByCreatedAtDesc(courseIds)) {
                if (!"REJECTED".equals(ev.getAction()) && !"CHANGES_REQUESTED".equals(ev.getAction())) {
                    continue;
                }
                latestRejectionMap.putIfAbsent(ev.getCourseId(), ev);
            }

            response.getContent().forEach(c -> {
                int enrolled = studentCountMap.getOrDefault(c.getId(), 0L).intValue();
                c.setEnrolledCount(enrolled);
                c.setStudentsCount(enrolled);
                c.setSectionCount(chapterMap.getOrDefault(c.getId(), 0L).intValue());
                c.setLessonCount(lessonMap.getOrDefault(c.getId(), 0L).intValue());
                c.setAverageRating(ratingMap.getOrDefault(c.getId(), 0.0));

                var rejectionEv = latestRejectionMap.get(c.getId());
                if (rejectionEv != null) {
                    c.setRejectionReason(rejectionEv.getComment());
                    c.setRejectionCategory(rejectionEv.getRejectionCategory());
                }
            });
        }

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Maps status + draftChangeStatus to a workflow state string that matches
     * AdminCoursesControllerV3.resolveReviewState() so FE can share badge logic.
     */
    private String resolveTeacherReviewState(String statusStr, String draftStatusStr) {
        if (statusStr == null) return "draft";
        String s = statusStr.toUpperCase();
        if (!"APPROVED".equals(s) && !"PUBLISHED".equals(s)) {
            return s.toLowerCase();
        }
        if (draftStatusStr == null) return "approved";
        return switch (draftStatusStr) {
            case "PENDING_REVIEW" -> "pending_changes";
            case "CHANGES_REQUESTED" -> "changes_requested";
            case "DRAFT" -> "draft_changes";
            default -> "approved";
        };
    }

    @GetMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> getCourseById(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        var draft = getCourseDraftUseCase.execute(courseId);
        enrichIntroVideoAsset(draft, user);
        return ResponseEntity.ok(ApiResponse.success(draft));
    }

    @GetMapping("/{courseId}/draft/content")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> getCourseDraftContent(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        return ResponseEntity.ok(ApiResponse.success(coursePublicationService.getDraftContent(courseId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> createCourse(
            @Valid @RequestBody CourseDTOs.CreateCourseRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        var result = courseAuthoringUseCase.createCourse(request, user.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PutMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> updateCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody CourseDTOs.UpdateCourseRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        courseAuthoringUseCase.updateCourse(courseId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công"));
    }

    @DeleteMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> deleteCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        courseAuthoringUseCase.deleteCourse(courseId);
        return ResponseEntity.ok(ApiResponse.success("Xóa thành công"));
    }

    @PostMapping("/{courseId}/submit-for-approval")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> submitForApproval(
            @PathVariable UUID courseId,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        String releaseNotes = body != null ? body.get("releaseNotes") : null;
        courseAuthoringUseCase.submitForApproval(courseId, user.getId(), releaseNotes);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi yêu cầu phê duyệt"));
    }

    @PostMapping("/{courseId}/cancel-approval")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> cancelApproval(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        courseAuthoringUseCase.cancelApproval(courseId);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy yêu cầu phê duyệt"));
    }

    @GetMapping("/{courseId}/review-status")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> getReviewStatus(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        var status = courseAuthoringUseCase.getReviewStatus(courseId);
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    @GetMapping("/{courseId}/review-history")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> getReviewHistory(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        var events = reviewEventRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        var responses = events.stream().map(e -> {
            String reviewerName = null;
            if (e.getReviewerId() != null) {
                reviewerName = userRepository.findById(e.getReviewerId())
                        .map(UserJpaEntity::getFullName)
                        .orElse(null);
            }
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("id", e.getId().toString());
            payload.put("action", e.getAction());
            payload.put("comment", e.getComment() != null ? e.getComment() : "");
            payload.put("reviewerName", reviewerName != null ? reviewerName : "");
            payload.put("createdAt", e.getCreatedAt().toString());
            payload.put("rejectionCategory", e.getRejectionCategory());
            return payload;
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(responses));
    }
    @GetMapping("/{courseId}/students")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Get enrolled students for a course")
    public ResponseEntity<ApiResponse<java.util.List<StudentInfoResponse>>> getCourseStudents(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        verifyCourseOwnership(courseId, user);
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

                    UserJpaEntity student = studentMap.get(e.getStudentId());
                    if (student != null) {
                        fullName = student.getFullName();
                        email = student.getEmail();
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

    // === Ownership Helpers ===

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN;
    }

    private void verifyCourseOwnership(UUID courseId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var course = jpaCourseRepository.findById(courseId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", courseId));
        if (!course.getTeacherId().equals(user.getId())
                && !classTeacherJpaRepository.existsByTeacherIdAndCourseId(user.getId(), courseId)) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền truy cập khóa học này");
        }
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

    private void enrichIntroVideoAsset(AuthoringDTOs.CourseDraftDTO draft, UserJpaEntity user) {
        if (draft == null || draft.getIntroVideoAssetId() == null) {
            return;
        }

        videoAssetPresentationService.getView(draft.getIntroVideoAssetId()).ifPresent(view -> {
            draft.setIntroVideoAssetId(view.id());
            draft.setIntroVideoProcessingStatus(view.status());
            draft.setIntroVideoSourceKind(view.videoSourceKind());
            String playUrl = user == null
                    ? null
                    : adaptiveVideoPlaybackService.createPlaybackSession(view.id(), user.getId(), "hls")
                    .map(AdaptiveVideoPlaybackService.PlaybackSession::playUrl)
                    .orElse(null);
            draft.setIntroVideoPlaybackUrl(playUrl);
            draft.setIntroVideoStreamVideoUid(null);
            draft.setIntroVideoAvailableOfflineProfiles(
                    view.availableOfflineProfiles().stream()
                            .map(profile -> {
                                Map<String, Object> option = new LinkedHashMap<>();
                                option.put("id", profile.id());
                                option.put("label", profile.label());
                                option.put("actualResolution", profile.actualResolution());
                                option.put("sizeBytes", profile.sizeBytes());
                                return option;
                            })
                            .toList()
            );
            draft.setIntroVideoUrl(playUrl);
        });
    }

    private CourseDTOs.TeacherCourseResponse mapEntityToResponse(
            com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity entity,
            UUID currentUserId) {
        String statusName = entity.getStatus() != null ? entity.getStatus().name() : "DRAFT";
        String draftStatusName = entity.getDraftChangeStatus() != null
                ? entity.getDraftChangeStatus().name()
                : null;
        return CourseDTOs.TeacherCourseResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .slug(entity.getCode())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .thumbnail(entity.getThumbnailUrl())
                .price(entity.getPrice())
                .status(statusName)
                .reviewState(resolveTeacherReviewState(statusName, draftStatusName))
                .deliveryMode(entity.getDeliveryMode() != null ? entity.getDeliveryMode().name() : "SELF_PACED")
                .categoryName(null) // Enriched via batch query if needed
                .createdAt(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)
                .updatedAt(entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null)
                .sectionCount(0)
                .lessonCount(0)
                .enrolledCount(0)
                .studentsCount(0)
                .averageRating(0.0)
                .teacherRole(entity.getTeacherId() != null && entity.getTeacherId().equals(currentUserId)
                        ? "OWNER" : "CO_TEACHER")
                .build();
    }
}
