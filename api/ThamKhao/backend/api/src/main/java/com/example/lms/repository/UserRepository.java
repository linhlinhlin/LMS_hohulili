package com.example.lms.repository;

import com.example.lms.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
    
    @Query("SELECT u FROM User u WHERE u.role = :role")
    List<User> findByRole(@Param("role") User.Role role);
    
    @Query("SELECT u FROM User u WHERE u.enabled = true")
    List<User> findAllActive();
    
    @Query("SELECT u FROM User u WHERE u.username LIKE %:keyword% OR u.email LIKE %:keyword% OR u.fullName LIKE %:keyword%")
    List<User> searchUsers(@Param("keyword") String keyword);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") User.Role role);
    
    Page<User> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(
            String username, String email, String fullName, Pageable pageable);
    
    Page<User> findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(
            String email, String fullName, Pageable pageable);
    
    Page<User> findByRole(User.Role role, Pageable pageable);
    
    Page<User> findByRoleAndEmailContainingIgnoreCaseOrRoleAndFullNameContainingIgnoreCase(
            User.Role role1, String email, User.Role role2, String fullName, Pageable pageable);
    
    long countByCreatedAtAfter(Instant createdAt);
    
    // Method for enrollment by email only
    Optional<User> findByEmailAndRole(String email, User.Role role);
    
    @Query("SELECT CASE WHEN COUNT(ce) > 0 THEN true ELSE false END FROM User u JOIN u.enrolledCourses ce WHERE u.id = :studentId AND ce.id = :courseId")
    boolean existsByCourseEnrollment(@Param("courseId") UUID courseId, @Param("studentId") UUID studentId);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO course_enrollments (student_id, course_id) VALUES (:studentId, :courseId) ON CONFLICT DO NOTHING", nativeQuery = true)
    void addCourseEnrollment(@Param("studentId") UUID studentId, @Param("courseId") UUID courseId);
}