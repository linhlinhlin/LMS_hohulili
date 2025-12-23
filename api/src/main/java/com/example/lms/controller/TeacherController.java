package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.dto.TeacherStudentDetailDTO;
import com.example.lms.dto.TeacherStudentSummaryDTO;
import com.example.lms.entity.CourseInstructor;
import com.example.lms.entity.User;
import com.example.lms.service.CourseInstructorService;
import com.example.lms.service.TeacherApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Teacher Controller - REST API endpoints for teacher operations
 * Handles student management, analytics, and teacher-specific features
 */
@RestController
@RequestMapping("/api/v1/teacher")
@RequiredArgsConstructor
@Tag(name = "Teacher", description = "Teacher management APIs")
public class TeacherController {
    
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(TeacherController.class);
    
    private final TeacherApplicationService teacherApplicationService;
    private final CourseInstructorService courseInstructorService;
    
    /**
     * Test endpoint to verify controller is loaded
     */
    @GetMapping("/test")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Test endpoint", description = "Verify TeacherController is working")
    public ResponseEntity<ApiResponse<String>> test(@AuthenticationPrincipal User currentUser) {
        log.info("Test endpoint called by user: {} with role: {}", 
            currentUser.getUsername(), currentUser.getRole());
        return ResponseEntity.ok(ApiResponse.success(
            "TeacherController is working! User: " + currentUser.getUsername() + 
            ", Role: " + currentUser.getRole()
        ));
    }
    
    /**
     * Get all students from teacher's courses
     */
    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(
        summary = "Get all students from teacher's courses",
        description = "Returns paginated list of students enrolled in teacher's courses with progress and grades"
    )
    public ResponseEntity<ApiResponse<Page<TeacherStudentSummaryDTO>>> getMyStudents(
        @Parameter(description = "Page number (0-indexed)") 
        @RequestParam(defaultValue = "0") int page,
        
        @Parameter(description = "Page size") 
        @RequestParam(defaultValue = "20") int size,
        
        @Parameter(description = "Filter by specific course ID") 
        @RequestParam(required = false) UUID courseId,
        
        @Parameter(description = "Filter by status (active, inactive, suspended)") 
        @RequestParam(required = false) String status,
        
        @Parameter(description = "Search by name or email") 
        @RequestParam(required = false) String search,
        
        @AuthenticationPrincipal User currentUser
    ) {
        try {
            log.info("Teacher {} requesting students list - page: {}, size: {}, courseId: {}, status: {}, search: {}", 
                currentUser.getId(), page, size, courseId, status, search);
            
            Pageable pageable = PageRequest.of(page, size);
            
            Page<TeacherStudentSummaryDTO> students = teacherApplicationService.getMyStudents(
                currentUser.getId(),
                pageable,
                courseId,
                status,
                search
            );
            
            log.info("Successfully retrieved {} students for teacher {}", 
                students.getTotalElements(), currentUser.getId());
            
            return ResponseEntity.ok(ApiResponse.success(students));
            
        } catch (Exception e) {
            log.error("Error getting students for teacher {}: {}", currentUser.getId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Failed to retrieve students: " + e.getMessage()));
        }
    }
    
    /**
     * Get detailed information about a specific student
     */
    @GetMapping("/students/{studentId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(
        summary = "Get student detail",
        description = "Returns detailed information about a student including progress, assignments, and analytics"
    )
    public ResponseEntity<ApiResponse<TeacherStudentDetailDTO>> getStudentDetail(
        @Parameter(description = "Student ID") 
        @PathVariable UUID studentId,
        
        @AuthenticationPrincipal User currentUser
    ) {
        try {
            log.info("Teacher {} requesting detail for student {}", currentUser.getId(), studentId);
            
            TeacherStudentDetailDTO studentDetail = teacherApplicationService.getStudentDetail(
                currentUser.getId(),
                studentId
            );
            
            log.info("Successfully retrieved detail for student {}", studentId);
            
            return ResponseEntity.ok(ApiResponse.success(studentDetail));
            
        } catch (TeacherApplicationService.NotFoundException e) {
            log.warn("Student not found: {}", studentId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("Student not found"));
                
        } catch (com.example.lms.service.TeacherDomainService.AccessDeniedException e) {
            log.warn("Teacher {} denied access to student {}: {}", 
                currentUser.getId(), studentId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage()));
                
        } catch (Exception e) {
            log.error("Error getting student detail for teacher {}: {}", 
                currentUser.getId(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Failed to retrieve student detail: " + e.getMessage()));
        }
    }

    // ============ INVITATION ENDPOINTS ============

    /**
     * Get all pending co-instructor invitations for current teacher
     * Frontend calls: GET /api/v1/teacher/invitations
     */
    @GetMapping("/invitations")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "My Invitations", description = "Get all pending co-instructor invitations")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getMyInvitations(
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Get my invitations: userId={}", currentUser.getId());

        List<CourseInstructor> invitations = courseInstructorService.getPendingInvitations(currentUser.getId());
        List<InvitationResponse> responses = invitations.stream()
                .map(i -> new InvitationResponse(
                        i.getId(),
                        i.getCourse().getId(),
                        i.getCourse().getTitle(),
                        i.getCourse().getTeacher() != null ? i.getCourse().getTeacher().getFullName() : null,
                        i.getCanManage(),
                        i.getCanViewPerformance(),
                        i.getIsVisible(),
                        i.getCanGradeAssignments(),
                        i.getRevenueSharePercent(),
                        i.getStatus().name(),
                        i.getInvitedAt() != null ? i.getInvitedAt().toString() : null
                ))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(responses, "Lời mời đang chờ"));
    }

    /**
     * Accept invitation by invitation ID
     */
    @PostMapping("/invitations/{invitationId}/accept")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Accept Invitation", description = "Accept a co-instructor invitation by ID")
    public ResponseEntity<ApiResponse<String>> acceptInvitationById(
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Accept invitation by ID: invitationId={}, userId={}", invitationId, currentUser.getId());

        try {
            List<CourseInstructor> pending = courseInstructorService.getPendingInvitations(currentUser.getId());
            CourseInstructor invitation = pending.stream()
                    .filter(i -> i.getId().equals(invitationId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy lời mời hoặc lời mời không thuộc về bạn"));

            courseInstructorService.acceptInvitation(invitation.getCourse().getId(), currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success("Đã chấp nhận lời mời"));

        } catch (RuntimeException e) {
            log.error("Accept invitation failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Reject invitation by invitation ID
     */
    @PostMapping("/invitations/{invitationId}/reject")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Reject Invitation", description = "Reject a co-instructor invitation by ID")
    public ResponseEntity<ApiResponse<String>> rejectInvitationById(
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Reject invitation by ID: invitationId={}, userId={}", invitationId, currentUser.getId());

        try {
            List<CourseInstructor> pending = courseInstructorService.getPendingInvitations(currentUser.getId());
            CourseInstructor invitation = pending.stream()
                    .filter(i -> i.getId().equals(invitationId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy lời mời hoặc lời mời không thuộc về bạn"));

            courseInstructorService.rejectInvitation(invitation.getCourse().getId(), currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success("Đã từ chối lời mời"));

        } catch (RuntimeException e) {
            log.error("Reject invitation failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ============ DTOs ============

    public record InvitationResponse(
            UUID id,
            UUID courseId,
            String courseTitle,
            String courseOwnerName,
            Boolean canManage,
            Boolean canViewPerformance,
            Boolean isVisible,
            Boolean canGradeAssignments,
            Integer revenueSharePercent,
            String status,
            String invitedAt
    ) {}
}
