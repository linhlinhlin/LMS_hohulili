package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Assignment;
import com.example.lms.entity.AssignmentSubmission;
import com.example.lms.entity.User;
import com.example.lms.service.AssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Assignment Management", description = "API quản lý bài tập và nộp bài")
@SecurityRequirement(name = "Bearer Authentication")
public class AssignmentController {

    private final AssignmentService assignmentService;

    @GetMapping("/courses/{courseId}/assignments")
    @Operation(summary = "Lấy danh sách bài tập của khóa học", description = "Lấy tất cả bài tập trong một khóa học")
    public ResponseEntity<ApiResponse<Page<AssignmentSummary>>> getAssignmentsByCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser,
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            List<Assignment> assignmentList = assignmentService.getAssignmentsByCourse(courseId, currentUser);
            // Convert to Page manually for consistency
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), assignmentList.size());
            List<Assignment> pageContent = assignmentList.subList(start, end);
            Page<Assignment> assignments = new org.springframework.data.domain.PageImpl<>(pageContent, pageable, assignmentList.size());
            
            Page<AssignmentSummary> assignmentSummaries = assignments.map(this::convertToAssignmentSummary);
            
            return ResponseEntity.ok(ApiResponse.success(assignmentSummaries));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách bài tập: " + e.getMessage()));
        }
    }

    @PostMapping("/courses/{courseId}/assignments")
    @Operation(summary = "Tạo bài tập mới", description = "Giảng viên tạo bài tập mới cho khóa học")
    public ResponseEntity<ApiResponse<AssignmentDetail>> createAssignment(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateAssignmentRequest request
    ) {
        try {
            Assignment assignment = assignmentService.createAssignment(courseId, currentUser, request);
            AssignmentDetail assignmentDetail = convertToAssignmentDetail(assignment);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(assignmentDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/assignments/{assignmentId}")
    @Operation(summary = "Lấy chi tiết bài tập", description = "Lấy thông tin chi tiết của một bài tập")
    public ResponseEntity<ApiResponse<AssignmentDetail>> getAssignmentById(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Assignment assignment = assignmentService.getAssignmentById(assignmentId, currentUser);
            AssignmentDetail assignmentDetail = convertToAssignmentDetail(assignment);
            
            return ResponseEntity.ok(ApiResponse.success(assignmentDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Không tìm thấy bài tập"));
        }
    }

    @PutMapping("/assignments/{assignmentId}")
    @Operation(summary = "Cập nhật bài tập", description = "Giảng viên cập nhật bài tập của mình")
    public ResponseEntity<ApiResponse<AssignmentDetail>> updateAssignment(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateAssignmentRequest request
    ) {
        try {
            Assignment assignment = assignmentService.updateAssignment(assignmentId, currentUser, request);
            AssignmentDetail assignmentDetail = convertToAssignmentDetail(assignment);
            
            return ResponseEntity.ok(ApiResponse.success(assignmentDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/assignments/{assignmentId}")
    @Operation(summary = "Xóa bài tập", description = "Giảng viên xóa bài tập của mình")
    public ResponseEntity<ApiResponse<String>> deleteAssignment(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            assignmentService.deleteAssignment(assignmentId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Bài tập đã được xóa"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/assignments/{assignmentId}/submissions")
    @Operation(summary = "Lấy danh sách bài nộp", description = "Giảng viên xem tất cả bài nộp của một bài tập")
    public ResponseEntity<ApiResponse<Page<SubmissionSummary>>> getSubmissionsByAssignment(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal User currentUser,
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            Page<AssignmentSubmission> submissions = assignmentService.getSubmissions(assignmentId, currentUser, pageable);
            
            Page<SubmissionSummary> submissionSummaries = submissions.map(this::convertToSubmissionSummary);
            
            return ResponseEntity.ok(ApiResponse.success(submissionSummaries));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách bài nộp: " + e.getMessage()));
        }
    }

    @PostMapping("/assignments/{assignmentId}/submissions")
    @Operation(summary = "Nộp bài tập", description = "Học viên nộp bài tập")
    public ResponseEntity<ApiResponse<SubmissionDetail>> submitAssignment(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateSubmissionRequest request
    ) {
        try {
            AssignmentSubmission submission = assignmentService.submitAssignment(assignmentId, currentUser, request);
            SubmissionDetail submissionDetail = convertToSubmissionDetail(submission);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(submissionDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/assignments/{assignmentId}/my-submission")
    @Operation(summary = "Lấy bài nộp của tôi", description = "Học viên xem bài nộp của chính mình")
    public ResponseEntity<ApiResponse<SubmissionDetail>> getMySubmission(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            AssignmentSubmission submission = assignmentService.getMySubmission(assignmentId, currentUser);
            SubmissionDetail submissionDetail = convertToSubmissionDetail(submission);
            
            return ResponseEntity.ok(ApiResponse.success(submissionDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Bạn chưa nộp bài tập này"));
        }
    }

    @PatchMapping("/submissions/{submissionId}/grade")
    @Operation(summary = "Chấm điểm bài nộp", description = "Giảng viên chấm điểm và phản hồi bài nộp")
    public ResponseEntity<ApiResponse<SubmissionDetail>> gradeSubmission(
            @PathVariable UUID submissionId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody GradeSubmissionRequest request
    ) {
        try {
            AssignmentSubmission submission = assignmentService.gradeSubmission(submissionId, currentUser, request);
            SubmissionDetail submissionDetail = convertToSubmissionDetail(submission);
            
            return ResponseEntity.ok(ApiResponse.success(submissionDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // Helper methods
    private AssignmentSummary convertToAssignmentSummary(Assignment assignment) {
        return AssignmentSummary.builder()
                .id(assignment.getId())
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .maxScore(assignment.getMaxScore())
                .dueDate(assignment.getDueDate() != null ? 
                    assignment.getDueDate().atZone(java.time.ZoneId.systemDefault()).toInstant() : null)
                .courseId(assignment.getCourse().getId())
                .courseTitle(assignment.getCourse().getTitle())
                .submissionsCount(assignment.getSubmissions() != null ? assignment.getSubmissions().size() : 0)
                .createdAt(assignment.getCreatedAt())
                .build();
    }

    private AssignmentDetail convertToAssignmentDetail(Assignment assignment) {
        return AssignmentDetail.builder()
                .id(assignment.getId())
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .instructions(assignment.getInstructions())
                .maxScore(assignment.getMaxScore())
                .dueDate(assignment.getDueDate() != null ?
                    assignment.getDueDate().atZone(java.time.ZoneId.systemDefault()).toInstant() : null)
                .courseId(assignment.getCourse().getId())
                .courseTitle(assignment.getCourse().getTitle())
                .submissionsCount(assignment.getSubmissions() != null ? assignment.getSubmissions().size() : 0)
                .assignmentConfig(assignment.getAssignmentConfig())
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }

    private SubmissionSummary convertToSubmissionSummary(AssignmentSubmission submission) {
        return SubmissionSummary.builder()
                .id(submission.getId())
                .studentId(submission.getStudent().getId())
                .studentName(submission.getStudent().getFullName())
                .score(submission.getScore())
                .status(submission.getStatus().name())
                .submittedAt(submission.getSubmittedAt())
                .gradedAt(submission.getGradedAt())
                .build();
    }

    private SubmissionDetail convertToSubmissionDetail(AssignmentSubmission submission) {
        return SubmissionDetail.builder()
                .id(submission.getId())
                .content(submission.getContent())
                .attachmentUrl(submission.getAttachmentUrl())
                .score(submission.getScore())
                .feedback(submission.getFeedback())
                .status(submission.getStatus().name())
                .studentId(submission.getStudent().getId())
                .studentName(submission.getStudent().getFullName())
                .assignmentId(submission.getAssignment().getId())
                .assignmentTitle(submission.getAssignment().getTitle())
                .submittedAt(submission.getSubmittedAt() != null ? 
                    submission.getSubmittedAt().atZone(java.time.ZoneId.systemDefault()).toInstant() : null)
                .gradedAt(submission.getGradedAt() != null ? 
                    submission.getGradedAt().atZone(java.time.ZoneId.systemDefault()).toInstant() : null)
                .build();
    }

    // DTOs
    public static class AssignmentSummary {
        private UUID id;
        private String title;
        private String description;
        private BigDecimal maxScore;
        private Instant dueDate;
        private UUID courseId;
        private String courseTitle;
        private int submissionsCount;
        private Instant createdAt;

        public static AssignmentSummaryBuilder builder() {
            return new AssignmentSummaryBuilder();
        }

        public static class AssignmentSummaryBuilder {
            private UUID id;
            private String title;
            private String description;
            private BigDecimal maxScore;
            private Instant dueDate;
            private UUID courseId;
            private String courseTitle;
            private int submissionsCount;
            private Instant createdAt;

            public AssignmentSummaryBuilder id(UUID id) { this.id = id; return this; }
            public AssignmentSummaryBuilder title(String title) { this.title = title; return this; }
            public AssignmentSummaryBuilder description(String description) { this.description = description; return this; }
            public AssignmentSummaryBuilder maxScore(BigDecimal maxScore) { this.maxScore = maxScore; return this; }
            public AssignmentSummaryBuilder dueDate(Instant dueDate) { this.dueDate = dueDate; return this; }
            public AssignmentSummaryBuilder courseId(UUID courseId) { this.courseId = courseId; return this; }
            public AssignmentSummaryBuilder courseTitle(String courseTitle) { this.courseTitle = courseTitle; return this; }
            public AssignmentSummaryBuilder submissionsCount(int submissionsCount) { this.submissionsCount = submissionsCount; return this; }
            public AssignmentSummaryBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }

            public AssignmentSummary build() {
                AssignmentSummary assignment = new AssignmentSummary();
                assignment.id = this.id;
                assignment.title = this.title;
                assignment.description = this.description;
                assignment.maxScore = this.maxScore;
                assignment.dueDate = this.dueDate;
                assignment.courseId = this.courseId;
                assignment.courseTitle = this.courseTitle;
                assignment.submissionsCount = this.submissionsCount;
                assignment.createdAt = this.createdAt;
                return assignment;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public BigDecimal getMaxScore() { return maxScore; }
        public Instant getDueDate() { return dueDate; }
        public UUID getCourseId() { return courseId; }
        public String getCourseTitle() { return courseTitle; }
        public int getSubmissionsCount() { return submissionsCount; }
        public Instant getCreatedAt() { return createdAt; }
    }

    public static class AssignmentDetail {
        private UUID id;
        private String title;
        private String description;
        private String instructions;
        private BigDecimal maxScore;
        private Instant dueDate;
        private UUID courseId;
        private String courseTitle;
        private int submissionsCount;
        private Object assignmentConfig;
        private Instant createdAt;
        private Instant updatedAt;

        public static AssignmentDetailBuilder builder() {
            return new AssignmentDetailBuilder();
        }

        public static class AssignmentDetailBuilder {
            private UUID id;
            private String title;
            private String description;
            private String instructions;
            private BigDecimal maxScore;
            private Instant dueDate;
            private UUID courseId;
            private String courseTitle;
            private int submissionsCount;
            private Object assignmentConfig;
            private Instant createdAt;
            private Instant updatedAt;

            public AssignmentDetailBuilder id(UUID id) { this.id = id; return this; }
            public AssignmentDetailBuilder title(String title) { this.title = title; return this; }
            public AssignmentDetailBuilder description(String description) { this.description = description; return this; }
            public AssignmentDetailBuilder instructions(String instructions) { this.instructions = instructions; return this; }
            public AssignmentDetailBuilder maxScore(BigDecimal maxScore) { this.maxScore = maxScore; return this; }
            public AssignmentDetailBuilder dueDate(Instant dueDate) { this.dueDate = dueDate; return this; }
            public AssignmentDetailBuilder courseId(UUID courseId) { this.courseId = courseId; return this; }
            public AssignmentDetailBuilder courseTitle(String courseTitle) { this.courseTitle = courseTitle; return this; }
            public AssignmentDetailBuilder submissionsCount(int submissionsCount) { this.submissionsCount = submissionsCount; return this; }
            public AssignmentDetailBuilder assignmentConfig(Object assignmentConfig) { this.assignmentConfig = assignmentConfig; return this; }
            public AssignmentDetailBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
            public AssignmentDetailBuilder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

            public AssignmentDetail build() {
                AssignmentDetail assignment = new AssignmentDetail();
                assignment.id = this.id;
                assignment.title = this.title;
                assignment.description = this.description;
                assignment.instructions = this.instructions;
                assignment.maxScore = this.maxScore;
                assignment.dueDate = this.dueDate;
                assignment.courseId = this.courseId;
                assignment.courseTitle = this.courseTitle;
                assignment.submissionsCount = this.submissionsCount;
                assignment.assignmentConfig = this.assignmentConfig;
                assignment.createdAt = this.createdAt;
                assignment.updatedAt = this.updatedAt;
                return assignment;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public String getInstructions() { return instructions; }
        public BigDecimal getMaxScore() { return maxScore; }
        public Instant getDueDate() { return dueDate; }
        public UUID getCourseId() { return courseId; }
        public String getCourseTitle() { return courseTitle; }
        public int getSubmissionsCount() { return submissionsCount; }
        public Object getAssignmentConfig() { return assignmentConfig; }
        public Instant getCreatedAt() { return createdAt; }
        public Instant getUpdatedAt() { return updatedAt; }
    }

    public static class SubmissionSummary {
        private UUID id;
        private UUID studentId;
        private String studentName;
        private BigDecimal score;
        private String status;
        private LocalDateTime submittedAt;
        private LocalDateTime gradedAt;

        public static SubmissionSummaryBuilder builder() {
            return new SubmissionSummaryBuilder();
        }

        public static class SubmissionSummaryBuilder {
            private UUID id;
            private UUID studentId;
            private String studentName;
            private BigDecimal score;
            private String status;
            private LocalDateTime submittedAt;
            private LocalDateTime gradedAt;

            public SubmissionSummaryBuilder id(UUID id) { this.id = id; return this; }
            public SubmissionSummaryBuilder studentId(UUID studentId) { this.studentId = studentId; return this; }
            public SubmissionSummaryBuilder studentName(String studentName) { this.studentName = studentName; return this; }
            public SubmissionSummaryBuilder score(BigDecimal score) { this.score = score; return this; }
            public SubmissionSummaryBuilder status(String status) { this.status = status; return this; }
            public SubmissionSummaryBuilder submittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; return this; }
            public SubmissionSummaryBuilder gradedAt(LocalDateTime gradedAt) { this.gradedAt = gradedAt; return this; }

            public SubmissionSummary build() {
                SubmissionSummary submission = new SubmissionSummary();
                submission.id = this.id;
                submission.studentId = this.studentId;
                submission.studentName = this.studentName;
                submission.score = this.score;
                submission.status = this.status;
                submission.submittedAt = this.submittedAt;
                submission.gradedAt = this.gradedAt;
                return submission;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public UUID getStudentId() { return studentId; }
        public String getStudentName() { return studentName; }
        public BigDecimal getScore() { return score; }
        public String getStatus() { return status; }
        public LocalDateTime getSubmittedAt() { return submittedAt; }
        public LocalDateTime getGradedAt() { return gradedAt; }
    }

    public static class SubmissionDetail {
        private UUID id;
        private String content;
        private String attachmentUrl;
        private BigDecimal score;
        private String feedback;
        private String status;
        private UUID studentId;
        private String studentName;
        private UUID assignmentId;
        private String assignmentTitle;
        private Instant submittedAt;
        private Instant gradedAt;

        public static SubmissionDetailBuilder builder() {
            return new SubmissionDetailBuilder();
        }

        public static class SubmissionDetailBuilder {
            private UUID id;
            private String content;
            private String attachmentUrl;
            private BigDecimal score;
            private String feedback;
            private String status;
            private UUID studentId;
            private String studentName;
            private UUID assignmentId;
            private String assignmentTitle;
            private Instant submittedAt;
            private Instant gradedAt;

            public SubmissionDetailBuilder id(UUID id) { this.id = id; return this; }
            public SubmissionDetailBuilder content(String content) { this.content = content; return this; }
            public SubmissionDetailBuilder attachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; return this; }
            public SubmissionDetailBuilder score(BigDecimal score) { this.score = score; return this; }
            public SubmissionDetailBuilder feedback(String feedback) { this.feedback = feedback; return this; }
            public SubmissionDetailBuilder status(String status) { this.status = status; return this; }
            public SubmissionDetailBuilder studentId(UUID studentId) { this.studentId = studentId; return this; }
            public SubmissionDetailBuilder studentName(String studentName) { this.studentName = studentName; return this; }
            public SubmissionDetailBuilder assignmentId(UUID assignmentId) { this.assignmentId = assignmentId; return this; }
            public SubmissionDetailBuilder assignmentTitle(String assignmentTitle) { this.assignmentTitle = assignmentTitle; return this; }
            public SubmissionDetailBuilder submittedAt(Instant submittedAt) { this.submittedAt = submittedAt; return this; }
            public SubmissionDetailBuilder gradedAt(Instant gradedAt) { this.gradedAt = gradedAt; return this; }

            public SubmissionDetail build() {
                SubmissionDetail submission = new SubmissionDetail();
                submission.id = this.id;
                submission.content = this.content;
                submission.attachmentUrl = this.attachmentUrl;
                submission.score = this.score;
                submission.feedback = this.feedback;
                submission.status = this.status;
                submission.studentId = this.studentId;
                submission.studentName = this.studentName;
                submission.assignmentId = this.assignmentId;
                submission.assignmentTitle = this.assignmentTitle;
                submission.submittedAt = this.submittedAt;
                submission.gradedAt = this.gradedAt;
                return submission;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getContent() { return content; }
        public String getAttachmentUrl() { return attachmentUrl; }
        public BigDecimal getScore() { return score; }
        public String getFeedback() { return feedback; }
        public String getStatus() { return status; }
        public UUID getStudentId() { return studentId; }
        public String getStudentName() { return studentName; }
        public UUID getAssignmentId() { return assignmentId; }
        public String getAssignmentTitle() { return assignmentTitle; }
        public Instant getSubmittedAt() { return submittedAt; }
        public Instant getGradedAt() { return gradedAt; }
    }

    public static class CreateAssignmentRequest {
        @NotBlank(message = "Tiêu đề bài tập không được để trống")
        @Size(max = 255, message = "Tiêu đề bài tập không được vượt quá 255 ký tự")
        private String title;

        private String description;
        private String instructions;

        @NotNull(message = "Điểm tối đa không được để trống")
        private BigDecimal maxScore;

        private Instant dueDate;
        private Map<String, Object> assignmentConfig; // JSON object for assignment configuration

        // Attachments support
        private List<AttachmentRequest> attachments;

        // Getters and Setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getInstructions() { return instructions; }
        public void setInstructions(String instructions) { this.instructions = instructions; }
        public BigDecimal getMaxScore() { return maxScore; }
        public void setMaxScore(BigDecimal maxScore) { this.maxScore = maxScore; }
        public Instant getDueDate() { return dueDate; }
        public void setDueDate(Instant dueDate) { this.dueDate = dueDate; }
        @SuppressWarnings("unchecked")
        public Object getAssignmentConfig() { return assignmentConfig; }
        public void setAssignmentConfig(Map<String, Object> assignmentConfig) { this.assignmentConfig = assignmentConfig; }
        public List<AttachmentRequest> getAttachments() { return attachments; }
        public void setAttachments(List<AttachmentRequest> attachments) { this.attachments = attachments; }
    }

    public static class AttachmentRequest {
        private String fileId;
        private String fileName;
        private String fileUrl;

        // Getters and Setters
        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getFileUrl() { return fileUrl; }
        public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    }

    public static class UpdateAssignmentRequest {
        @Size(max = 255, message = "Tiêu đề bài tập không được vượt quá 255 ký tự")
        private String title;

        private String description;
        private String instructions;
        private BigDecimal maxScore;
        private Instant dueDate;
        private String assignmentConfig; // JSON string for assignment configuration

        // Getters and Setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getInstructions() { return instructions; }
        public void setInstructions(String instructions) { this.instructions = instructions; }
        public BigDecimal getMaxScore() { return maxScore; }
        public void setMaxScore(BigDecimal maxScore) { this.maxScore = maxScore; }
        public Instant getDueDate() { return dueDate; }
        public void setDueDate(Instant dueDate) { this.dueDate = dueDate; }
        public String getAssignmentConfig() { return assignmentConfig; }
        public void setAssignmentConfig(String assignmentConfig) { this.assignmentConfig = assignmentConfig; }
    }

    public static class CreateSubmissionRequest {
        private String content;
        private String attachmentUrl;

        // Getters and Setters
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getAttachmentUrl() { return attachmentUrl; }
        public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }
    }

    public static class GradeSubmissionRequest {
        @NotNull(message = "Điểm số không được để trống")
        private BigDecimal score;

        private String feedback;

        // Getters and Setters
        public BigDecimal getScore() { return score; }
        public void setScore(BigDecimal score) { this.score = score; }
        public String getFeedback() { return feedback; }
        public void setFeedback(String feedback) { this.feedback = feedback; }
    }
}