package com.example.lms.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Projection interface for efficient student enrollment queries
 * Avoids loading full entities when only specific fields are needed
 */
public interface StudentEnrollmentProjection {
    UUID getStudentId();
    String getFullName();
    String getEmail();
    Boolean getEnabled();
    UUID getCourseId();
    String getCourseTitle();
    Instant getEnrolledAt();
    Instant getLastAccessed();
    String getEnrollmentStatus();
}
