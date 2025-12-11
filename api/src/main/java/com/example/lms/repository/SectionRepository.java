package com.example.lms.repository;

import com.example.lms.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SectionRepository extends JpaRepository<Section, UUID> {
    
    List<Section> findByLessonIdOrderByOrderIndexAsc(UUID lessonId);
    
    long countByLessonId(UUID lessonId);

    @org.springframework.data.jpa.repository.Query("SELECT MAX(s.orderIndex) FROM Section s WHERE s.lesson.id = :lessonId")
    Integer findMaxOrderIndexByLessonId(@org.springframework.data.repository.query.Param("lessonId") UUID lessonId);
}
