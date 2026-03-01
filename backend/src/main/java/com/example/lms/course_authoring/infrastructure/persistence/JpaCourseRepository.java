package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for CourseJpaEntity.
 * Uses JPA Entity (infrastructure layer), NOT domain model.
 */
@Repository
public interface JpaCourseRepository extends JpaRepository<CourseJpaEntity, UUID> {

    @Query("SELECT c FROM CourseJpaEntity c WHERE c.code = :code")
    Optional<CourseJpaEntity> findByCodeValue(@Param("code") String code);

    @Query("SELECT COUNT(c) > 0 FROM CourseJpaEntity c WHERE c.code = :code")
    boolean existsByCodeValue(@Param("code") String code);

    // Note: CourseJpaEntity doesn't have chapters relationship, so findByIdWithContent just returns the course
    // Chapter/Lesson loading should be done separately via ChapterJpaRepository
    @Query("SELECT c FROM CourseJpaEntity c WHERE c.id = :id")
    Optional<CourseJpaEntity> findByIdWithContent(@Param("id") UUID id);

    @Query("SELECT c FROM CourseJpaEntity c WHERE c.id = :id")
    Optional<CourseJpaEntity> findByIdSimple(@Param("id") UUID id);

    @Query(value = "SELECT c FROM CourseJpaEntity c WHERE c.teacherId = :teacherId",
           countQuery = "SELECT COUNT(c) FROM CourseJpaEntity c WHERE c.teacherId = :teacherId")
    Page<CourseJpaEntity> findByTeacherId(@Param("teacherId") UUID teacherId, Pageable pageable);

    Page<CourseJpaEntity> findByStatus(CourseJpaEntity.CourseStatus status, Pageable pageable);

    @Query("SELECT c FROM CourseJpaEntity c WHERE c.status = :status AND LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<CourseJpaEntity> findByStatusAndTitleContaining(
            @Param("status") CourseJpaEntity.CourseStatus status,
            @Param("search") String search,
            Pageable pageable);

    java.util.List<CourseJpaEntity> findByTeacherId(UUID teacherId);

    long countByTeacherId(UUID teacherId);

    long countByStatus(CourseJpaEntity.CourseStatus status);

    @Query("SELECT c FROM CourseJpaEntity c WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<CourseJpaEntity> findByTitleContaining(@Param("search") String search, Pageable pageable);

    @Query("SELECT c FROM CourseJpaEntity c WHERE c.id = (SELECT ch.courseId FROM ChapterJpaEntity ch WHERE ch.id = :chapterId)")
    Optional<CourseJpaEntity> findByChapterId(@Param("chapterId") UUID chapterId);

    @Query("SELECT c FROM CourseJpaEntity c WHERE c.id = (SELECT ch.courseId FROM ChapterJpaEntity ch JOIN LessonJpaEntity l ON l.chapterId = ch.id WHERE l.id = :lessonId)")
    Optional<CourseJpaEntity> findByLessonId(@Param("lessonId") UUID lessonId);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM '-(\\d+)$') AS INTEGER)), 0) FROM courses WHERE code LIKE :prefix || '-%'",
           nativeQuery = true)
    Integer findMaxSequenceNumberByPrefix(@Param("prefix") String prefix);

    // Batch queries for teacher course stats
    @Query("SELECT ch.courseId, COUNT(ch) FROM ChapterJpaEntity ch WHERE ch.courseId IN :courseIds GROUP BY ch.courseId")
    java.util.List<Object[]> countChaptersByCourseIds(@Param("courseIds") java.util.List<UUID> courseIds);

    @Query("SELECT ch.courseId, COUNT(l) FROM ChapterJpaEntity ch JOIN LessonJpaEntity l ON l.chapterId = ch.id WHERE ch.courseId IN :courseIds GROUP BY ch.courseId")
    java.util.List<Object[]> countLessonsByCourseIds(@Param("courseIds") java.util.List<UUID> courseIds);

    // === Org-scoped analytics queries ===

    @Query("SELECT COUNT(c) FROM CourseJpaEntity c WHERE c.teacherId IN :teacherIds")
    long countByTeacherIdIn(@Param("teacherIds") Collection<UUID> teacherIds);

    @Query("SELECT COUNT(c) FROM CourseJpaEntity c WHERE c.status = :status AND c.teacherId IN :teacherIds")
    long countByStatusAndTeacherIdIn(@Param("status") CourseJpaEntity.CourseStatus status, @Param("teacherIds") Collection<UUID> teacherIds);

    @Query("SELECT c.id FROM CourseJpaEntity c WHERE c.teacherId IN :teacherIds")
    List<UUID> findCourseIdsByTeacherIdIn(@Param("teacherIds") Collection<UUID> teacherIds);
}
