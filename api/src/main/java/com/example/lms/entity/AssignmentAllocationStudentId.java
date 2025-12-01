package com.example.lms.entity;

import lombok.*;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite key cho AssignmentAllocationStudent
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentAllocationStudentId implements Serializable {
    private UUID allocation;
    private UUID student;
}
