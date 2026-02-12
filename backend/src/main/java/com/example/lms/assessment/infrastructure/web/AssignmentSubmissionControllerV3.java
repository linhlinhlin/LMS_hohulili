package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

/**
 * V3 Controller for Assignment Submissions.
 * Handles student submissions and teacher grading workflows.
 */
@Tag(name = "Assignments - Submissions", description = "Assignment submission and grading endpoints")
@RestController
@RequiredArgsConstructor
public class AssignmentSubmissionControllerV3 {

    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final AssignmentJpaRepository assignmentRepository;
    private final JpaCourseRepository courseJpaRepository;

    // =============================================
    // Teacher endpoints
    // =============================================

    @Operation(summary = "Get all submissions for an assignment (Teacher)")
    @GetMapping("/api/v3/assignments/{assignmentId}/submissions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSubmissions(
            @PathVariable UUID assignmentId) {

        var submissions = submissionRepository.findByAssignmentId(assignmentId);
        List<Map<String, Object>> result = submissions.stream()
                .map(this::toSubmissionMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Submissions loaded"));
    }

    @Operation(summary = "Get detailed submissions for an assignment (Teacher)")
    @GetMapping("/api/v3/assignments/{assignmentId}/submissions/details")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSubmissionDetails(
            @PathVariable UUID assignmentId) {

        var submissions = submissionRepository.findByAssignmentId(assignmentId);
        List<Map<String, Object>> result = submissions.stream()
                .map(this::toSubmissionDetailMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Submission details loaded"));
    }

    @Operation(summary = "Get pending submissions for teacher's assignments")
    @GetMapping("/api/v3/submissions/pending")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingSubmissions(
            @AuthenticationPrincipal UserJpaEntity user) {

        var allSubmitted = submissionRepository.findByStatus(
                AssignmentSubmissionJpaEntity.SubmissionStatus.SUBMITTED);

        // ADMIN/ORG_ADMIN sees all; TEACHER only sees submissions for their courses' assignments
        if (user.getRole() != UserJpaEntity.UserRole.ADMIN && user.getRole() != UserJpaEntity.UserRole.ORG_ADMIN) {
            // Batch: get all course IDs owned by this teacher
            var teacherCourseIds = courseJpaRepository.findByTeacherId(user.getId()).stream()
                    .map(c -> c.getId())
                    .collect(java.util.stream.Collectors.toSet());

            // Get assignment IDs belonging to teacher's courses (single query with WHERE IN)
            var teacherAssignments = assignmentRepository.findByCourseIdIn(new java.util.ArrayList<>(teacherCourseIds)).stream()
                    .map(AssignmentJpaEntity::getId)
                    .collect(java.util.stream.Collectors.toSet());

            allSubmitted = allSubmitted.stream()
                    .filter(s -> teacherAssignments.contains(s.getAssignmentId()))
                    .toList();
        }

        List<Map<String, Object>> result = allSubmitted.stream()
                .map(this::toSubmissionMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Pending submissions loaded"));
    }

    @Operation(summary = "Grade a submission")
    @PatchMapping("/api/v3/submissions/{submissionId}/grade")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> gradeSubmission(
            @PathVariable UUID submissionId,
            @Valid @RequestBody GradeRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        return submissionRepository.findById(submissionId)
                .map(submission -> {
                    if (request.grade() != null) {
                        submission.setGrade(request.grade());
                    }
                    if (request.feedback() != null) {
                        submission.setFeedback(request.feedback());
                    }
                    submission.setGradedBy(user.getId());
                    submission.setGradedAt(Instant.now());
                    submission.setStatus(AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED);

                    submissionRepository.save(submission);
                    return ResponseEntity.ok(ApiResponse.success(
                            toSubmissionDetailMap(submission), "Submission graded"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Get a single submission by ID")
    @GetMapping("/api/v3/submissions/{submissionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN', 'STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSubmissionById(
            @PathVariable UUID submissionId) {

        return submissionRepository.findById(submissionId)
                .map(s -> ResponseEntity.ok(ApiResponse.success(toSubmissionDetailMap(s))))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Export submissions for an assignment")
    @GetMapping("/api/v3/assignments/{assignmentId}/submissions/export")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportSubmissions(@PathVariable UUID assignmentId) {
        // Stub: return CSV with headers
        var submissions = submissionRepository.findByAssignmentId(assignmentId);
        StringBuilder csv = new StringBuilder();
        csv.append("Student ID,Status,Grade,Submitted At,Feedback\n");
        for (var s : submissions) {
            csv.append(String.format("%s,%s,%s,%s,%s\n",
                    s.getStudentId(), s.getStatus(),
                    s.getGrade() != null ? s.getGrade() : "",
                    s.getSubmittedAt() != null ? s.getSubmittedAt() : "",
                    s.getFeedback() != null ? s.getFeedback().replace(",", " ") : ""));
        }
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=submissions.csv")
                .body(csv.toString().getBytes());
    }

    // =============================================
    // Student endpoints
    // =============================================

    @Operation(summary = "Submit assignment (Student)")
    @PostMapping("/api/v3/assignments/{assignmentId}/submissions")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitAssignment(
            @PathVariable UUID assignmentId,
            @RequestBody SubmitRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        // Check if already submitted
        var existing = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, user.getId());
        if (existing.isPresent()) {
            var submission = existing.get();
            submission.setContent(request.content());
            submission.setFileUrl(request.fileUrl());
            submission.setFileName(request.fileName());
            submission.setStatus(AssignmentSubmissionJpaEntity.SubmissionStatus.RESUBMITTED);
            submission.setSubmittedAt(Instant.now());
            submissionRepository.save(submission);
            return ResponseEntity.ok(ApiResponse.success(
                    toSubmissionDetailMap(submission), "Assignment resubmitted"));
        }

        var submission = AssignmentSubmissionJpaEntity.builder()
                .assignmentId(assignmentId)
                .studentId(user.getId())
                .content(request.content())
                .fileUrl(request.fileUrl())
                .fileName(request.fileName())
                .status(AssignmentSubmissionJpaEntity.SubmissionStatus.SUBMITTED)
                .submittedAt(Instant.now())
                .build();

        submission = submissionRepository.save(submission);
        return ResponseEntity.ok(ApiResponse.success(
                toSubmissionDetailMap(submission), "Assignment submitted"));
    }

    @Operation(summary = "Get my submission for an assignment (Student)")
    @GetMapping("/api/v3/assignments/{assignmentId}/my-submission")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMySubmission(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserJpaEntity user) {

        return submissionRepository.findByAssignmentIdAndStudentId(assignmentId, user.getId())
                .map(s -> ResponseEntity.ok(ApiResponse.success(toSubmissionDetailMap(s))))
                .orElse(ResponseEntity.ok(ApiResponse.success(null, "No submission found")));
    }

    // =============================================
    // Assignment publish
    // =============================================

    @Operation(summary = "Publish an assignment")
    @PutMapping("/api/v3/assignments/{assignmentId}/publish")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> publishAssignment(@PathVariable UUID assignmentId) {
        return assignmentRepository.findById(assignmentId)
                .map(a -> {
                    a.setStatus(AssignmentJpaEntity.AssignmentStatus.PUBLISHED);
                    assignmentRepository.save(a);
                    return ResponseEntity.ok(ApiResponse.<Void>success(null, "Assignment published"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // =============================================
    // Helpers
    // =============================================

    private Map<String, Object> toSubmissionMap(AssignmentSubmissionJpaEntity s) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.getId().toString());
        map.put("assignmentId", s.getAssignmentId().toString());
        map.put("studentId", s.getStudentId().toString());
        map.put("status", s.getStatus().name());
        map.put("grade", s.getGrade());
        map.put("submittedAt", s.getSubmittedAt() != null ? s.getSubmittedAt().toString() : null);
        map.put("gradedAt", s.getGradedAt() != null ? s.getGradedAt().toString() : null);
        return map;
    }

    private Map<String, Object> toSubmissionDetailMap(AssignmentSubmissionJpaEntity s) {
        Map<String, Object> map = toSubmissionMap(s);
        map.put("content", s.getContent());
        map.put("fileUrl", s.getFileUrl());
        map.put("fileName", s.getFileName());
        map.put("feedback", s.getFeedback());
        map.put("maxGrade", s.getMaxGrade());
        map.put("gradedBy", s.getGradedBy() != null ? s.getGradedBy().toString() : null);
        map.put("createdAt", s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
        map.put("updatedAt", s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : null);
        return map;
    }

    // =============================================
    // DTOs
    // =============================================

    public record GradeRequest(Double grade, String feedback) {}
    public record SubmitRequest(String content, String fileUrl, String fileName) {}
}
