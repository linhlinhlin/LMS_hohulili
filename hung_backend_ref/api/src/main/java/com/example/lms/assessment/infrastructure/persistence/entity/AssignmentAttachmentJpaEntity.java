package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "assignment_attachments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentAttachmentJpaEntity {
    @Id
    private UUID id;

    @Column(name = "assignment_id")
    private UUID assignmentId;
}
