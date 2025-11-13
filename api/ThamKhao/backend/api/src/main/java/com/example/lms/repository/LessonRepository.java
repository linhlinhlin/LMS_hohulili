package com.example.lms.repository;

import com.example.lms.entity.Lesson;
import com.example.lms.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    
    @Query("SELECT COALESCE(MAX(l.orderIndex), 0) FROM Lesson l WHERE l.section = :section")
    int findMaxOrderIndexBySection(@Param("section") Section section);

    java.util.List<Lesson> findBySectionIdOrderByOrderIndexAsc(UUID sectionId);

    @Query("SELECT l FROM Lesson l WHERE l.section.course.id = :courseId ORDER BY l.orderIndex ASC")
    java.util.List<Lesson> findByCourseIdOrderByOrderIndexAsc(@Param("courseId") UUID courseId);
}