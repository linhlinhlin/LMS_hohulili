package com.example.lms.repository;

import com.example.lms.entity.CourseInstructor;
import com.example.lms.entity.CourseInstructor.InstructorRole;
import com.example.lms.entity.CourseInstructor.InstructorStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for CourseInstructor entity
 */
@Repository
public interface CourseInstructorRepository extends JpaRepository<CourseInstructor, UUID> {

    /**
     * Find instructor by course and user
     */
    Optional<CourseInstructor> findByCourseIdAndUserId(UUID courseId, UUID userId);

    /**
     * Find all instructors for a course
     */
    List<CourseInstructor> findByCourseIdOrderByRoleAscCreatedAtAsc(UUID courseId);

    /**
     * Find all active instructors for a course
     */
    List<CourseInstructor> findByCourseIdAndStatus(UUID courseId, InstructorStatus status);

    /**
     * Find course owner
     */
    Optional<CourseInstructor> findByCourseIdAndRole(UUID courseId, InstructorRole role);

    /**
     * Find all courses where user is instructor
     */
    List<CourseInstructor> findByUserIdAndStatus(UUID userId, InstructorStatus status);

    /**
     * Find all pending invitations for a user
     */
    List<CourseInstructor> findByUserIdAndStatusOrderByInvitedAtDesc(UUID userId, InstructorStatus status);

    /**
     * Find pending invitations with eager-loaded course and teacher to avoid lazy loading errors
     */
    @Query("SELECT ci FROM CourseInstructor ci " +
           "JOIN FETCH ci.course c " +
           "LEFT JOIN FETCH c.teacher " +
           "JOIN FETCH ci.user u " +
           "WHERE ci.user.id = :userId AND ci.status = com.example.lms.entity.CourseInstructor$InstructorStatus.PENDING " +
           "ORDER BY ci.invitedAt DESC")
    List<CourseInstructor> findPendingInvitationsWithCourse(@Param("userId") UUID userId);

    /**
     * Check if user is instructor on course
     */
    boolean existsByCourseIdAndUserIdAndStatus(UUID courseId, UUID userId, InstructorStatus status);

    /**
     * Count instructors by course and status
     */
    long countByCourseIdAndStatus(UUID courseId, InstructorStatus status);

    /**
     * Find visible instructors for course page
     */
    @Query("SELECT ci FROM CourseInstructor ci WHERE ci.course.id = :courseId " +
           "AND ci.status = com.example.lms.entity.CourseInstructor$InstructorStatus.ACCEPTED AND ci.isVisible = true " +
           "ORDER BY ci.role ASC, ci.acceptedAt ASC")
    List<CourseInstructor> findVisibleInstructors(@Param("courseId") UUID courseId);

    /**
     * Get total revenue share for a course (must not exceed 100%)
     */
    @Query("SELECT COALESCE(SUM(ci.revenueSharePercent), 0) FROM CourseInstructor ci " +
           "WHERE ci.course.id = :courseId AND ci.status = com.example.lms.entity.CourseInstructor$InstructorStatus.ACCEPTED")
    int sumRevenueShareByCourse(@Param("courseId") UUID courseId);

    // ============ Shortcut Methods ============

    /**
     * Check if user is active instructor
     */
    default boolean isActiveInstructor(UUID courseId, UUID userId) {
        return existsByCourseIdAndUserIdAndStatus(courseId, userId, InstructorStatus.ACCEPTED);
    }

    /**
     * Get pending invitations for user (with eager loading)
     */
    default List<CourseInstructor> getPendingInvitations(UUID userId) {
        return findPendingInvitationsWithCourse(userId);
    }

    /**
     * Get course owner
     */
    default Optional<CourseInstructor> getCourseOwner(UUID courseId) {
        return findByCourseIdAndRole(courseId, InstructorRole.OWNER);
    }
}
