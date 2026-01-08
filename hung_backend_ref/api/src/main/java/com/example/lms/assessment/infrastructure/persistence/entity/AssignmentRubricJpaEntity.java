package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
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
    private UUID id;

    @Column(name = "assignment_id")
    private UUID assignmentId;
}
