package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.dto.StudentAssignmentResponse;
import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.application.usecase.GetStudentAssignmentsUseCase;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAttachmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAttachmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.application.port.FileManagementPort;
import com.example.lms.shared.integration.WiiiLmsEventPublisher;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@Tag(name = "Student - Assignments", description = "Student assignment view and submission endpoints")
@RestController
@RequestMapping("/api/v3/student/assignments")
@RequiredArgsConstructor
public class StudentAssignmentControllerV3 {

    private static final Logger log = LoggerFactory.getLogger(StudentAssignmentControllerV3.class);

    private final StudentAssessmentAccessPort studentAssessmentAccessPort;
    private final GetStudentAssignmentsUseCase getStudentAssignmentsUseCase;
    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final AssignmentJpaRepository assignmentRepository;
    private final AssignmentAttachmentJpaRepository attachmentRepository;
    private final FileManagementPort fileManagementPort;
    private final WiiiLmsEventPublisher wiiiLmsEventPublisher;

    @Operation(summary = "Danh sach bai tap cua hoc vien")
    @GetMapping
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<StudentAssignmentResponse>>> getMyAssignments(
            @AuthenticationPrincipal UserJpaEntity user) {
        List<StudentAssignmentResponse> assignments = getStudentAssignmentsUseCase.execute(user.getId());
        return ResponseEntity.ok(ApiResponse.success(assignments, "Danh sach bai tap"));
    }

    @Operation(summary = "Chi tiet bai tap")
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

    @Operation(summary = "Nop bai tap", description = "Nop bai tap voi van ban va/hoac tep dinh kem (ho tro nhieu tep)")
    @PostMapping("/{id}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitAssignment(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitAssignmentRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        AssignmentJpaEntity assignment = assignmentRepository.findById(id).orElse(null);
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

        // Resolve primary file (backward compat: fileUrl/fileName OR first attachment)
        String primaryFileUrl = request.fileUrl();
        String primaryFileName = request.fileName();
        if (primaryFileUrl == null && request.attachments() != null && !request.attachments().isEmpty()) {
            primaryFileUrl = request.attachments().getFirst().fileUrl();
            primaryFileName = request.attachments().getFirst().fileName();
        }

        var existingOpt = submissionRepository.findByAssignmentIdAndStudentId(id, user.getId());
        AssignmentSubmissionJpaEntity submission;

        if (existingOpt.isPresent()) {
            submission = existingOpt.get();
            if (assignment.getMaxAttempts() != null
                    && assignment.getMaxAttempts() > 0
                    && submission.getStatus() == AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED
                    && assignment.getMaxAttempts() <= 1) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Bai tap da duoc cham diem, khong the nop lai"));
            }

            submission.setContent(request.content());
            submission.setFileUrl(primaryFileUrl);
            submission.setFileName(primaryFileName);
            submission.setStatus(isLate
                    ? AssignmentSubmissionJpaEntity.SubmissionStatus.LATE
                    : AssignmentSubmissionJpaEntity.SubmissionStatus.RESUBMITTED);
            submission.setSubmittedAt(Instant.now());
            submission = submissionRepository.save(submission);

            // Clear old attachments on resubmit
            attachmentRepository.deleteBySubmissionId(submission.getId());
        } else {
            submission = AssignmentSubmissionJpaEntity.builder()
                    .assignmentId(id)
                    .studentId(user.getId())
                    .courseId(assignment.getCourseId())
                    .content(request.content())
                    .fileUrl(primaryFileUrl)
                    .fileName(primaryFileName)
                    .status(isLate
                            ? AssignmentSubmissionJpaEntity.SubmissionStatus.LATE
                            : AssignmentSubmissionJpaEntity.SubmissionStatus.SUBMITTED)
                    .submittedAt(Instant.now())
                    .maxGrade(assignment.getMaxScore() != null ? assignment.getMaxScore().doubleValue() : null)
                    .build();
            submission = submissionRepository.save(submission);
        }

        // Save all attachments to assignment_attachments table
        if (request.attachments() != null && !request.attachments().isEmpty()) {
            for (var att : request.attachments()) {
                attachmentRepository.save(AssignmentAttachmentJpaEntity.builder()
                        .assignmentId(id)
                        .submissionId(submission.getId())
                        .fileUrl(att.fileUrl())
                        .fileName(att.fileName())
                        .fileSize(att.fileSize())
                        .fileType(att.mimeType())
                        .uploadedBy(user.getId())
                        .build());
                // Link each attachment. We don't persist their FK on the parent submission
                // (only one file_attachment_id column), but the link prevents orphan cleanup.
                fileManagementPort.linkFileByUrl(att.fileUrl(), submission.getId(), "SUBMISSION");
            }
            log.info("Saved {} attachments for submission {} (assignment {})",
                    request.attachments().size(), submission.getId(), id);
        }

        // Link the primary file and persist the FK on the submission row so the cleanup
        // scheduler's referential check + Postgres ON DELETE RESTRICT both protect it.
        if (primaryFileUrl != null) {
            var matched = fileManagementPort.linkFileByUrl(primaryFileUrl, submission.getId(), "SUBMISSION");
            if (matched.isPresent()) {
                submission.setFileAttachmentId(matched.get());
                submissionRepository.save(submission);
            }
        }

        wiiiLmsEventPublisher.sendAssignmentSubmitted(
                submission.getStudentId(),
                submission.getAssignmentId(),
                submission.getSubmittedAt()
        );

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("submissionId", submission.getId().toString(), "status", submission.getStatus().name()),
                "Da nop bai tap thanh cong"));
    }

    @Operation(summary = "Xem bai nop cua toi", description = "Xem bai nop va cac tep dinh kem")
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

                    // Include attachments from assignment_attachments table
                    var attachments = attachmentRepository.findBySubmissionId(submission.getId());
                    List<Map<String, Object>> attachmentList = new ArrayList<>();
                    for (var att : attachments) {
                        Map<String, Object> attMap = new LinkedHashMap<>();
                        attMap.put("id", att.getId().toString());
                        attMap.put("fileName", att.getFileName());
                        attMap.put("fileUrl", att.getFileUrl());
                        attMap.put("fileSize", att.getFileSize());
                        attMap.put("fileType", att.getFileType());
                        attMap.put("uploadedAt", att.getUploadedAt() != null ? att.getUploadedAt().toString() : null);
                        attachmentList.add(attMap);
                    }
                    result.put("attachments", attachmentList);

                    return ResponseEntity.ok(ApiResponse.success(result, "Bai nop cua ban"));
                })
                .orElse(ResponseEntity.ok(ApiResponse.success(null, "Chua co bai nop")));
    }

    // ── Request DTOs ──

    public record SubmitAssignmentRequest(
            String content,
            String fileUrl,      // Backward compat: single file
            String fileName,     // Backward compat: single file name
            List<@Valid AttachmentInput> attachments  // Multi-file support
    ) {}

    public record AttachmentInput(
            @NotBlank String fileUrl,
            @NotBlank String fileName,
            Long fileSize,
            @Size(max = 128) String mimeType
    ) {}
}
