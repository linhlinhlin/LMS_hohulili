package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.AssignmentAllocation;
import com.example.lms.entity.User;
import com.example.lms.service.AllocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Assignment Allocation", description = "API quản lý phân phối bài tập cho học viên")
@SecurityRequirement(name = "Bearer Authentication")
public class AllocationController {

    private final AllocationService allocationService;

    @PostMapping("/assignments/{assignmentId}/allocation")
    @Operation(summary = "Tạo/Cập nhật phân phối bài tập", description = "Giao bài tập cho tất cả hoặc một số học viên cụ thể")
    public ResponseEntity<ApiResponse<AllocationResponse>> createOrUpdateAllocation(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateAllocationRequest request
    ) {
        try {
            AssignmentAllocation.DistributionType distributionType = 
                    AssignmentAllocation.DistributionType.valueOf(request.getDistributionType());

            AssignmentAllocation allocation = allocationService.createOrUpdateAllocation(
                    assignmentId,
                    distributionType,
                    request.getStudentIds(),
                    currentUser,
                    request.getIsIndividual() != null && request.getIsIndividual()
            );

            AllocationResponse response = convertToResponse(allocation);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Loại phân phối không hợp lệ: " + request.getDistributionType()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/assignments/{assignmentId}/allocation")
    @Operation(summary = "Lấy thông tin phân phối bài tập", description = "Xem ai được giao bài tập này")
    public ResponseEntity<ApiResponse<AllocationResponse>> getAllocation(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            AssignmentAllocation allocation = allocationService.getAllocation(assignmentId);
            
            if (allocation == null) {
                AllocationResponse defaultResponse = AllocationResponse.builder()
                        .assignmentId(assignmentId)
                        .distributionType("ALL_STUDENTS")
                        .isIndividual(false)
                        .studentIds(null)
                        .build();
                return ResponseEntity.ok(ApiResponse.success(defaultResponse));
            }

            AllocationResponse response = convertToResponse(allocation);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/assignments/{assignmentId}/allocation/stats")
    @Operation(summary = "Lấy thống kê phân phối", description = "Xem số lượng học viên được giao bài tập")
    public ResponseEntity<ApiResponse<AllocationStatsResponse>> getAllocationStats(
            @PathVariable UUID assignmentId,
            @RequestParam(defaultValue = "0") int totalEnrolledStudents,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            AllocationService.AllocationStats stats = 
                    allocationService.getAllocationStats(assignmentId, totalEnrolledStudents);

            AllocationStatsResponse response = AllocationStatsResponse.builder()
                    .totalAllocated(stats.totalAllocated())
                    .distributionType(stats.distributionType())
                    .isIndividual(stats.isIndividual())
                    .build();

            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/assignments/{assignmentId}/allocation/individual")
    @Operation(summary = "Giao bài tập riêng cho học viên", description = "Giao bài tập cho một học viên cụ thể với deadline riêng")
    public ResponseEntity<ApiResponse<AllocationResponse>> assignIndividual(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody AssignIndividualRequest request
    ) {
        try {
            LocalDateTime customDeadline = null;
            if (request.getCustomDeadline() != null) {
                customDeadline = LocalDateTime.ofInstant(request.getCustomDeadline(), ZoneId.systemDefault());
            }

            AssignmentAllocation allocation = allocationService.assignIndividual(
                    assignmentId,
                    request.getStudentId(),
                    customDeadline,
                    request.getNote(),
                    currentUser
            );

            AllocationResponse response = convertToResponse(allocation);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/assignments/{assignmentId}/allocation/students/{studentId}")
    @Operation(summary = "Xóa học viên khỏi danh sách được giao", description = "Bỏ giao bài tập cho một học viên")
    public ResponseEntity<ApiResponse<String>> removeStudentFromAllocation(
            @PathVariable UUID assignmentId,
            @PathVariable UUID studentId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            allocationService.removeStudentFromAllocation(assignmentId, studentId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Đã xóa học viên khỏi danh sách được giao"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/assignments/{assignmentId}/allocation/students/{studentId}/deadline")
    @Operation(summary = "Cập nhật deadline riêng cho học viên", description = "Gia hạn hoặc thay đổi deadline cho một học viên")
    public ResponseEntity<ApiResponse<String>> updateStudentDeadline(
            @PathVariable UUID assignmentId,
            @PathVariable UUID studentId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateDeadlineRequest request
    ) {
        try {
            LocalDateTime newDeadline = LocalDateTime.ofInstant(request.getNewDeadline(), ZoneId.systemDefault());
            allocationService.updateStudentDeadline(assignmentId, studentId, newDeadline, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Đã cập nhật deadline cho học viên"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/students/{studentId}/allocated-assignments")
    @Operation(summary = "Lấy danh sách bài tập được giao cho học viên", description = "Học viên xem các bài tập được giao")
    public ResponseEntity<ApiResponse<List<UUID>>> getStudentAllocatedAssignments(
            @PathVariable UUID studentId,
            @RequestParam UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<UUID> assignmentIds = allocationService.getAssignmentsForStudent(studentId, courseId)
                    .stream()
                    .map(a -> a.getId())
                    .collect(Collectors.toList());

            return ResponseEntity.ok(ApiResponse.success(assignmentIds));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    private AllocationResponse convertToResponse(AssignmentAllocation allocation) {
        List<AllocatedStudentInfo> studentInfos = null;
        if (allocation.getDistributionType() == AssignmentAllocation.DistributionType.SPECIFIC_STUDENTS) {
            studentInfos = allocation.getAllocatedStudents().stream()
                    .map(as -> AllocatedStudentInfo.builder()
                            .studentId(as.getStudent().getId())
                            .studentName(as.getStudent().getFullName())
                            .customDeadline(as.getCustomDeadline() != null ? 
                                    as.getCustomDeadline().atZone(ZoneId.systemDefault()).toInstant() : null)
                            .note(as.getNote())
                            .assignedAt(as.getAssignedAt())
                            .build())
                    .collect(Collectors.toList());
        }

        return AllocationResponse.builder()
                .id(allocation.getId())
                .assignmentId(allocation.getAssignment().getId())
                .distributionType(allocation.getDistributionType().name())
                .isIndividual(allocation.getIsIndividual())
                .studentIds(allocation.getAllocatedStudents().stream()
                        .map(as -> as.getStudent().getId())
                        .collect(Collectors.toList()))
                .allocatedStudents(studentInfos)
                .createdAt(allocation.getCreatedAt())
                .build();
    }

    // Manual DTOs
    public static class CreateAllocationRequest {
        @NotNull(message = "Loại phân phối không được để trống")
        private String distributionType;
        private List<UUID> studentIds;
        private Boolean isIndividual;

        public String getDistributionType() { return distributionType; }
        public void setDistributionType(String distributionType) { this.distributionType = distributionType; }
        public List<UUID> getStudentIds() { return studentIds; }
        public void setStudentIds(List<UUID> studentIds) { this.studentIds = studentIds; }
        public Boolean getIsIndividual() { return isIndividual; }
        public void setIsIndividual(Boolean isIndividual) { this.isIndividual = isIndividual; }
    }

    public static class AssignIndividualRequest {
        @NotNull(message = "ID học viên không được để trống")
        private UUID studentId;
        private Instant customDeadline;
        private String note;

        public UUID getStudentId() { return studentId; }
        public void setStudentId(UUID studentId) { this.studentId = studentId; }
        public Instant getCustomDeadline() { return customDeadline; }
        public void setCustomDeadline(Instant customDeadline) { this.customDeadline = customDeadline; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }

    public static class UpdateDeadlineRequest {
        @NotNull(message = "Deadline mới không được để trống")
        private Instant newDeadline;

        public Instant getNewDeadline() { return newDeadline; }
        public void setNewDeadline(Instant newDeadline) { this.newDeadline = newDeadline; }
    }

    public static class AllocationResponse {
        private UUID id;
        private UUID assignmentId;
        private String distributionType;
        private Boolean isIndividual;
        private List<UUID> studentIds;
        private List<AllocatedStudentInfo> allocatedStudents;
        private Instant createdAt;

        public static AllocationResponseBuilder builder() { return new AllocationResponseBuilder(); }
        public static class AllocationResponseBuilder {
            private AllocationResponse r = new AllocationResponse();
            public AllocationResponseBuilder id(UUID i) { r.id = i; return this; }
            public AllocationResponseBuilder assignmentId(UUID a) { r.assignmentId = a; return this; }
            public AllocationResponseBuilder distributionType(String d) { r.distributionType = d; return this; }
            public AllocationResponseBuilder isIndividual(Boolean i) { r.isIndividual = i; return this; }
            public AllocationResponseBuilder studentIds(List<UUID> s) { r.studentIds = s; return this; }
            public AllocationResponseBuilder allocatedStudents(List<AllocatedStudentInfo> a) { r.allocatedStudents = a; return this; }
            public AllocationResponseBuilder createdAt(Instant c) { r.createdAt = c; return this; }
            public AllocationResponse build() { return r; }
        }

        public UUID getId() { return id; }
        public UUID getAssignmentId() { return assignmentId; }
        public String getDistributionType() { return distributionType; }
        public Boolean getIsIndividual() { return isIndividual; }
        public List<UUID> getStudentIds() { return studentIds; }
        public List<AllocatedStudentInfo> getAllocatedStudents() { return allocatedStudents; }
        public Instant getCreatedAt() { return createdAt; }
    }

    public static class AllocatedStudentInfo {
        private UUID studentId;
        private String studentName;
        private Instant customDeadline;
        private String note;
        private Instant assignedAt;

        public static AllocatedStudentInfoBuilder builder() { return new AllocatedStudentInfoBuilder(); }
        public static class AllocatedStudentInfoBuilder {
            private AllocatedStudentInfo i = new AllocatedStudentInfo();
            public AllocatedStudentInfoBuilder studentId(UUID s) { i.studentId = s; return this; }
            public AllocatedStudentInfoBuilder studentName(String n) { i.studentName = n; return this; }
            public AllocatedStudentInfoBuilder customDeadline(Instant c) { i.customDeadline = c; return this; }
            public AllocatedStudentInfoBuilder note(String n) { i.note = n; return this; }
            public AllocatedStudentInfoBuilder assignedAt(Instant a) { i.assignedAt = a; return this; }
            public AllocatedStudentInfo build() { return i; }
        }

        public UUID getStudentId() { return studentId; }
        public String getStudentName() { return studentName; }
        public Instant getCustomDeadline() { return customDeadline; }
        public String getNote() { return note; }
        public Instant getAssignedAt() { return assignedAt; }
    }

    public static class AllocationStatsResponse {
        private int totalAllocated;
        private String distributionType;
        private boolean isIndividual;

        public static AllocationStatsResponseBuilder builder() { return new AllocationStatsResponseBuilder(); }
        public static class AllocationStatsResponseBuilder {
            private AllocationStatsResponse s = new AllocationStatsResponse();
            public AllocationStatsResponseBuilder totalAllocated(int t) { s.totalAllocated = t; return this; }
            public AllocationStatsResponseBuilder distributionType(String d) { s.distributionType = d; return this; }
            public AllocationStatsResponseBuilder isIndividual(boolean i) { s.isIndividual = i; return this; }
            public AllocationStatsResponse build() { return s; }
        }

        public int getTotalAllocated() { return totalAllocated; }
        public String getDistributionType() { return distributionType; }
        public boolean isIndividual() { return isIndividual; }
        public int totalAllocated() { return totalAllocated; } 
        public String distributionType() { return distributionType; }
    }
}
