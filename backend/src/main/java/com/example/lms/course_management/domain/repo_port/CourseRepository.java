package com.example.lms.course_management.domain.repo_port;

import com.example.lms.course_management.domain.model.Course;
import com.example.lms.course_management.domain.model.CourseVersion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface CourseRepository {
    Course save(Course course);
    Optional<Course> findById(UUID id);
    Page<Course> findByTeacherId(UUID teacherId, Pageable pageable);
    boolean existsByCode(String code);
    
    // For Snapshot
    CourseVersion saveVersion(CourseVersion version);
    Optional<CourseVersion> findVersionByCourseIdAndVersionNumber(UUID courseId, Integer versionNumber);
    Optional<CourseVersion> findVersionById(UUID id);
    
    // Lookup Aggregate Root by Child ID (for clean DDD updates)
    java.util.Optional<Course> findByChapterId(UUID chapterId);
    java.util.Optional<Course> findByLessonId(UUID lessonId);

    // Full aggregate loading (with chapters/lessons)
    Optional<Course> findByIdWithContent(UUID id);

    // Version numbering
    Integer getNextVersionNumber(UUID courseId);
}
