package com.example.lms.shared.infrastructure.persistence.repository;

import com.example.lms.shared.infrastructure.persistence.entity.RevenueSplitJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RevenueSplitJpaRepository
        extends JpaRepository<RevenueSplitJpaEntity, UUID> {

    Optional<RevenueSplitJpaEntity> findByPaymentId(UUID paymentId);

    Page<RevenueSplitJpaEntity> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(r.teacherAmount), 0) FROM RevenueSplitJpaEntity r WHERE r.teacherId = :teacherId")
    BigDecimal sumTeacherAmountByTeacherId(@Param("teacherId") UUID teacherId);

    @Query("""
        SELECT COALESCE(SUM(r.teacherAmount), 0) FROM RevenueSplitJpaEntity r
        WHERE r.teacherId = :teacherId
          AND EXTRACT(YEAR  FROM r.createdAt) = EXTRACT(YEAR  FROM CURRENT_TIMESTAMP)
          AND EXTRACT(MONTH FROM r.createdAt) = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)
        """)
    BigDecimal sumTeacherAmountThisMonth(@Param("teacherId") UUID teacherId);

    @Query(value = """
        SELECT COALESCE(SUM(r.teacher_amount), 0) FROM revenue_splits r
        WHERE r.teacher_id = :teacherId
          AND r.created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP - INTERVAL '1 month')
          AND r.created_at <  DATE_TRUNC('month', CURRENT_TIMESTAMP)
        """, nativeQuery = true)
    BigDecimal sumTeacherAmountLastMonth(@Param("teacherId") UUID teacherId);

    @Query("SELECT COUNT(DISTINCT r.courseId) FROM RevenueSplitJpaEntity r WHERE r.teacherId = :teacherId")
    long countDistinctCoursesByTeacherId(@Param("teacherId") UUID teacherId);
}
