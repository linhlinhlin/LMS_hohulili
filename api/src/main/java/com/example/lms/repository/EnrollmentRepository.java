package com.example.lms.repository;

import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {
    
    // Find active enrollment for a student in a specific class
    Optional<Enrollment> findByStudentIdAndLearningClassId(UUID studentId, UUID classId);
    
    // Check if student is already enrolled in ANY class of the given Course
    @Query("SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END " +
           "FROM Enrollment e " +
           "WHERE e.student.id = :studentId " +
           "AND e.learningClass.course.id = :courseId " +
           "AND e.status = 'ACTIVE'")
    boolean existsByStudentIdAndClassCourseId(@Param("studentId") UUID studentId, @Param("courseId") UUID courseId);

    // Count students in a class
    long countByLearningClassId(UUID classId);
    
    // Find all enrollments for a student
    List<Enrollment> findByStudentId(UUID studentId);
}
