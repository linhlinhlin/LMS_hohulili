package com.example.lms.repository;

import com.example.lms.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SectionRepository extends JpaRepository<Section, UUID> {
    
    List<Section> findByCourseIdOrderByOrderIndexAsc(UUID courseId);
    
    @Query("SELECT s FROM Section s WHERE s.course.id = :courseId AND s.course.teacher.id = :teacherId")
    List<Section> findByCourseIdAndTeacherId(@Param("courseId") UUID courseId, @Param("teacherId") UUID teacherId);
    
    boolean existsByCourseIdAndTitle(UUID courseId, String title);
    
    @Query("SELECT COALESCE(MAX(s.orderIndex), 0) FROM Section s WHERE s.course = :course")
    int findMaxOrderIndexByCourse(@Param("course") com.example.lms.entity.Course course);
    
    @Query("SELECT COUNT(s) FROM Section s WHERE s.course.id = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);
}