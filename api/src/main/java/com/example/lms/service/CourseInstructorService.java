package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.CourseInstructor;
import com.example.lms.entity.CourseInstructor.InstructorStatus;
import com.example.lms.entity.User;
import com.example.lms.repository.CourseInstructorRepository;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing course instructors (teacher hierarchy)
 * 
 * Features:
 * - Invite co-instructors to a course
 * - Accept/reject invitations
 * - Update permissions
 * - Remove instructors
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CourseInstructorService {

    private final CourseInstructorRepository instructorRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    // ============ Invitation Flow ============

    /**
     * Invite a user as co-instructor
     */
    @Transactional
    public CourseInstructor inviteInstructor(UUID courseId, UUID userId, UUID inviterId,
                                              InviteRequest request) {
        log.info("Inviting instructor: courseId={}, userId={}, inviterId={}", courseId, userId, inviterId);

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course không tồn tại: " + courseId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại: " + userId));

        // Verify inviter is course owner or has permission
        verifyCanManage(courseId, inviterId);

        // BUG #8: Không cho mời chính mình
        if (userId.equals(inviterId)) {
            throw new IllegalArgumentException("Bạn không thể mời chính mình làm co-instructor");
        }

        // Không cho mời owner hiện tại của course
        if (course.getTeacher() != null && course.getTeacher().getId().equals(userId)) {
            throw new IllegalArgumentException("Người này đã là chủ sở hữu khóa học");
        }

        // Check if already instructor
        if (instructorRepository.findByCourseIdAndUserId(courseId, userId).isPresent()) {
            throw new IllegalStateException("User đã là instructor của khóa học này");
        }

        // Verify user is a teacher
        if (user.getRole() != User.Role.TEACHER && user.getRole() != User.Role.ADMIN) {
            throw new IllegalArgumentException("Chỉ có thể mời TEACHER hoặc ADMIN làm co-instructor");
        }

        // Check revenue share doesn't exceed 100%
        int currentShare = instructorRepository.sumRevenueShareByCourse(courseId);
        int newShare = request.revenueSharePercent() != null ? request.revenueSharePercent() : 0;
        if (currentShare + newShare > 100) {
            throw new IllegalArgumentException("Tổng revenue share không được vượt quá 100%");
        }

        // Create invitation
        CourseInstructor instructor = CourseInstructor.invite(
                course, user,
                request.canManage(),
                request.canViewPerformance(),
                request.isVisible(),
                request.canGradeAssignments(),
                request.revenueSharePercent()
        );

        CourseInstructor saved = instructorRepository.save(instructor);
        log.info("Instructor invited: instructorId={}", saved.getId());

        return saved;
    }

    /**
     * Accept an invitation
     */
    @Transactional
    public CourseInstructor acceptInvitation(UUID courseId, UUID userId) {
        log.info("Accepting invitation: courseId={}, userId={}", courseId, userId);

        CourseInstructor instructor = instructorRepository.findByCourseIdAndUserId(courseId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lời mời"));

        instructor.accept();
        CourseInstructor saved = instructorRepository.save(instructor);

        log.info("Invitation accepted: instructorId={}", saved.getId());
        return saved;
    }

    /**
     * Reject an invitation
     */
    @Transactional
    public CourseInstructor rejectInvitation(UUID courseId, UUID userId) {
        log.info("Rejecting invitation: courseId={}, userId={}", courseId, userId);

        CourseInstructor instructor = instructorRepository.findByCourseIdAndUserId(courseId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lời mời"));

        instructor.reject();
        CourseInstructor saved = instructorRepository.save(instructor);

        log.info("Invitation rejected: instructorId={}", saved.getId());
        return saved;
    }

    // ============ Permission Management ============

    /**
     * Update instructor permissions
     */
    @Transactional
    public CourseInstructor updatePermissions(UUID courseId, UUID targetUserId, UUID requesterId,
                                               UpdatePermissionsRequest request) {
        log.info("Updating permissions: courseId={}, targetUserId={}, requesterId={}", 
                courseId, targetUserId, requesterId);

        // Verify requester can manage
        verifyCanManage(courseId, requesterId);

        CourseInstructor instructor = instructorRepository.findByCourseIdAndUserId(courseId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Instructor không tồn tại"));

        // Cannot modify owner's permissions
        if (instructor.isOwner()) {
            throw new IllegalStateException("Không thể thay đổi quyền của course owner");
        }

        // Check revenue share
        if (request.revenueSharePercent() != null) {
            int currentShare = instructorRepository.sumRevenueShareByCourse(courseId);
            int oldShare = instructor.getRevenueSharePercent();
            int newShare = request.revenueSharePercent();
            if (currentShare - oldShare + newShare > 100) {
                throw new IllegalArgumentException("Tổng revenue share không được vượt quá 100%");
            }
        }

        instructor.updatePermissions(
                request.canManage(),
                request.canViewPerformance(),
                request.isVisible(),
                request.canGradeAssignments(),
                request.revenueSharePercent()
        );

        CourseInstructor saved = instructorRepository.save(instructor);
        log.info("Permissions updated: instructorId={}", saved.getId());
        return saved;
    }

    /**
     * Remove an instructor
     */
    @Transactional
    public void removeInstructor(UUID courseId, UUID targetUserId, UUID requesterId) {
        log.info("Removing instructor: courseId={}, targetUserId={}, requesterId={}", 
                courseId, targetUserId, requesterId);

        // Verify requester can manage
        verifyCanManage(courseId, requesterId);

        CourseInstructor instructor = instructorRepository.findByCourseIdAndUserId(courseId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Instructor không tồn tại"));

        instructor.remove();
        instructorRepository.save(instructor);

        log.info("Instructor removed: courseId={}, userId={}", courseId, targetUserId);
    }

    // ============ Query Methods ============

    /**
     * Get all instructors for a course
     */
    @Transactional(readOnly = true)
    public List<CourseInstructor> getInstructors(UUID courseId) {
        return instructorRepository.findByCourseIdOrderByRoleAscCreatedAtAsc(courseId);
    }

    /**
     * Get active instructors for a course
     */
    @Transactional(readOnly = true)
    public List<CourseInstructor> getActiveInstructors(UUID courseId) {
        return instructorRepository.findByCourseIdAndStatus(courseId, InstructorStatus.ACCEPTED);
    }

    /**
     * Get visible instructors (for course page)
     */
    @Transactional(readOnly = true)
    public List<CourseInstructor> getVisibleInstructors(UUID courseId) {
        return instructorRepository.findVisibleInstructors(courseId);
    }

    /**
     * Get pending invitations for a user
     */
    @Transactional(readOnly = true)
    public List<CourseInstructor> getPendingInvitations(UUID userId) {
        return instructorRepository.getPendingInvitations(userId);
    }

    /**
     * Check if user can manage course
     */
    @Transactional(readOnly = true)
    public boolean canManageCourse(UUID courseId, UUID userId) {
        // Check trong bảng course_instructors trước
        Optional<CourseInstructor> instructor = instructorRepository.findByCourseIdAndUserId(courseId, userId);
        if (instructor.isPresent()) {
            CourseInstructor i = instructor.get();
            return i.isActive() && (i.isOwner() || Boolean.TRUE.equals(i.getCanManage()));
        }
        
        // Fallback: Check course.teacher (owner cũ - cho các khóa học chưa có record trong course_instructors)
        return courseRepository.findById(courseId)
                .map(course -> course.getTeacher() != null && course.getTeacher().getId().equals(userId))
                .orElse(false);
    }

    // ============ Helper Methods ============

    private void verifyCanManage(UUID courseId, UUID userId) {
        if (!canManageCourse(courseId, userId)) {
            throw new RuntimeException("Bạn không có quyền quản lý instructors của khóa học này");
        }
    }

    // ============ DTOs ============

    public record InviteRequest(
            Boolean canManage,
            Boolean canViewPerformance,
            Boolean isVisible,
            Boolean canGradeAssignments,
            Integer revenueSharePercent
    ) {}

    public record UpdatePermissionsRequest(
            Boolean canManage,
            Boolean canViewPerformance,
            Boolean isVisible,
            Boolean canGradeAssignments,
            Integer revenueSharePercent
    ) {}

    public record InstructorResponse(
            UUID id,
            UUID userId,
            String userName,
            String userEmail,
            String role,
            String status,
            Boolean canManage,
            Boolean canViewPerformance,
            Boolean isVisible,
            Boolean canGradeAssignments,
            Integer revenueSharePercent,
            String invitedAt,
            String acceptedAt
    ) {
        public static InstructorResponse from(CourseInstructor instructor) {
            return new InstructorResponse(
                    instructor.getId(),
                    instructor.getUser().getId(),
                    instructor.getUser().getFullName(),
                    instructor.getUser().getEmail(),
                    instructor.getRole().name(),
                    instructor.getStatus().name(),
                    instructor.getCanManage(),
                    instructor.getCanViewPerformance(),
                    instructor.getIsVisible(),
                    instructor.getCanGradeAssignments(),
                    instructor.getRevenueSharePercent(),
                    instructor.getInvitedAt() != null ? instructor.getInvitedAt().toString() : null,
                    instructor.getAcceptedAt() != null ? instructor.getAcceptedAt().toString() : null
            );
        }
    }
}
