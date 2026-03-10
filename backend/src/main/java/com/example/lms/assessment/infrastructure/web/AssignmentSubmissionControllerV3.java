package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Assignment submission and grading endpoints.
 *
 * Note: student-facing compatibility routes remain available here because parts of
 * the frontend still call them, but they must enforce the same access rules as the
 * canonical /api/v3/student/assignments flow.
 */
@Tag(name = "Assignments - Submissions", description = "Assignment submission and grading endpoints")
@RestController
@RequiredArgsConstructor
public class AssignmentSubmissionControllerV3 {

    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final AssignmentJpaRepository assignmentRepository;
    private final JpaCourseRepository courseJpaRepository;
    private final StudentAssessmentAccessPort studentAssessmentAccessPort;

    // =============================================
    // Teacher endpoints
    // =============================================

    @Operation(summary = "Get all submissions for an assignment (Teacher)")
    @GetMapping("/api/v3/assignments/{assignmentId}/submissions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSubmissions(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyAssignmentOwnership(assignmentId, user);
        var submissions = submissionRepository.findByAssignmentId(assignmentId);
        List<Map<String, Object>> result = submissions.stream()
                .map(this::toSubmissionMap)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Danh sach bai nop"));
    }

    @Operation(summary = "Get detailed submissions for an assignment (Teacher)")
    @GetMapping("/api/v3/assignments/{assignmentId}/submissions/details")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSubmissionDetails(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyAssignmentOwnership(assignmentId, user);
        var submissions = submissionRepository.findByAssignmentId(assignmentId);
        List<Map<String, Object>> result = submissions.stream()
                .map(this::toSubmissionDetailMap)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Chi tiet bai nop"));
    }

    @Operation(summary = "Get pending submissions for teacher assignments")
    @GetMapping("/api/v3/submissions/pending")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingSubmissions(
            @AuthenticationPrincipal UserJpaEntity user) {

        var allSubmitted = submissionRepository.findByStatus(
                AssignmentSubmissionJpaEntity.SubmissionStatus.SUBMITTED);

        if (!isAdminRole(user)) {
            var teacherCourseIds = courseJpaRepository.findByTeacherId(user.getId()).stream()
                    .map(course -> course.getId())
                    .collect(java.util.stream.Collectors.toSet());

            var teacherAssignmentIds = assignmentRepository.findByCourseIdIn(new ArrayList<>(teacherCourseIds)).stream()
                    .map(AssignmentJpaEntity::getId)
                    .collect(java.util.stream.Collectors.toSet());

            allSubmitted = allSubmitted.stream()
                    .filter(submission -> teacherAssignmentIds.contains(submission.getAssignmentId()))
                    .toList();
        }

        List<Map<String, Object>> result = allSubmitted.stream()
                .map(this::toSubmissionMap)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Danh sach bai nop cho cham diem"));
    }

    @Operation(summary = "Grade a submission")
    @PatchMapping("/api/v3/submissions/{submissionId}/grade")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> gradeSubmission(
            @PathVariable UUID submissionId,
            @Valid @RequestBody GradeRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        var submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Bai nop", submissionId));

        verifyAssignmentOwnership(submission.getAssignmentId(), user);

        Double gradeValue = request.score() != null ? request.score() : request.grade();
        if (gradeValue != null) {
            submission.setGrade(gradeValue);
        }
        if (request.feedback() != null) {
            submission.setFeedback(request.feedback());
        }
        submission.setGradedBy(user.getId());
        submission.setGradedAt(Instant.now());
        submission.setStatus(AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED);

        submissionRepository.save(submission);
        return ResponseEntity.ok(ApiResponse.success(
                toSubmissionDetailMap(submission), "Da cham diem bai nop"));
    }

