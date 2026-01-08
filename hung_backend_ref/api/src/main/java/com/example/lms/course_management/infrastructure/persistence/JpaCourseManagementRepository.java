package com.example.lms.course_management.infrastructure.persistence;

import com.example.lms.course_management.domain.model.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface JpaCourseManagementRepository extends JpaRepository<Course, UUID> {
    
    boolean existsByCode(String code);
    
    Page<Course> findByTeacherId(UUID teacherId, Pageable pageable);
    
    // Find Course by child entities
    @Query("SELECT c FROM CourseAuthoring c JOIN c.chapters ch WHERE ch.id = :chapterId")
    java.util.Optional<Course> findByChapterId(UUID chapterId);

    @Query("SELECT c FROM CourseAuthoring c JOIN c.chapters ch JOIN ch.lessons l WHERE l.id = :lessonId")
    java.util.Optional<Course> findByLessonId(UUID lessonId);
    
    // Join fetch for publishing to avoid N+1 and LazyInit
    @Query("SELECT c FROM CourseAuthoring c LEFT JOIN FETCH c.chapters ch LEFT JOIN FETCH ch.lessons WHERE c.id = :id")
    java.util.Optional<Course> findByIdWithContent(UUID id);
}
