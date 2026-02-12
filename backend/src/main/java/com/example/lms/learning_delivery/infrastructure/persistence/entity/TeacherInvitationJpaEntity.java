package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "teacher_invitations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherInvitationJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "invited_by_id", nullable = false)
    private UUID invitedById;

    @Column(name = "invited_teacher_id", nullable = false)
    private UUID invitedTeacherId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column
    private String message;

    @Column(name = "can_edit_content")
    @Builder.Default
    private boolean canEditContent = true;

    @Column(name = "can_manage_students")
    @Builder.Default
    private boolean canManageStudents = false;

    @Column(name = "can_view_analytics")
    @Builder.Default
    private boolean canViewAnalytics = true;

    @Column(name = "can_manage_settings")
    @Builder.Default
    private boolean canManageSettings = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    public enum InvitationStatus {
        PENDING, ACCEPTED, REJECTED, WITHDRAWN
    }
}
