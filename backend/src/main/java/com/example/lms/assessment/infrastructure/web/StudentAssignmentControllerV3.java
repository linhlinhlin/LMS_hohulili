package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.dto.StudentAssignmentResponse;
import com.example.lms.assessment.application.usecase.GetStudentAssignmentsUseCase;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * V3 Controller for Student Assignment endpoints (Canvas-style).
 * Provides student-facing views of assignments with submission status.
 *
 * Endpoints:
 * - GET  /api/v3/student/assignments          - List all assignments for enrolled courses
 * - GET  /api/v3/student/assignments/{id}     - Get assignment detail with submission status
 * - POST /api/v3/student/assignments/{id}/submit - Submit assignment (text or file URL)
 * - GET  /api/v3/student/assignments/{id}/submission - Get my submission for an assignment
 */
@Tag(name = "Student - Assignments", description = "Student assignment view and submission endpoints")
@RestController
@RequestMapping("/api/v3/student/assignments")
@RequiredArgsConstructor
public class StudentAssignmentControllerV3 {

    private final GetStudentAssignmentsUseCase getStudentAssignmentsUseCase;
    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final AssignmentJpaRepository assignmentRepository;
    private final JpaEnrollmentRepository enrollmentRepository;

    // =============================================
    // GET /api/v3/student/assignments
    // =============================================

    @Operation(summary = "Danh sách bài tập của học viên", description = "Trả về tất cả bài tập từ các khóa học đã đăng ký")
    @GetMapping
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<StudentAssignmentResponse>>> getMyAssignments(
            @AuthenticationPrincipal UserJpaEntity user) {

        List<StudentAssignmentResponse> assignments = getStudentAssignmentsUseCase.execute(user.getId());
        return ResponseEntity.ok(ApiResponse.success(assignments, "Danh sách bài tập"));
    }

    // =============================================
    // GET /api/v3/student/assignments/{id}
    // =============================================

    @Operation(summary = "Chi tiết bài tập", description = "Xem chi tiết bài tập và trạng thái bài nộp")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<StudentAssignmentResponse>> getAssignmentDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {

        return getStudentAssignmentsUseCase.getById(id, user.getId())
                .map(response -> ResponseEntity.ok(ApiResponse.success(response, "Chi tiết bài tập")))
                .orElse(ResponseEntity.ok(ApiResponse.error("Không tìm thấy bài tập")));
    }

    // =============================================
    // POST /api/v3/student/assignments/{id}/submit
    // =============================================

    @Operation(summary = "Nộp bài tập", description = "Nộp bài tập bằng văn bản hoặc URL tệp đính kèm")
    @PostMapping("/{id}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitAssignment(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitAssignmentRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        // 1. Validate assignment exists and is PUBLISHED
        var assignmentOpt = assignmentRepository.findById(id);
        if (assignmentOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.error("Không tìm thấy bài tập"));
        }
        var assignment = assignmentOpt.get();

        if (assignment.getStatus() != AssignmentJpaEntity.AssignmentStatus.PUBLISHED) {
            return ResponseEntity.ok(ApiResponse.error("Bài tập chưa được phát hành"));
        }

        // 2. Verify student is enrolled in the assignment's course
        //    Use existsBy (boolean) instead of findBy to avoid loading EnrollmentJpaEntity
        //    into the persistence context (prevents @UpdateTimestamp dirty-check flush issues)
        if (assignment.getCourseId() != null) {
            boolean enrolled = enrollmentRepository.existsByStudentIdAndCourseId(user.getId(), assignment.getCourseId());
            if (!enrolled) {
                return ResponseEntity.ok(ApiResponse.error("Bạn chưa đăng ký khóa học này"));
            }
        }

        // 3. Determine if this is late
        boolean isLate = assignment.getDueDate() != null && Instant.now().isAfter(assignment.getDueDate());
        if (isLate && !Boolean.TRUE.equals(assignment.getAllowLateSubmission())) {
            return ResponseEntity.ok(ApiResponse.error("Đã quá hạn nộp bài và bài tập không cho phép nộp muộn"));
        }

