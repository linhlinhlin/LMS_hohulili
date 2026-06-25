package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for LearningClass persistence.
 * 
 * This entity is part of the INFRASTRUCTURE layer and should NOT be used
 * directly in domain/application layers. Use the domain model instead.
 */
@Entity
@Table(name = "learning_classes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningClassJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String code;

    @Column(name = "course_version_id")
    private UUID courseVersionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "version_mode", nullable = false)
    @Builder.Default
    private VersionMode versionMode = VersionMode.PINNED;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "teacher_id")
    private UUID teacherId;

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "end_date")
    private Instant endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type")
    @Builder.Default
    private ScheduleType scheduleType = ScheduleType.CUSTOM;

    private String semester;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ClassStatus status = ClassStatus.OPEN;

    @Column(name = "max_students")
    @Builder.Default
    private Integer maxStudents = 9999;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum ClassStatus {
        OPEN("Mở"),
        CLOSED("Đóng"),
        ARCHIVED("Lưu trữ"),
        CANCELLED("Hủy");

        private final String displayName;

        ClassStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum ScheduleType {
        SEMESTER("Theo học kỳ"),
        CUSTOM("Tùy chỉnh");

        private final String displayName;

        ScheduleType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum VersionMode {
        PINNED("Gắn phiên bản"),
        FOLLOW_LATEST("Theo bản phát hành mới nhất");

        private final String displayName;

        VersionMode(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}
