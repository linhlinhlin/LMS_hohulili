package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * CourseInstructor entity - Manages multiple instructors per course
 * 
 * Role types:
 * - OWNER: Course creator with full control
 * - CO_INSTRUCTOR: Invited teacher with configurable permissions
 * 
 * Permissions:
 * - canManage: Edit course content
 * - canViewPerformance: View analytics and grades
 * - isVisible: Show in course page
 * - canGradeAssignments: Grade student work
 */
@Entity
@Table(name = "course_instructors",
       uniqueConstraints = @UniqueConstraint(columnNames = {"course_id", "user_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CourseInstructor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private InstructorRole role = InstructorRole.CO_INSTRUCTOR;

    // Permissions
    @Column(name = "can_manage")
    @Builder.Default
    private Boolean canManage = false;

    @Column(name = "can_view_performance")
    @Builder.Default
    private Boolean canViewPerformance = false;

    @Column(name = "is_visible")
    @Builder.Default
    private Boolean isVisible = false;

    @Column(name = "can_grade_assignments")
    @Builder.Default
    private Boolean canGradeAssignments = false;

    // Revenue sharing
    @Column(name = "revenue_share_percent")
    @Builder.Default
    private Integer revenueSharePercent = 0;

    // Invitation status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private InstructorStatus status = InstructorStatus.PENDING;

    @Column(name = "invited_at")
    @Builder.Default
    private Instant invitedAt = Instant.now();

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // ============ Enums ============

    public enum InstructorRole {
        OWNER,          // Course creator, full control
        CO_INSTRUCTOR   // Invited teacher with limited permissions
    }

    public enum InstructorStatus {
        PENDING,   // Awaiting acceptance
        ACCEPTED,  // Active instructor
        REJECTED,  // Declined invitation
        REMOVED    // Removed by owner
    }

    // ============ Domain Methods ============

    /**
     * Check if this instructor has full control
     */
    public boolean isOwner() {
        return this.role == InstructorRole.OWNER;
    }

    /**
     * Check if invitation is pending
     */
    public boolean isPending() {
        return this.status == InstructorStatus.PENDING;
    }

    /**
     * Check if instructor is active
     */
    public boolean isActive() {
        return this.status == InstructorStatus.ACCEPTED;
    }

    /**
     * Accept the invitation
     */
    public void accept() {
        if (this.status != InstructorStatus.PENDING) {
            throw new IllegalStateException("Can only accept PENDING invitations");
        }
        this.status = InstructorStatus.ACCEPTED;
        this.acceptedAt = Instant.now();
    }

    /**
     * Reject the invitation
     */
    public void reject() {
        if (this.status != InstructorStatus.PENDING) {
            throw new IllegalStateException("Can only reject PENDING invitations");
        }
        this.status = InstructorStatus.REJECTED;
    }

    /**
     * Remove the instructor (by owner)
     */
    public void remove() {
        if (this.role == InstructorRole.OWNER) {
            throw new IllegalStateException("Cannot remove the course owner");
        }
        this.status = InstructorStatus.REMOVED;
    }

    /**
     * Update permissions
     */
    public void updatePermissions(Boolean canManage, Boolean canViewPerformance, 
                                   Boolean isVisible, Boolean canGradeAssignments,
                                   Integer revenueSharePercent) {
        if (canManage != null) this.canManage = canManage;
        if (canViewPerformance != null) this.canViewPerformance = canViewPerformance;
        if (isVisible != null) this.isVisible = isVisible;
        if (canGradeAssignments != null) this.canGradeAssignments = canGradeAssignments;
        if (revenueSharePercent != null) {
            if (revenueSharePercent < 0 || revenueSharePercent > 100) {
                throw new IllegalArgumentException("Revenue share must be between 0 and 100");
            }
            this.revenueSharePercent = revenueSharePercent;
        }
    }

    /**
     * Factory method to create course owner
     */
    public static CourseInstructor createOwner(Course course, User user) {
        return CourseInstructor.builder()
                .course(course)
                .user(user)
                .role(InstructorRole.OWNER)
                .status(InstructorStatus.ACCEPTED)
                .canManage(true)
                .canViewPerformance(true)
                .isVisible(true)
                .canGradeAssignments(true)
                .revenueSharePercent(100)
                .invitedAt(Instant.now())
                .acceptedAt(Instant.now())
                .build();
    }

    /**
     * Factory method to invite co-instructor
     */
    public static CourseInstructor invite(Course course, User user, 
                                           Boolean canManage, Boolean canViewPerformance,
                                           Boolean isVisible, Boolean canGradeAssignments,
                                           Integer revenueSharePercent) {
        return CourseInstructor.builder()
                .course(course)
                .user(user)
                .role(InstructorRole.CO_INSTRUCTOR)
                .status(InstructorStatus.PENDING)
                .canManage(canManage != null ? canManage : false)
                .canViewPerformance(canViewPerformance != null ? canViewPerformance : false)
                .isVisible(isVisible != null ? isVisible : false)
                .canGradeAssignments(canGradeAssignments != null ? canGradeAssignments : false)
                .revenueSharePercent(revenueSharePercent != null ? revenueSharePercent : 0)
                .invitedAt(Instant.now())
                .build();
    }
}
