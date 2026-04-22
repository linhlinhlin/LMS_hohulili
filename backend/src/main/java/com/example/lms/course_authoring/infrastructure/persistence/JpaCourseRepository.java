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

    @Query(value = "SELECT c FROM CourseJpaEntity c WHERE c.teacherId IN :teacherIds",
           countQuery = "SELECT COUNT(c) FROM CourseJpaEntity c WHERE c.teacherId IN :teacherIds")
    Page<CourseJpaEntity> findByTeacherIdIn(@Param("teacherIds") Collection<UUID> teacherIds, Pageable pageable);

    @Query(value = "SELECT c FROM CourseJpaEntity c WHERE c.teacherId IN :teacherIds AND c.status = :status",
           countQuery = "SELECT COUNT(c) FROM CourseJpaEntity c WHERE c.teacherId IN :teacherIds AND c.status = :status")
    Page<CourseJpaEntity> findByTeacherIdInAndStatus(
            @Param("teacherIds") Collection<UUID> teacherIds,
            @Param("status") CourseJpaEntity.CourseStatus status,
            Pageable pageable);

    @Query(value = """
        SELECT c FROM CourseJpaEntity c
        WHERE c.teacherId IN :teacherIds
          AND LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%'))
        """,
           countQuery = """
        SELECT COUNT(c) FROM CourseJpaEntity c
        WHERE c.teacherId IN :teacherIds
          AND LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%'))
        """)
    Page<CourseJpaEntity> findByTeacherIdInAndTitleContaining(
            @Param("teacherIds") Collection<UUID> teacherIds,
            @Param("search") String search,
            Pageable pageable);

    @Query(value = """
        SELECT c FROM CourseJpaEntity c
        WHERE c.teacherId IN :teacherIds
          AND c.status = :status
          AND LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%'))
        """,
           countQuery = """
        SELECT COUNT(c) FROM CourseJpaEntity c
        WHERE c.teacherId IN :teacherIds
          AND c.status = :status
          AND LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%'))
        """)
    Page<CourseJpaEntity> findByTeacherIdInAndStatusAndTitleContaining(
            @Param("teacherIds") Collection<UUID> teacherIds,
            @Param("status") CourseJpaEntity.CourseStatus status,
            @Param("search") String search,
            Pageable pageable);

    /**
     * Returns courses where user is either the owner OR a co-teacher (via class_teachers).
     * Used for teacher dashboard — Google Classroom pattern: co-teachers see courses in the same list.
     */
    @Query(value = """
        SELECT DISTINCT c FROM CourseJpaEntity c
        WHERE c.teacherId = :teacherId
        OR c.id IN (
            SELECT lc.courseId FROM LearningClassJpaEntity lc
            WHERE lc.id IN (
                SELECT ct.classId FROM ClassTeacherJpaEntity ct
                WHERE ct.teacherId = :teacherId
            )
        )
        ORDER BY c.createdAt DESC
    """, countQuery = """
        SELECT COUNT(DISTINCT c) FROM CourseJpaEntity c
        WHERE c.teacherId = :teacherId
        OR c.id IN (
            SELECT lc.courseId FROM LearningClassJpaEntity lc
            WHERE lc.id IN (
                SELECT ct.classId FROM ClassTeacherJpaEntity ct
                WHERE ct.teacherId = :teacherId
            )
        )
    """)
    Page<CourseJpaEntity> findByTeacherIdIncludingCoTeaching(@Param("teacherId") UUID teacherId, Pageable pageable);

    Page<CourseJpaEntity> findByStatus(CourseJpaEntity.CourseStatus status, Pageable pageable);

    Page<CourseJpaEntity> findByStatusAndCategoryId(CourseJpaEntity.CourseStatus status, UUID categoryId, Pageable pageable);

    @Query(value = "SELECT * FROM courses c WHERE c.status = :status AND c.category_id = :categoryId AND unaccent(LOWER(c.title)) LIKE unaccent(LOWER(CONCAT('%', :search, '%')))", nativeQuery = true)
    Page<CourseJpaEntity> findByStatusAndCategoryIdAndTitleContaining(
            @Param("status") String status,
            @Param("categoryId") UUID categoryId,
            @Param("search") String search,
            Pageable pageable);

    @Query(value = """
  SELECT * FROM courses c
  WHERE c.status = 'PENDING'
     OR (c.status = 'APPROVED' AND c.draft_change_status = 'PENDING_REVIEW')
  ORDER BY c.updated_at DESC, c.created_at DESC
  """,
           countQuery = """
        SELECT COUNT(*) FROM courses c
        WHERE c.status = 'PENDING'
           OR (c.status = 'APPROVED' AND c.draft_change_status = 'PENDING_REVIEW')
        """,
           nativeQuery = true)
    Page<CourseJpaEntity> findReviewQueue(Pageable pageable);

    @Query(value = """
        SELECT * FROM courses c
  WHERE c.teacher_id IN (:teacherIds)
    AND (
        c.status = 'PENDING'
        OR (c.status = 'APPROVED' AND c.draft_change_status = 'PENDING_REVIEW')
    )
  ORDER BY c.updated_at DESC, c.created_at DESC
  """,
           countQuery = """
        SELECT COUNT(*) FROM courses c
        WHERE c.teacher_id IN (:teacherIds)
          AND (
              c.status = 'PENDING'
              OR (c.status = 'APPROVED' AND c.draft_change_status = 'PENDING_REVIEW')
          )
        """,
           nativeQuery = true)
    Page<CourseJpaEntity> findReviewQueueByTeacherIdIn(@Param("teacherIds") Collection<UUID> teacherIds, Pageable pageable);

    @Query(value = "SELECT * FROM courses c WHERE c.status = :status AND unaccent(LOWER(c.title)) LIKE unaccent(LOWER(CONCAT('%', :search, '%')))", nativeQuery = true)
    Page<CourseJpaEntity> findByStatusAndTitleContaining(
            @Param("status") String status,
            @Param("search") String search,
            Pageable pageable);

    java.util.List<CourseJpaEntity> findByTeacherId(UUID teacherId);

    long countByTeacherId(UUID teacherId);

    long countByStatus(CourseJpaEntity.CourseStatus status);

    @Query(value = "SELECT * FROM courses c WHERE unaccent(LOWER(c.title)) LIKE unaccent(LOWER(CONCAT('%', :search, '%')))", nativeQuery = true)
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

    @Query(value = """
        SELECT COUNT(*) FROM courses c
        WHERE c.status = 'PENDING'
           OR (c.status = 'APPROVED' AND c.draft_change_status = 'PENDING_REVIEW')
        """, nativeQuery = true)
    long countReviewQueue();

    @Query(value = """
        SELECT COUNT(*) FROM courses c
        WHERE c.teacher_id IN (:teacherIds)
          AND (
              c.status = 'PENDING'
              OR (c.status = 'APPROVED' AND c.draft_change_status = 'PENDING_REVIEW')
          )
        """, nativeQuery = true)
    long countReviewQueueByTeacherIdIn(@Param("teacherIds") Collection<UUID> teacherIds);

    @Query("SELECT c.id FROM CourseJpaEntity c WHERE c.teacherId IN :teacherIds")
    List<UUID> findCourseIdsByTeacherIdIn(@Param("teacherIds") Collection<UUID> teacherIds);
}
