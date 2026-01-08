package com.example.lms.assessment.infrastructure.persistence.entity;

import lombok.*;
import java.io.Serializable;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class AssignmentAllocationStudentId implements Serializable {
    private UUID allocationId;
    private UUID studentId;
}
