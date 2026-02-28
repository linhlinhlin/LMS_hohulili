package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.TeacherInvitationJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.TeacherInvitationJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@Tag(name = "Teacher - Invitations", description = "Course collaboration invitation management")
@RestController
@RequestMapping("/api/v3/teacher/invitations")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
@RequiredArgsConstructor
public class TeacherInvitationControllerV3 {

    private final TeacherInvitationJpaRepository invitationRepository;
    private final JpaCourseRepository courseRepository;

    @Operation(summary = "Get all invitations for current teacher")
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getInvitations(
            @AuthenticationPrincipal UserJpaEntity user) {

        List<TeacherInvitationJpaEntity> invitations =
                invitationRepository.findByInvitedTeacherIdAndStatus(user.getId(), TeacherInvitationJpaEntity.InvitationStatus.PENDING);

        // Batch-fetch course info to prevent N+1
        Set<UUID> courseIds = invitations.stream().map(TeacherInvitationJpaEntity::getCourseId).collect(java.util.stream.Collectors.toSet());
        Map<UUID, CourseJpaEntity> courseMap = courseIds.isEmpty() ? Map.of() :
                courseRepository.findAllById(courseIds).stream()
                        .collect(java.util.stream.Collectors.toMap(CourseJpaEntity::getId, c -> c));

        List<Map<String, Object>> result = invitations.stream()
                .map(inv -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", inv.getId().toString());
                    item.put("courseId", inv.getCourseId().toString());

                    CourseJpaEntity course = courseMap.get(inv.getCourseId());
                    item.put("courseName", course != null ? course.getTitle() : "Khóa học");
                    item.put("courseThumbnail", course != null ? course.getThumbnailUrl() : null);

                    item.put("invitedBy", inv.getInvitedById().toString());
                    item.put("invitedByName", "Giảng viên");
                    item.put("invitedAt", inv.getCreatedAt() != null ? inv.getCreatedAt().toString() : null);
                    item.put("status", inv.getStatus().name().toLowerCase());

                    Map<String, Boolean> permissions = new LinkedHashMap<>();
                    permissions.put("canEditContent", inv.isCanEditContent());
                    permissions.put("canManageStudents", inv.isCanManageStudents());
                    permissions.put("canViewAnalytics", inv.isCanViewAnalytics());
                    permissions.put("canManageSettings", inv.isCanManageSettings());
                    item.put("permissions", permissions);

                    return item;
                })
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách lời mời"));
    }

    @Operation(summary = "Accept an invitation")
    @PostMapping("/{invitationId}/accept")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> acceptInvitation(
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal UserJpaEntity user) {

        TeacherInvitationJpaEntity invitation = invitationRepository.findById(invitationId)
                .orElse(null);

        if (invitation == null) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("Lời mời không tồn tại"));
        }

        if (!invitation.getInvitedTeacherId().equals(user.getId())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Bạn không có quyền thao tác lời mời này"));
        }

        if (invitation.getStatus() != TeacherInvitationJpaEntity.InvitationStatus.PENDING) {
            return ResponseEntity.status(400)
                    .body(ApiResponse.error("Lời mời đã được xử lý"));
        }

        invitation.setStatus(TeacherInvitationJpaEntity.InvitationStatus.ACCEPTED);
        invitation.setRespondedAt(Instant.now());
        invitationRepository.save(invitation);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("invitationId", invitationId.toString());
        result.put("status", "ACCEPTED");
        result.put("message", "Đã chấp nhận lời mời thành công");

        return ResponseEntity.ok(ApiResponse.success(result, "Đã chấp nhận lời mời"));
    }

    @Operation(summary = "Reject an invitation")
    @PostMapping("/{invitationId}/reject")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> rejectInvitation(
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal UserJpaEntity user) {

        TeacherInvitationJpaEntity invitation = invitationRepository.findById(invitationId)
                .orElse(null);

        if (invitation == null) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("Lời mời không tồn tại"));
        }

        if (!invitation.getInvitedTeacherId().equals(user.getId())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Bạn không có quyền thao tác lời mời này"));
        }

        if (invitation.getStatus() != TeacherInvitationJpaEntity.InvitationStatus.PENDING) {
            return ResponseEntity.status(400)
                    .body(ApiResponse.error("Lời mời đã được xử lý"));
        }

        invitation.setStatus(TeacherInvitationJpaEntity.InvitationStatus.REJECTED);
        invitation.setRespondedAt(Instant.now());
        invitationRepository.save(invitation);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("invitationId", invitationId.toString());
        result.put("status", "REJECTED");
        result.put("message", "Đã từ chối lời mời");

        return ResponseEntity.ok(ApiResponse.success(result, "Đã từ chối lời mời"));
    }
}
