package com.example.lms.repository;

import com.example.lms.entity.Assignment;
import com.example.lms.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
    
    List<Assignment> findByCourseId(UUID courseId);
    
    Page<Assignment> findByCourseId(UUID courseId, Pageable pageable);
    
    @Query("SELECT a FROM Assignment a WHERE a.course.id = :courseId AND a.course.teacher.id = :teacherId")
    List<Assignment> findByCourseIdAndTeacherId(@Param("courseId") UUID courseId, @Param("teacherId") UUID teacherId);
    
    @Query("SELECT a FROM Assignment a WHERE a.id = :assignmentId AND a.course.teacher.id = :teacherId")
    Optional<Assignment> findByIdAndTeacherId(@Param("assignmentId") UUID assignmentId, @Param("teacherId") UUID teacherId);
    
    List<Assignment> findByCourseOrderByCreatedAtAsc(Course course);
    
    @Query("SELECT COUNT(a) FROM Assignment a WHERE a.course.id = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);
}