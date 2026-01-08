package com.example.lms.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Initializer to fix data inconsistencies on application startup.
 * This fixes enum values in database to match Java enum (uppercase).
 * Handles: assignment_type, status (assignment), and other enum fields.
 */
@Component
@RequiredArgsConstructor
public class DataFixInitializer {
    private static final Logger log = LoggerFactory.getLogger(DataFixInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixEnumValues() {
        log.info("=== Starting database enum value normalization ===");
        
        fixAssignmentTypeValues();
        fixAssignmentStatusValues();
        fixCourseStatusValues();
        fixSubmissionStatusValues();
        fixUserRoleValues();
        fixLessonTypeValues();
        fixSectionTypeConstraint();
        
        // TODO: Move fixMissingVersions to a dedicated DDD service if needed
        // log.info("=== Checking for missing course versions ===");
        
        log.info("=== Database enum value normalization completed ===");
    }

    private void fixAssignmentTypeValues() {
        log.info("Checking assignment_type values...");
        
        try {
            int updated = 0;
            
            // Try 'type' column
            updated += safeUpdate("UPDATE assignments SET type = 'FILE_UPLOAD' WHERE LOWER(type) = 'file_submission' OR LOWER(type) = 'file_upload'");
            updated += safeUpdate("UPDATE assignments SET type = 'ESSAY' WHERE LOWER(type) = 'essay'");
            updated += safeUpdate("UPDATE assignments SET type = 'QUIZ' WHERE LOWER(type) = 'quiz'");
            updated += safeUpdate("UPDATE assignments SET type = 'PROJECT' WHERE LOWER(type) = 'project'");
            updated += safeUpdate("UPDATE assignments SET type = 'ESSAY' WHERE type IS NULL");

            // Try 'assignment_type' column (legacy)
            updated += safeUpdate("UPDATE assignments SET assignment_type = 'FILE_UPLOAD' WHERE LOWER(assignment_type) = 'file_submission' OR LOWER(assignment_type) = 'file_upload'");
            updated += safeUpdate("UPDATE assignments SET assignment_type = 'ESSAY' WHERE LOWER(assignment_type) = 'essay'");
            updated += safeUpdate("UPDATE assignments SET assignment_type = 'QUIZ' WHERE LOWER(assignment_type) = 'quiz'");
            updated += safeUpdate("UPDATE assignments SET assignment_type = 'PROJECT' WHERE LOWER(assignment_type) = 'project'");
            // Critical: If assignment_type exists, fill NULLs
            updated += safeUpdate("UPDATE assignments SET assignment_type = 'ESSAY' WHERE assignment_type IS NULL");

            logResult("assignment type", updated);
        } catch (Exception e) {
            log.warn("Could not fix assignment_type values: {}", e.getMessage());
        }
    }

    private void fixAssignmentStatusValues() {
        log.info("Checking assignment status values...");
        
        try {
            int updated = 0;
            
            updated += safeUpdate("UPDATE assignments SET status = 'DRAFT' WHERE LOWER(status) = 'draft'");
            updated += safeUpdate("UPDATE assignments SET status = 'PUBLISHED' WHERE LOWER(status) = 'published'");
            updated += safeUpdate("UPDATE assignments SET status = 'CLOSED' WHERE LOWER(status) = 'closed'");
            
            logResult("assignment status", updated);
        } catch (Exception e) {
            log.warn("Could not fix assignment status values: {}", e.getMessage());
        }
    }

    private void fixCourseStatusValues() {
        log.info("Checking course status values...");
        
        try {
            int updated = 0;
            
            updated += safeUpdate("UPDATE courses SET status = 'DRAFT' WHERE LOWER(status) = 'draft'");
            updated += safeUpdate("UPDATE courses SET status = 'PENDING' WHERE LOWER(status) = 'pending'");
            updated += safeUpdate("UPDATE courses SET status = 'APPROVED' WHERE LOWER(status) = 'approved'");
            updated += safeUpdate("UPDATE courses SET status = 'REJECTED' WHERE LOWER(status) = 'rejected'");
            
            logResult("course status", updated);
        } catch (Exception e) {
            log.warn("Could not fix course status values: {}", e.getMessage());
        }
    }

    private void fixSubmissionStatusValues() {
        log.info("Checking submission status values...");
        
        try {
            int updated = 0;
            
            // Common submission statuses
            updated += safeUpdate("UPDATE submissions SET status = 'PENDING' WHERE LOWER(status) = 'pending'");
            updated += safeUpdate("UPDATE submissions SET status = 'SUBMITTED' WHERE LOWER(status) = 'submitted'");
            updated += safeUpdate("UPDATE submissions SET status = 'GRADED' WHERE LOWER(status) = 'graded'");
            updated += safeUpdate("UPDATE submissions SET status = 'LATE' WHERE LOWER(status) = 'late'");
            
            // Also check assignment_submissions table if exists
            updated += safeUpdate("UPDATE assignment_submissions SET status = 'PENDING' WHERE LOWER(status) = 'pending'");
            updated += safeUpdate("UPDATE assignment_submissions SET status = 'SUBMITTED' WHERE LOWER(status) = 'submitted'");
            updated += safeUpdate("UPDATE assignment_submissions SET status = 'GRADED' WHERE LOWER(status) = 'graded'");
            updated += safeUpdate("UPDATE assignment_submissions SET status = 'LATE' WHERE LOWER(status) = 'late'");
            
            logResult("submission status", updated);
        } catch (Exception e) {
            log.warn("Could not fix submission status values: {}", e.getMessage());
        }
    }

    private int safeUpdate(String sql) {
        try {
            return jdbcTemplate.update(sql);
        } catch (Exception e) {
            // Silently ignore errors (table might not exist, column might not exist, etc.)
            return 0;
        }
    }

    private void fixUserRoleValues() {
        log.info("Checking user role values...");
        
        try {
            int updated = 0;
            
            updated += safeUpdate("UPDATE users SET role = 'ADMIN' WHERE LOWER(role) = 'admin'");
            updated += safeUpdate("UPDATE users SET role = 'TEACHER' WHERE LOWER(role) = 'teacher'");
            updated += safeUpdate("UPDATE users SET role = 'STUDENT' WHERE LOWER(role) = 'student'");
            
            logResult("user role", updated);
        } catch (Exception e) {
            log.warn("Could not fix user role values: {}", e.getMessage());
        }
    }

    private void fixLessonTypeValues() {
        log.info("Checking lesson type values...");
        
        try {
            int updated = 0;
            
            updated += safeUpdate("UPDATE lessons SET lesson_type = 'LECTURE' WHERE LOWER(lesson_type) = 'lecture'");
            updated += safeUpdate("UPDATE lessons SET lesson_type = 'ASSIGNMENT' WHERE LOWER(lesson_type) = 'assignment'");
            updated += safeUpdate("UPDATE lessons SET lesson_type = 'QUIZ' WHERE LOWER(lesson_type) = 'quiz'");
            
            logResult("lesson type", updated);
        } catch (Exception e) {
            log.warn("Could not fix lesson type values: {}", e.getMessage());
        }
    }

    private void fixSectionTypeConstraint() {
        log.info("Fixing sections_type_check constraint...");
        try {
            // Drop existing constraint
            jdbcTemplate.execute("ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_type_check");
            // Add new constraint including FILE and ASSIGNMENT
            jdbcTemplate.execute("ALTER TABLE sections ADD CONSTRAINT sections_type_check CHECK (type IN ('VIDEO', 'TEXT', 'QUIZ', 'FILE', 'ASSIGNMENT'))");
            log.info("Successfully updated sections_type_check constraint");
        } catch (Exception e) {
            log.warn("Could not fix sections type constraint: {}", e.getMessage());
        }
    }

    private void logResult(String fieldName, int updated) {
        if (updated > 0) {
            log.info("Fixed {} {} values to uppercase", updated, fieldName);
        } else {
            log.debug("No {} values needed fixing", fieldName);
        }
    }
}
