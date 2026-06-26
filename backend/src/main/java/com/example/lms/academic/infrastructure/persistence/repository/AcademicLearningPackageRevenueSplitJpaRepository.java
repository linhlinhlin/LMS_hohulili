package com.example.lms.academic.infrastructure.persistence.repository;

import com.example.lms.academic.infrastructure.persistence.entity.AcademicLearningPackageRevenueSplitJpaEntity;
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

    @Query("""
        SELECT COALESCE(SUM(s.teacherAmount), 0) FROM AcademicLearningPackageRevenueSplitJpaEntity s
        WHERE s.teacherId = :teacherId
        """)
    BigDecimal sumTeacherAmountByTeacherId(@Param("teacherId") UUID teacherId);

    @Query("""
        SELECT COALESCE(SUM(s.teacherAmount), 0) FROM AcademicLearningPackageRevenueSplitJpaEntity s
        WHERE s.teacherId = :teacherId
          AND EXTRACT(YEAR FROM s.createdAt) = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)
          AND EXTRACT(MONTH FROM s.createdAt) = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)
        """)
    BigDecimal sumTeacherAmountThisMonth(@Param("teacherId") UUID teacherId);

    @Query(value = """
        SELECT COALESCE(SUM(s.teacher_amount), 0) FROM learning_package_revenue_splits s
        WHERE s.teacher_id = :teacherId
          AND s.created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP - INTERVAL '1 month')
          AND s.created_at <  DATE_TRUNC('month', CURRENT_TIMESTAMP)
        """, nativeQuery = true)
    BigDecimal sumTeacherAmountLastMonth(@Param("teacherId") UUID teacherId);

    @Query("SELECT COALESCE(SUM(s.grossAmount), 0) FROM AcademicLearningPackageRevenueSplitJpaEntity s")
    BigDecimal sumGrossRevenueAll();

    @Query("SELECT COALESCE(SUM(s.platformAmount), 0) FROM AcademicLearningPackageRevenueSplitJpaEntity s")
    BigDecimal sumPlatformAmountAll();

    @Query("SELECT COALESCE(SUM(s.teacherAmount), 0) FROM AcademicLearningPackageRevenueSplitJpaEntity s")
    BigDecimal sumTeacherAmountAll();

    @Query("SELECT COALESCE(SUM(s.orgAmount), 0) FROM AcademicLearningPackageRevenueSplitJpaEntity s")
    BigDecimal sumOrgAmountAll();

    @Query(value = """
        SELECT s.organization_id AS orgId, SUM(s.gross_amount) AS total
        FROM learning_package_revenue_splits s
        GROUP BY s.organization_id
        ORDER BY total DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findTopOrgsByRevenue(@Param("limit") int limit);
}
