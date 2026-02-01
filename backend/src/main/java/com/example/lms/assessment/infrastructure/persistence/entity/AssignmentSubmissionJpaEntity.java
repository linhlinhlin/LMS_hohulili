package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assignment_submissions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentSubmissionJpaEntity {
    @Id
    private UUID id;

    @Column(name = "assignment_id")
    private UUID assignmentId;
    
    @Column(name = "student_id")
    private UUID studentId;
}
