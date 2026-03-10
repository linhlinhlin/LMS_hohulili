package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.dto.StudentAssignmentResponse;
import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.application.usecase.GetStudentAssignmentsUseCase;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Student - Assignments", description = "Student assignment view and submission endpoints")
@RestController
@RequestMapping("/api/v3/student/assignments")
@RequiredArgsConstructor
public class StudentAssignmentControllerV3 {

    private final StudentAssessmentAccessPort studentAssessmentAccessPort;
    private final GetStudentAssignmentsUseCase getStudentAssignmentsUseCase;
    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final AssignmentJpaRepository assignmentRepository;

    @Operation(summary = "Danh sach bai tap cua hoc vien", description = "Tra ve tat ca bai tap ma hoc vien co the truy cap")
    @GetMapping
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<StudentAssignmentResponse>>> getMyAssignments(
            @AuthenticationPrincipal UserJpaEntity user) {

        List<StudentAssignmentResponse> assignments = getStudentAssignmentsUseCase.execute(user.getId());
        return ResponseEntity.ok(ApiResponse.success(assignments, "Danh sach bai tap"));
    }

    @Operation(summary = "Chi tiet bai tap", description = "Xem chi tiet bai tap va trang thai bai nop")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<StudentAssignmentResponse>> getAssignmentDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {

        return getStudentAssignmentsUseCase.getById(id, user.getId())
                .map(response -> ResponseEntity.ok(ApiResponse.success(response, "Chi tiet bai tap")))
                .orElse(ResponseEntity.status(404).body(ApiResponse.error("Khong tim thay bai tap")));
    }

    @Operation(summary = "Nop bai tap", description = "Nop bai tap bang van ban hoac URL tep dinh kem")
    @PostMapping("/{id}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitAssignment(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitAssignmentRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        AssignmentJpaEntity assignment = assignmentRepository.findById(id)
                .orElse(null);
        if (assignment == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Khong tim thay bai tap"));
        }
        if (assignment.getStatus() != AssignmentJpaEntity.AssignmentStatus.PUBLISHED) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Bai tap chua duoc phat hanh"));
        }
        if (!studentAssessmentAccessPort.canAccessAssignment(id, user.getId())) {
            return ResponseEntity.status(403).body(ApiResponse.error("Ban khong co quyen truy cap bai tap nay"));
        }

        boolean isLate = assignment.getDueDate() != null && Instant.now().isAfter(assignment.getDueDate());
        if (isLate && !Boolean.TRUE.equals(assignment.getAllowLateSubmission())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Da qua han nop bai va bai tap khong cho phep nop muon"));
        }

        var existingOpt = submissionRepository.findByAssignmentIdAndStudentId(id, user.getId());
        if (existingOpt.isPresent()) {
            AssignmentSubmissionJpaEntity existing = existingOpt.get();
            if (assignment.getMaxAttempts() != null
                    && assignment.getMaxAttempts() > 0
                    && existing.getStatus() == AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED
                    && assignment.getMaxAttempts() <= 1) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Bai tap da duoc cham diem, khong the nop lai"));
            }

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
                    "Da nop lai bai tap"));
        }

        AssignmentSubmissionJpaEntity submission = AssignmentSubmissionJpaEntity.builder()
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
                "Da nop bai tap thanh cong"));
    }

    @Operation(summary = "Xem bai nop cua toi", description = "Xem bai nop hien tai cho bai tap cu the")
    @GetMapping("/{id}/submission")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMySubmission(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {
        if (!studentAssessmentAccessPort.canAccessAssignment(id, user.getId())) {
            return ResponseEntity.status(403).body(ApiResponse.error("Ban khong co quyen truy cap bai tap nay"));
        }

        return submissionRepository.findByAssignmentIdAndStudentId(id, user.getId())
                .map(submission -> {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("id", submission.getId().toString());
                    result.put("assignmentId", submission.getAssignmentId().toString());
                    result.put("studentId", submission.getStudentId().toString());
                    result.put("status", submission.getStatus().name());
                    result.put("content", submission.getContent());
                    result.put("fileUrl", submission.getFileUrl());
                    result.put("fileName", submission.getFileName());
                    result.put("grade", submission.getGrade());
                    result.put("maxGrade", submission.getMaxGrade());
                    result.put("feedback", submission.getFeedback());
                    result.put("gradedAt", submission.getGradedAt() != null ? submission.getGradedAt().toString() : null);
                    result.put("submittedAt", submission.getSubmittedAt() != null ? submission.getSubmittedAt().toString() : null);
                    result.put("createdAt", submission.getCreatedAt() != null ? submission.getCreatedAt().toString() : null);
                    result.put("updatedAt", submission.getUpdatedAt() != null ? submission.getUpdatedAt().toString() : null);
                    return ResponseEntity.ok(ApiResponse.success(result, "Bai nop cua ban"));
                })
                .orElse(ResponseEntity.ok(ApiResponse.success(null, "Chua co bai nop")));
    }

    public record SubmitAssignmentRequest(
            String content,
            String fileUrl,
            String fileName
    ) {}
}
