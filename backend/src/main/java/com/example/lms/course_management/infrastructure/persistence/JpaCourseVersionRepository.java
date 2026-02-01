package com.example.lms.course_management.infrastructure.persistence;

import com.example.lms.course_management.domain.model.CourseVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaCourseVersionRepository extends JpaRepository<CourseVersion, UUID> {
    Optional<CourseVersion> findByCourseIdAndVersionNumber(UUID courseId, Integer versionNumber);
    
    @Query("SELECT MAX(cv.versionNumber) FROM CourseVersion cv WHERE cv.courseId = :courseId")
    Integer findMaxVersionByCourseId(UUID courseId);
}