    @Operation(summary = "Batch grade multiple submissions")
    @PatchMapping("/api/v3/assignments/{assignmentId}/submissions/batch-grade")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> batchGrade(
            @PathVariable UUID assignmentId,
            @Valid @RequestBody List<BatchGradeItem> items,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyAssignmentOwnership(assignmentId, user);

        int gradedCount = 0;
        for (BatchGradeItem item : items) {
            var opt = submissionRepository.findById(item.submissionId());
            if (opt.isEmpty()) {
                continue;
            }

            var submission = opt.get();
            if (!submission.getAssignmentId().equals(assignmentId)) {
                continue;
            }

            if (item.grade() != null) {
                submission.setGrade(item.grade());
            }
            if (item.feedback() != null) {
                submission.setFeedback(item.feedback());
            }
            submission.setGradedBy(user.getId());
            submission.setGradedAt(Instant.now());
            submission.setStatus(AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED);
            submissionRepository.save(submission);
            gradedCount++;
        }

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("gradedCount", gradedCount),
                "Da cham diem " + gradedCount + " bai nop"));
    }

    @Operation(summary = "Get a single submission by ID")
    @GetMapping("/api/v3/submissions/{submissionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN', 'STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSubmissionById(
            @PathVariable UUID submissionId,
            @AuthenticationPrincipal UserJpaEntity user) {

        var submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Bai nop", submissionId));

        if (user.getRole() == UserJpaEntity.UserRole.STUDENT) {
            if (!submission.getStudentId().equals(user.getId())
                    || !studentAssessmentAccessPort.canAccessAssignment(submission.getAssignmentId(), user.getId())) {
                throw new org.springframework.security.access.AccessDeniedException("Ban khong co quyen xem bai nop nay");
            }
        } else {
            verifyAssignmentOwnership(submission.getAssignmentId(), user);
        }

        return ResponseEntity.ok(ApiResponse.success(toSubmissionDetailMap(submission)));
    }

    @Operation(summary = "Export submissions for an assignment")
    @GetMapping("/api/v3/assignments/{assignmentId}/submissions/export")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportSubmissions(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyAssignmentOwnership(assignmentId, user);
        var submissions = submissionRepository.findByAssignmentId(assignmentId);

        StringBuilder csv = new StringBuilder();
        csv.append("Student ID,Status,Grade,Submitted At,Feedback\n");
        for (var submission : submissions) {
            csv.append(String.format("%s,%s,%s,%s,%s\n",
                    submission.getStudentId(),
                    submission.getStatus(),
                    submission.getGrade() != null ? submission.getGrade() : "",
                    submission.getSubmittedAt() != null ? submission.getSubmittedAt() : "",
                    sanitizeCsvField(submission.getFeedback())));
        }

        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=submissions.csv")
                .body(csv.toString().getBytes());
    }

    // =============================================
    // Student compatibility endpoints
    // =============================================

    @Operation(summary = "Submit assignment (Student compatibility route)")
    @PostMapping("/api/v3/assignments/{assignmentId}/submissions")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitAssignment(
            @PathVariable UUID assignmentId,
            @Valid @RequestBody SubmitRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        var assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Assignment", assignmentId));

        if (assignment.getStatus() != AssignmentJpaEntity.AssignmentStatus.PUBLISHED) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Bai tap chua duoc phat hanh"));
        }

        if (!studentAssessmentAccessPort.canAccessAssignment(assignmentId, user.getId())) {
            return ResponseEntity.status(403).body(ApiResponse.error("Ban khong co quyen truy cap bai tap nay"));
        }

        boolean isLate = assignment.getDueDate() != null && Instant.now().isAfter(assignment.getDueDate());
        if (isLate && !Boolean.TRUE.equals(assignment.getAllowLateSubmission())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Da qua han nop bai va bai tap khong cho phep nop muon"));
        }

        var existing = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, user.getId());
        if (existing.isPresent()) {
            var submission = existing.get();
            if (assignment.getMaxAttempts() != null
                    && assignment.getMaxAttempts() > 0
                    && submission.getStatus() == AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED
                    && assignment.getMaxAttempts() <= 1) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Bai tap da duoc cham diem, khong the nop lai"));
            }
            submission.setContent(request.content());
            submission.setFileUrl(request.fileUrl());
            submission.setFileName(request.fileName());
            submission.setStatus(isLate
                    ? AssignmentSubmissionJpaEntity.SubmissionStatus.LATE
                    : AssignmentSubmissionJpaEntity.SubmissionStatus.RESUBMITTED);
            submission.setSubmittedAt(Instant.now());
            submissionRepository.save(submission);
            return ResponseEntity.ok(ApiResponse.success(
                    toSubmissionDetailMap(submission), "Da nop lai bai tap"));
        }

        var submission = AssignmentSubmissionJpaEntity.builder()
                .assignmentId(assignmentId)
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
                toSubmissionDetailMap(submission), "Da nop bai tap"));
    }

    @Operation(summary = "Get my submission for an assignment (Student compatibility route)")
    @GetMapping("/api/v3/assignments/{assignmentId}/my-submission")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMySubmission(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserJpaEntity user) {

        if (!studentAssessmentAccessPort.canAccessAssignment(assignmentId, user.getId())) {
            return ResponseEntity.status(403).body(ApiResponse.error("Ban khong co quyen truy cap bai tap nay"));
        }

        return submissionRepository.findByAssignmentIdAndStudentId(assignmentId, user.getId())
                .map(submission -> ResponseEntity.ok(ApiResponse.success(toSubmissionDetailMap(submission))))
                .orElse(ResponseEntity.ok(ApiResponse.success(null, "Khong tim thay bai nop")));
    }

    // =============================================
    // Assignment publish
    // =============================================

    @Operation(summary = "Publish an assignment")
    @PutMapping("/api/v3/assignments/{assignmentId}/publish")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> publishAssignment(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyAssignmentOwnership(assignmentId, user);

        var assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Assignment", assignmentId));
        assignment.setStatus(AssignmentJpaEntity.AssignmentStatus.PUBLISHED);
        assignmentRepository.save(assignment);
        return ResponseEntity.ok(ApiResponse.<Void>success(null, "Da phat hanh bai tap"));
    }

    // =============================================
    // Helpers
    // =============================================

    private Map<String, Object> toSubmissionMap(AssignmentSubmissionJpaEntity submission) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", submission.getId().toString());
        map.put("assignmentId", submission.getAssignmentId().toString());
        map.put("studentId", submission.getStudentId().toString());
        map.put("status", submission.getStatus().name());
        map.put("grade", submission.getGrade());
        map.put("submittedAt", submission.getSubmittedAt() != null ? submission.getSubmittedAt().toString() : null);
        map.put("gradedAt", submission.getGradedAt() != null ? submission.getGradedAt().toString() : null);
        return map;
    }

    private Map<String, Object> toSubmissionDetailMap(AssignmentSubmissionJpaEntity submission) {
        Map<String, Object> map = toSubmissionMap(submission);
        map.put("content", submission.getContent());
        map.put("fileUrl", submission.getFileUrl());
        map.put("fileName", submission.getFileName());
        map.put("feedback", submission.getFeedback());
        map.put("maxGrade", submission.getMaxGrade());
        map.put("gradedBy", submission.getGradedBy() != null ? submission.getGradedBy().toString() : null);
        map.put("createdAt", submission.getCreatedAt() != null ? submission.getCreatedAt().toString() : null);
        map.put("updatedAt", submission.getUpdatedAt() != null ? submission.getUpdatedAt().toString() : null);
        return map;
    }

    // =============================================
    // DTOs
    // =============================================

    public record GradeRequest(
            @jakarta.validation.constraints.DecimalMin(value = "0", message = "Diem phai >= 0")
            @jakarta.validation.constraints.DecimalMax(value = "100", message = "Diem phai <= 100")
            Double grade,
            @jakarta.validation.constraints.DecimalMin(value = "0", message = "Diem phai >= 0")
            @jakarta.validation.constraints.DecimalMax(value = "100", message = "Diem phai <= 100")
            Double score,
            String feedback
    ) {}

    public record BatchGradeItem(UUID submissionId, Double grade, String feedback) {}

    public record SubmitRequest(String content, String fileUrl, String fileName) {}

    // =============================================
    // Ownership helpers
    // =============================================

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
                || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private void verifyAssignmentOwnership(UUID assignmentId, UserJpaEntity user) {
        if (isAdminRole(user)) {
            return;
        }

        var assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Assignment", assignmentId));
        var course = courseJpaRepository.findById(assignment.getCourseId())
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", assignment.getCourseId()));

        if (course.getTeacherId() == null || !course.getTeacherId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Ban khong so huu bai tap nay");
        }
    }

    private String sanitizeCsvField(String value) {
        if (value == null) {
            return "";
        }

        String cleaned = value.replace(",", " ")
                .replace("\n", " ")
                .replace("\r", " ");

        if (!cleaned.isEmpty() && "=+-@\t\r".indexOf(cleaned.charAt(0)) >= 0) {
            cleaned = "'" + cleaned;
        }

        return cleaned;
    }
}