        // 4. Check for existing submission (resubmission)
        var existingOpt = submissionRepository.findByAssignmentIdAndStudentId(id, user.getId());

        if (existingOpt.isPresent()) {
            var existing = existingOpt.get();

            // Check max attempts
            if (assignment.getMaxAttempts() != null && assignment.getMaxAttempts() > 0) {
                // If already graded and max attempts is 1, no resubmit
                if (existing.getStatus() == AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED
                        && assignment.getMaxAttempts() <= 1) {
                    return ResponseEntity.ok(ApiResponse.error("Bài tập đã được chấm điểm, không thể nộp lại"));
                }
            }

            // Update existing submission
            existing.setContent(request.content());
            existing.setFileUrl(request.fileUrl());
            existing.setFileName(request.fileName());
            existing.setStatus(isLate
                    ? AssignmentSubmissionJpaEntity.SubmissionStatus.LATE
                    : AssignmentSubmissionJpaEntity.SubmissionStatus.RESUBMITTED);
            existing.setSubmittedAt(Instant.now());
            submissionRepository.save(existing);

            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("submissionId", existing.getId().toString(), "status", existing.getStatus().name()),
                    "Đã nộp lại bài tập"));
        }

        // 5. Create new submission
        var submission = AssignmentSubmissionJpaEntity.builder()
                .assignmentId(id)
                .studentId(user.getId())
                .courseId(assignment.getCourseId())
                .content(request.content())
                .fileUrl(request.fileUrl())
                .fileName(request.fileName())
                .status(isLate
                        ? AssignmentSubmissionJpaEntity.SubmissionStatus.LATE
                        : AssignmentSubmissionJpaEntity.SubmissionStatus.SUBMITTED)
                .submittedAt(Instant.now())
                .maxGrade(assignment.getMaxScore() != null ? assignment.getMaxScore().doubleValue() : null)
                .build();

        submission = submissionRepository.save(submission);

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("submissionId", submission.getId().toString(), "status", submission.getStatus().name()),
                "Đã nộp bài tập thành công"));
    }

    // =============================================
    // GET /api/v3/student/assignments/{id}/submission
    // =============================================

    @Operation(summary = "Xem bài nộp của tôi", description = "Xem bài nộp hiện tại cho bài tập cụ thể")
    @GetMapping("/{id}/submission")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMySubmission(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {

        return submissionRepository.findByAssignmentIdAndStudentId(id, user.getId())
                .map(s -> {
                    Map<String, Object> result = new java.util.LinkedHashMap<>();
                    result.put("id", s.getId().toString());
                    result.put("assignmentId", s.getAssignmentId().toString());
                    result.put("studentId", s.getStudentId().toString());
                    result.put("status", s.getStatus().name());
                    result.put("content", s.getContent());
                    result.put("fileUrl", s.getFileUrl());
                    result.put("fileName", s.getFileName());
                    result.put("grade", s.getGrade());
                    result.put("maxGrade", s.getMaxGrade());
                    result.put("feedback", s.getFeedback());
                    result.put("gradedAt", s.getGradedAt() != null ? s.getGradedAt().toString() : null);
                    result.put("submittedAt", s.getSubmittedAt() != null ? s.getSubmittedAt().toString() : null);
                    result.put("createdAt", s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
                    result.put("updatedAt", s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : null);
                    return ResponseEntity.ok(ApiResponse.success(result, "Bài nộp của bạn"));
                })
                .orElse(ResponseEntity.ok(ApiResponse.success(null, "Chưa có bài nộp")));
    }

    // =============================================
    // Request DTOs
    // =============================================

    public record SubmitAssignmentRequest(
            String content,
            String fileUrl,
            String fileName
    ) {}
}
