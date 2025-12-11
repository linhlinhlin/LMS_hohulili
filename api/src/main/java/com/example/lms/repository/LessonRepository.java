package com.example.lms.repository;

import com.example.lms.entity.Lesson;
import com.example.lms.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    
    @Query("SELECT COALESCE(MAX(l.orderIndex), 0) FROM Lesson l WHERE l.chapter = :chapter")
    int findMaxOrderIndexByChapter(@Param("chapter") Chapter chapter);

    java.util.List<Lesson> findByChapterIdOrderByOrderIndexAsc(UUID chapterId);

    @Query("SELECT l FROM Lesson l WHERE l.chapter.course.id = :courseId ORDER BY l.orderIndex ASC")
    java.util.List<Lesson> findByChapterCourseIdOrderByOrderIndexAsc(@Param("courseId") UUID courseId);

    long countByChapterId(UUID chapterId);
}