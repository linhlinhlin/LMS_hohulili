package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.CourseInstructor;
import com.example.lms.entity.User;
import com.example.lms.repository.UserRepository;
import com.example.lms.service.CourseInstructorService;
import com.example.lms.service.CourseInstructorService.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller for managing course instructors (teacher hierarchy)
 * 
 * Endpoints:
 * - POST /courses/{id}/instructors/invite - Invite co-instructor
 * - POST /courses/{id}/instructors/accept - Accept invitation
 * - POST /courses/{id}/instructors/reject - Reject invitation
 * - PUT /courses/{id}/instructors/{userId} - Update permissions
 * - DELETE /courses/{id}/instructors/{userId} - Remove instructor
 * - GET /courses/{id}/instructors - List all instructors
 */
@RestController
@RequestMapping("/api/v1/courses/{courseId}/instructors")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Course Instructors", description = "APIs for managing course instructors and teacher hierarchy")
public class CourseInstructorController {

    private final CourseInstructorService instructorService;
    private final UserRepository userRepository;

    /**
     * Invite a user as co-instructor
     */
    @PostMapping("/invite")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Invite Co-Instructor", description = "Invite a teacher as co-instructor for the course")
    public ResponseEntity<ApiResponse<InstructorResponse>> inviteInstructor(
            @PathVariable UUID courseId,
            @RequestBody InviteInstructorRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Invite instructor: courseId={}, email={}", courseId, request.email());

        try {
            // Lookup user by email
            User targetUser = userRepository.findByEmail(request.email())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy user với email: " + request.email()));

            InviteRequest inviteRequest = new InviteRequest(
                    request.canManage(),
                    request.canViewPerformance(),
                    request.isVisible(),
                    request.canGradeAssignments(),
                    request.revenueSharePercent()
            );

            CourseInstructor instructor = instructorService.inviteInstructor(
                    courseId, targetUser.getId(), currentUser.getId(), inviteRequest);

            InstructorResponse response = InstructorResponse.from(instructor);
            return ResponseEntity.ok(ApiResponse.success(response, "Đã gửi lời mời co-instructor"));

        } catch (RuntimeException e) {
            log.error("Invite failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Accept an invitation
     */
    @PostMapping("/accept")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Accept Invitation", description = "Accept an invitation to become co-instructor")
    public ResponseEntity<ApiResponse<InstructorResponse>> acceptInvitation(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Accept invitation: courseId={}, userId={}", courseId, currentUser.getId());

        try {
            CourseInstructor instructor = instructorService.acceptInvitation(courseId, currentUser.getId());
            InstructorResponse response = InstructorResponse.from(instructor);
            return ResponseEntity.ok(ApiResponse.success(response, "Đã chấp nhận lời mời"));

        } catch (RuntimeException e) {
            log.error("Accept failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Reject an invitation
     */
    @PostMapping("/reject")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Reject Invitation", description = "Reject an invitation to become co-instructor")
    public ResponseEntity<ApiResponse<InstructorResponse>> rejectInvitation(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Reject invitation: courseId={}, userId={}", courseId, currentUser.getId());

        try {
            CourseInstructor instructor = instructorService.rejectInvitation(courseId, currentUser.getId());
            InstructorResponse response = InstructorResponse.from(instructor);
            return ResponseEntity.ok(ApiResponse.success(response, "Đã từ chối lời mời"));

        } catch (RuntimeException e) {
            log.error("Reject failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Update instructor permissions
     */
    @PutMapping("/{userId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Update Permissions", description = "Update co-instructor permissions")
    public ResponseEntity<ApiResponse<InstructorResponse>> updatePermissions(
            @PathVariable UUID courseId,
            @PathVariable UUID userId,
            @RequestBody UpdatePermissionsRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Update permissions: courseId={}, targetUserId={}", courseId, userId);

        try {
            CourseInstructor instructor = instructorService.updatePermissions(
                    courseId, userId, currentUser.getId(), request);

            InstructorResponse response = InstructorResponse.from(instructor);
            return ResponseEntity.ok(ApiResponse.success(response, "Đã cập nhật quyền"));

        } catch (RuntimeException e) {
            log.error("Update failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Remove an instructor
     */
    @DeleteMapping("/{userId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Remove Instructor", description = "Remove co-instructor from course")
    public ResponseEntity<ApiResponse<String>> removeInstructor(
            @PathVariable UUID courseId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Remove instructor: courseId={}, targetUserId={}", courseId, userId);

        try {
            instructorService.removeInstructor(courseId, userId, currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success("Đã xóa instructor"));

        } catch (RuntimeException e) {
            log.error("Remove failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get all instructors for a course
     */
    @GetMapping
    @Operation(summary = "List Instructors", description = "Get all instructors for a course")
    public ResponseEntity<ApiResponse<List<InstructorResponse>>> getInstructors(
            @PathVariable UUID courseId
    ) {
        log.info("Get instructors: courseId={}", courseId);

        List<CourseInstructor> instructors = instructorService.getInstructors(courseId);
        List<InstructorResponse> responses = instructors.stream()
                .map(InstructorResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(responses, "Danh sách instructors"));
    }

    /**
     * Get my pending invitations
     */
    @GetMapping("/my-invitations")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "My Invitations", description = "Get pending invitations for current user")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getMyInvitations(
            @AuthenticationPrincipal User currentUser
    ) {
        log.info("Get my invitations: userId={}", currentUser.getId());

        List<CourseInstructor> invitations = instructorService.getPendingInvitations(currentUser.getId());
        List<InvitationResponse> responses = invitations.stream()
                .map(i -> new InvitationResponse(
                        i.getCourse().getId(),
                        i.getCourse().getTitle(),
                        i.getCanManage(),
                        i.getCanViewPerformance(),
                        i.getCanGradeAssignments(),
                        i.getRevenueSharePercent(),
                        i.getInvitedAt().toString()
                ))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(responses, "Lời mời đang chờ"));
    }

    // ============ DTOs ============

    public record InviteInstructorRequest(
            String email,
            Boolean canManage,
            Boolean canViewPerformance,
            Boolean isVisible,
            Boolean canGradeAssignments,
            Integer revenueSharePercent
    ) {}

    public record InvitationResponse(
            UUID courseId,
            String courseTitle,
            Boolean canManage,
            Boolean canViewPerformance,
            Boolean canGradeAssignments,
            Integer revenueSharePercent,
            String invitedAt
    ) {}
}
