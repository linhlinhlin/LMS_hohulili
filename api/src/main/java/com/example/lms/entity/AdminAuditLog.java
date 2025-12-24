package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Entity to track Admin actions on Teacher content for audit purposes.
 * Follows SOTA audit logging pattern (Google/AWS CloudTrail model).
 */
@Entity
@Table(name = "admin_audit_logs", indexes = {
    @Index(name = "idx_admin_audit_admin_id", columnList = "admin_id"),
    @Index(name = "idx_admin_audit_target_owner", columnList = "target_owner_id"),
    @Index(name = "idx_admin_audit_timestamp", columnList = "timestamp")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * The admin who performed the action
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private User admin;

    /**
     * Type of action performed
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    /**
     * Type of target entity
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TargetType targetType;

    /**
     * ID of the target entity
     */
    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    /**
     * The owner (teacher) of the content being accessed
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_owner_id")
    private User targetOwner;

    /**
     * Additional details (JSON format)
     */
    @Column(columnDefinition = "TEXT")
    private String details;

    /**
     * IP address of the admin
     */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * Timestamp of action
     */
    @Column(nullable = false)
    @Builder.Default
    private Instant timestamp = Instant.now();

    /**
     * Actions that can be audited
     */
    public enum AuditAction {
        VIEW_COURSE,
        VIEW_COURSE_CONTENT,
        VIEW_LESSON,
        VIEW_ASSIGNMENT,
        VIEW_SUBMISSIONS,
        VIEW_SUBMISSION_DETAIL,
        VIEW_ATTACHMENTS,
        VIEW_ENROLLED_STUDENTS
    }

    /**
     * Types of target entities
     */
    public enum TargetType {
        COURSE,
        CHAPTER,
        LESSON,
        ASSIGNMENT,
        SUBMISSION,
        ATTACHMENT
    }
}
