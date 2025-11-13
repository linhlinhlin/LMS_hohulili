package com.example.lms.repository;

import com.example.lms.entity.Course;
import com.example.lms.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {
    
    Optional<Course> findByCode(String code);
    
    List<Course> findByTeacher(User teacher);
    
    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.teacher WHERE c.status = :status")
    List<Course> findByStatus(@Param("status") Course.CourseStatus status);
    
    @Query(value = "SELECT c FROM Course c LEFT JOIN FETCH c.teacher WHERE c.status = :status",
           countQuery = "SELECT COUNT(c) FROM Course c WHERE c.status = :status")
    Page<Course> findByStatus(@Param("status") Course.CourseStatus status, Pageable pageable);
    
    @Query("SELECT c FROM Course c WHERE c.teacher.id = :teacherId")
    List<Course> findByTeacherId(@Param("teacherId") UUID teacherId);
    
    @Query("SELECT c FROM Course c WHERE c.teacher.id = :teacherId")
    Page<Course> findByTeacherId(@Param("teacherId") UUID teacherId, Pageable pageable);
    
    @Query("SELECT c FROM Course c JOIN c.enrolledStudents s WHERE s.id = :studentId")
    List<Course> findEnrolledCoursesByStudentId(@Param("studentId") UUID studentId);
    
    @Query("SELECT c FROM Course c WHERE c.title LIKE %:keyword% OR c.description LIKE %:keyword% OR c.code LIKE %:keyword%")
    List<Course> searchCourses(@Param("keyword") String keyword);
    
    @Query("SELECT COUNT(c) FROM Course c WHERE c.status = :status")
    long countByStatus(@Param("status") Course.CourseStatus status);
    
    boolean existsByCode(String code);
    
    Page<Course> findByTeacher(User teacher, Pageable pageable);
    
    Page<Course> findByEnrolledStudentsContaining(User student, Pageable pageable);
    
    Page<Course> findByStatusAndTitleContainingIgnoreCase(Course.CourseStatus status, String title, Pageable pageable);
    
    Page<Course> findByTitleContainingIgnoreCase(String title, Pageable pageable);
    
    long countByTeacherAndStatusIn(User teacher, List<Course.CourseStatus> statuses);
    
    long countByCreatedAtAfter(Instant createdAt);
}
