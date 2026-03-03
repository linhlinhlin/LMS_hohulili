package com.example.lms.course_authoring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "course_tag_assignments")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@IdClass(CourseTagAssignmentJpaEntity.CourseTagAssignmentId.class)
public class CourseTagAssignmentJpaEntity {

    @Id
    @Column(name = "course_id")
    private UUID courseId;

    @Id
    @Column(name = "tag_id")
    private UUID tagId;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseTagAssignmentId implements Serializable {
        private UUID courseId;
        private UUID tagId;
    }
}
