package com.example.lms.assessment.infrastructure.persistence.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "assignment_rubrics")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentRubricJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "teacher_id")
    private UUID teacherId;

    @Column(name = "assignment_id")
    private UUID assignmentId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "max_points")
    private Double maxPoints;

    @Type(JsonType.class)
    @Column(name = "criteria", columnDefinition = "jsonb")
    private List<RubricCriterion> criteria;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @EqualsAndHashCode
    public static class RubricCriterion implements Serializable {
        private static final long serialVersionUID = 1L;
        private String name;
        private String description;
        private Double maxPoints;
        private List<RubricLevel> levels;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @EqualsAndHashCode
    public static class RubricLevel implements Serializable {
        private static final long serialVersionUID = 1L;
        private String label;
        private String description;
        private Double points;
    }
}
