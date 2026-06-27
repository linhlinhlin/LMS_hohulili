package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicLearningPackageRevenueSplitJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface AcademicLearningPackageRevenueSplitJpaRepository
        extends JpaRepository<AcademicLearningPackageRevenueSplitJpaEntity, UUID> {

    boolean existsByOrganizationIdAndEnrollmentId(UUID organizationId, UUID enrollmentId);

    List<AcademicLearningPackageRevenueSplitJpaEntity>
    findByOrganizationIdAndEnrollmentIdOrderByCreatedAtAsc(UUID organizationId, UUID enrollmentId);

    @Query(value = """
        SELECT s.*
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE s.teacher_id = :teacherId
          AND e.status = 'ACTIVE'
        ORDER BY s.created_at DESC
        """,
        countQuery = """
        SELECT COUNT(*)
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE s.teacher_id = :teacherId
          AND e.status = 'ACTIVE'
        """,
        nativeQuery = true)
    Page<AcademicLearningPackageRevenueSplitJpaEntity> findTeacherRevenueLines(
            @Param("teacherId") UUID teacherId,
            Pageable pageable);

    @Query(value = """
        SELECT COALESCE(SUM(s.teacher_amount), 0)
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE s.teacher_id = :teacherId
          AND e.status = 'ACTIVE'
        """, nativeQuery = true)
    BigDecimal sumTeacherAmountByTeacherId(@Param("teacherId") UUID teacherId);

    @Query(value = """
        SELECT COALESCE(SUM(s.teacher_amount), 0)
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE s.teacher_id = :teacherId
          AND e.status = 'ACTIVE'
          AND EXTRACT(YEAR FROM s.created_at) = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)
          AND EXTRACT(MONTH FROM s.created_at) = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)
        """, nativeQuery = true)
    BigDecimal sumTeacherAmountThisMonth(@Param("teacherId") UUID teacherId);

    @Query(value = """
        SELECT COALESCE(SUM(s.teacher_amount), 0)
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE s.teacher_id = :teacherId
          AND e.status = 'ACTIVE'
          AND s.created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP - INTERVAL '1 month')
          AND s.created_at <  DATE_TRUNC('month', CURRENT_TIMESTAMP)
        """, nativeQuery = true)
    BigDecimal sumTeacherAmountLastMonth(@Param("teacherId") UUID teacherId);

    @Query(value = """
        SELECT DISTINCT s.course_id
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE s.teacher_id = :teacherId
          AND e.status = 'ACTIVE'
        """, nativeQuery = true)
    List<UUID> findDistinctCourseIdsByTeacherId(@Param("teacherId") UUID teacherId);

    @Query(value = """
        SELECT COALESCE(SUM(s.gross_amount), 0)
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE e.status = 'ACTIVE'
        """, nativeQuery = true)
    BigDecimal sumGrossRevenueAll();

    @Query(value = """
        SELECT COALESCE(SUM(s.platform_amount), 0)
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE e.status = 'ACTIVE'
        """, nativeQuery = true)
    BigDecimal sumPlatformAmountAll();

    @Query(value = """
        SELECT COALESCE(SUM(s.teacher_amount), 0)
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE e.status = 'ACTIVE'
        """, nativeQuery = true)
    BigDecimal sumTeacherAmountAll();

    @Query(value = """
        SELECT COALESCE(SUM(s.org_amount), 0)
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE e.status = 'ACTIVE'
        """, nativeQuery = true)
    BigDecimal sumOrgAmountAll();

    @Query(value = """
        SELECT s.organization_id AS orgId, SUM(s.gross_amount) AS total
        FROM learning_package_revenue_splits s
        JOIN learning_package_enrollments e
          ON e.id = s.enrollment_id
         AND e.organization_id = s.organization_id
        WHERE e.status = 'ACTIVE'
        GROUP BY s.organization_id
        ORDER BY total DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findTopOrgsByRevenue(@Param("limit") int limit);
}
