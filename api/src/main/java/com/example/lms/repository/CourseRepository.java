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
import java.util.Set;
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
    
    /**
     * SOTA: Find courses by teacher with teacher eagerly loaded (Admin view)
     * Avoids N+1 problem and LazyInitializationException
     */
    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.teacher WHERE c.teacher.id = :teacherId")
    List<Course> findByTeacherIdWithTeacher(@Param("teacherId") UUID teacherId);
    
    @Query("SELECT c FROM Course c JOIN c.enrolledStudents s WHERE s.id = :studentId")
    List<Course> findEnrolledCoursesByStudentId(@Param("studentId") UUID studentId);
    
    /**
     * SOTA: Find enrolled courses by student with teacher eagerly loaded (Admin view)
     * Avoids N+1 problem and LazyInitializationException
     */
    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.teacher JOIN c.enrolledStudents s WHERE s.id = :studentId")
    List<Course> findEnrolledCoursesByStudentIdWithTeacher(@Param("studentId") UUID studentId);
    
    @Query("SELECT c FROM Course c WHERE c.title LIKE %:keyword% OR c.description LIKE %:keyword% OR c.code LIKE %:keyword%")
    List<Course> searchCourses(@Param("keyword") String keyword);
    
    @Query("SELECT COUNT(c) FROM Course c WHERE c.status = :status")
    long countByStatus(@Param("status") Course.CourseStatus status);
    
    boolean existsByCode(String code);
    
    Page<Course> findByTeacher(User teacher, Pageable pageable);

    Page<Course> findByEnrolledStudentsContaining(User student, Pageable pageable);

    /**
     * Find enrolled courses with teacher eagerly loaded to avoid LazyInitializationException
     */
    @Query(value = "SELECT c FROM Course c " +
           "LEFT JOIN FETCH c.teacher t " +
           "JOIN c.enrolledStudents es " +
           "WHERE es = :student",
           countQuery = "SELECT COUNT(c) FROM Course c JOIN c.enrolledStudents es WHERE es = :student")
    Page<Course> findEnrolledCoursesWithTeacher(@Param("student") User student, Pageable pageable);

    /**
     * OPTIMIZED: DTO Projection query for teacher's courses.
     * Returns CourseSummaryDTO directly instead of Entity to avoid N+1 queries.
     * Single query fetches teacher name and enrolled count.
     */
    @Query(value = "SELECT new com.example.lms.dto.CourseSummaryDTO(" +
           "c.id, c.code, c.title, c.description, " +
           "CAST(c.status AS string), t.fullName, " +
           "SIZE(c.enrolledStudents), " +
           "c.createdAt, CAST(null AS boolean)) " +
           "FROM Course c " +
           "LEFT JOIN c.teacher t " +
           "WHERE c.teacher = :teacher",
           countQuery = "SELECT COUNT(c) FROM Course c WHERE c.teacher = :teacher")
    Page<com.example.lms.dto.CourseSummaryDTO> findCourseSummariesByTeacher(
        @Param("teacher") User teacher, 
        Pageable pageable);

    /**
     * SOTA: Get courses where user is OWNER or ACCEPTED CO-INSTRUCTOR.
     * This enables co-instructors to see courses they were invited to.
     */
    @Query(value = "SELECT new com.example.lms.dto.CourseSummaryDTO(" +
           "c.id, c.code, c.title, c.description, " +
           "CAST(c.status AS string), t.fullName, " +
           "SIZE(c.enrolledStudents), " +
           "c.createdAt, CAST(null AS boolean)) " +
           "FROM Course c " +
           "LEFT JOIN c.teacher t " +
           "LEFT JOIN CourseInstructor ci ON ci.course = c " +
           "WHERE c.teacher = :user " +
           "   OR (ci.user = :user AND ci.status = com.example.lms.entity.CourseInstructor$InstructorStatus.ACCEPTED) " +
           "GROUP BY c.id, c.code, c.title, c.description, c.status, t.fullName, c.createdAt",
           countQuery = "SELECT COUNT(DISTINCT c) FROM Course c LEFT JOIN CourseInstructor ci ON ci.course = c " +
                        "WHERE c.teacher = :user OR (ci.user = :user AND ci.status = com.example.lms.entity.CourseInstructor$InstructorStatus.ACCEPTED)")
    Page<com.example.lms.dto.CourseSummaryDTO> findCourseSummariesByTeacherOrInstructor(
        @Param("user") User user, 
        Pageable pageable);
    Page<Course> findByStatusAndTitleContainingIgnoreCase(Course.CourseStatus status, String title, Pageable pageable);
    
    Page<Course> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    /**
     * SOTA: Admin query - find all courses with teacher eagerly loaded
     */
    @Query(value = "SELECT c FROM Course c LEFT JOIN FETCH c.teacher",
           countQuery = "SELECT COUNT(c) FROM Course c")
    Page<Course> findAllWithTeacher(Pageable pageable);

    /**
     * SOTA: Admin query - find by status with teacher eagerly loaded
     */
    @Query(value = "SELECT c FROM Course c LEFT JOIN FETCH c.teacher WHERE c.status = :status",
           countQuery = "SELECT COUNT(c) FROM Course c WHERE c.status = :status")
    Page<Course> findByStatusWithTeacher(@Param("status") Course.CourseStatus status, Pageable pageable);

    /**
     * SOTA: Admin query - find by status and title with teacher eagerly loaded
     */
    @Query(value = "SELECT c FROM Course c LEFT JOIN FETCH c.teacher WHERE c.status = :status AND LOWER(c.title) LIKE LOWER(CONCAT('%', :title, '%'))",
           countQuery = "SELECT COUNT(c) FROM Course c WHERE c.status = :status AND LOWER(c.title) LIKE LOWER(CONCAT('%', :title, '%'))")
    Page<Course> findByStatusAndTitleWithTeacher(@Param("status") Course.CourseStatus status, @Param("title") String title, Pageable pageable);

    /**
     * SOTA: Admin query - find by title with teacher eagerly loaded
     */
    @Query(value = "SELECT c FROM Course c LEFT JOIN FETCH c.teacher WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :title, '%'))",
           countQuery = "SELECT COUNT(c) FROM Course c WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :title, '%'))")
    Page<Course> findByTitleWithTeacher(@Param("title") String title, Pageable pageable);
    
    long countByTeacherAndStatusIn(User teacher, List<Course.CourseStatus> statuses);
    
    long countByCreatedAtAfter(Instant createdAt);
    
    /**
     * Find all enrolled students in a course with pagination
     * Optimized: Query from User side to avoid lazy loading Course.enrolledStudents
     */
    @Query("SELECT u FROM User u JOIN u.enrolledCourses c WHERE c.id = :courseId ORDER BY u.fullName ASC")
    Page<User> findEnrolledStudents(@Param("courseId") UUID courseId, Pageable pageable);
    
    /**
     * Find enrolled students by search term (fullName or email)
     * Optimized: Query from User side
     */
    @Query("SELECT u FROM User u JOIN u.enrolledCourses c WHERE c.id = :courseId AND (LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) ORDER BY u.fullName ASC")
    Page<User> searchEnrolledStudents(@Param("courseId") UUID courseId, @Param("search") String search, Pageable pageable);

    /**
     * Check if a student is enrolled in a course
     */
    @Query("SELECT CASE WHEN COUNT(es) > 0 THEN true ELSE false END FROM Course c JOIN c.enrolledStudents es WHERE c.id = :courseId AND es.id = :studentId")
    boolean existsByEnrolledStudentAndCourse(@Param("studentId") UUID studentId, @Param("courseId") UUID courseId);
    
    /**
     * Count enrolled students in a course
     */
    @Query("SELECT COUNT(es) FROM Course c JOIN c.enrolledStudents es WHERE c.id = :courseId")
    int countEnrolledStudents(@Param("courseId") UUID courseId);
    
    /**
     * Find course by ID with teacher eagerly loaded.
     * Note: Due to MultipleBagFetchException, we cannot JOIN FETCH all nested collections.
     * Use Hibernate.initialize() in service layer for lessons and sections.
     */
    @Query("SELECT c FROM Course c " +
           "LEFT JOIN FETCH c.teacher " +
           "LEFT JOIN FETCH c.chapters " +
           "WHERE c.id = :courseId")
    Optional<Course> findByIdWithSectionsAndLessons(@Param("courseId") UUID courseId);
    
    /**
     * Check if student is enrolled in any of teacher's courses
     */
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END " +
           "FROM Course c " +
           "JOIN c.enrolledStudents s " +
           "WHERE c.teacher.id = :teacherId " +
           "AND s.id = :studentId")
    boolean existsStudentInTeacherCourses(
        @Param("teacherId") UUID teacherId, 
        @Param("studentId") UUID studentId
    );
    
    /**
     * Find specific course by teacher ID and course ID
     */
    @Query("SELECT c FROM Course c WHERE c.teacher.id = :teacherId AND c.id = :courseId")
    Optional<Course> findByTeacherIdAndCourseId(
        @Param("teacherId") UUID teacherId,
        @Param("courseId") UUID courseId
    );

    /**
     * SOTA: DTO Projection for course detail page.
     * Returns CourseDetailDTO directly - all data loaded in single query.
     * Avoids LazyInitializationException by not exposing entity relationships.
     * Pattern: Google/Netflix DTO Projection Architecture (2025)
     */
    @Query("SELECT new com.example.lms.dto.CourseDetailDTO(" +
           "c.id, c.code, c.title, c.description, " +
           "CAST(c.status AS string), t.id, t.fullName, " +
           "SIZE(c.enrolledStudents), SIZE(c.chapters), " +
           "c.createdAt, c.updatedAt, " +
           "c.instructorId, cat.id, cat.name, " +
           "c.welcomeMessage, c.courseInformation, c.benefits, " +
           "c.introVideoUrl, c.credits, " +
           "CAST(c.visibility AS string), CAST(c.priceType AS string), " +
           "c.price, c.salePrice) " +
           "FROM Course c " +
           "LEFT JOIN c.teacher t " +
           "LEFT JOIN c.category cat " +
           "WHERE c.id = :courseId")
    Optional<com.example.lms.dto.CourseDetailDTO> findCourseDetailById(@Param("courseId") UUID courseId);

    /**
     * Get teaching staff IDs for a course (loaded separately to avoid MultipleBagFetch)
     */
    @Query("SELECT ts FROM Course c JOIN c.teachingStaffIds ts WHERE c.id = :courseId")
    Set<UUID> findTeachingStaffIdsByCourseId(@Param("courseId") UUID courseId);

    /**
     * Get tags for a course (loaded separately to avoid MultipleBagFetch)
     */
    @Query("SELECT tag FROM Course c JOIN c.tags tag WHERE c.id = :courseId")
    Set<String> findTagsByCourseId(@Param("courseId") UUID courseId);

    /**
     * SOTA: DTO Projection for enrolled students.
     * Avoids fetching full User entities and lazy loading issues.
     */
    @Query("SELECT new com.example.lms.dto.StudentSummaryDTO(" +
           "u.id, u.fullName, u.email, u.createdAt, null, null) " +
           "FROM User u JOIN u.enrolledCourses c " +
           "WHERE c.id = :courseId " +
           "ORDER BY u.fullName ASC")
    Page<com.example.lms.dto.StudentSummaryDTO> findCourseStudentSummaries(@Param("courseId") UUID courseId, Pageable pageable);

    @Query("SELECT new com.example.lms.dto.StudentSummaryDTO(" +
           "u.id, u.fullName, u.email, u.createdAt, null, null) " +
           "FROM User u JOIN u.enrolledCourses c " +
           "WHERE c.id = :courseId " +
           "AND (LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY u.fullName ASC")
    Page<com.example.lms.dto.StudentSummaryDTO> searchCourseStudentSummaries(@Param("courseId") UUID courseId, @Param("search") String search, Pageable pageable);

    /**
     * Count courses created by a teacher (for admin dashboard)
     */
    @Query("SELECT COUNT(c) FROM Course c WHERE c.teacher.id = :teacherId")
    int countByTeacherId(@Param("teacherId") UUID teacherId);

    /**
     * Count course enrollments for a student (for admin dashboard)
     */
    @Query("SELECT COUNT(c) FROM Course c JOIN c.enrolledStudents es WHERE es.id = :studentId")
    int countEnrollmentsByStudentId(@Param("studentId") UUID studentId);

    /**
     * SOTA: Find courses where a user is in the teaching staff (co-op courses)
     * For admin view - shows courses a teacher has been invited to collaborate on
     */
    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.teacher JOIN c.teachingStaffIds ts WHERE ts = :staffId")
    List<Course> findCoopCoursesByStaffId(@Param("staffId") UUID staffId);

    /**
     * Count co-op courses for a teacher (for admin dashboard)
     */
    @Query("SELECT COUNT(c) FROM Course c JOIN c.teachingStaffIds ts WHERE ts = :staffId")
    int countCoopCoursesByStaffId(@Param("staffId") UUID staffId);
}
