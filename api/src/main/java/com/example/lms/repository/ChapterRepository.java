package com.example.lms.repository;

import com.example.lms.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, UUID> {
    
    List<Chapter> findByCourseIdOrderByOrderIndexAsc(UUID courseId);
    
    @Query("SELECT c FROM Chapter c WHERE c.course.id = :courseId AND c.course.teacher.id = :teacherId")
    List<Chapter> findByCourseIdAndTeacherId(@Param("courseId") UUID courseId, @Param("teacherId") UUID teacherId);
    
    boolean existsByCourseIdAndTitle(UUID courseId, String title);
    
    @Query("SELECT COALESCE(MAX(c.orderIndex), 0) FROM Chapter c WHERE c.course = :course")
    int findMaxOrderIndexByCourse(@Param("course") com.example.lms.entity.Course course);
    
    @Query("SELECT COUNT(c) FROM Chapter c WHERE c.course.id = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);
}