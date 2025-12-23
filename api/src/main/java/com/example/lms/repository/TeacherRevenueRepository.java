package com.example.lms.repository;

import com.example.lms.entity.TeacherRevenue;
import com.example.lms.entity.TeacherRevenue.RevenueStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for TeacherRevenue entity
 */
@Repository
public interface TeacherRevenueRepository extends JpaRepository<TeacherRevenue, UUID> {

    /**
     * Find revenue by payment ID
     */
    Optional<TeacherRevenue> findByPaymentId(UUID paymentId);

    /**
     * Find all revenues for a teacher
     */
    List<TeacherRevenue> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);

    /**
     * Find revenues by teacher with pagination
     */
    Page<TeacherRevenue> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId, Pageable pageable);

    /**
     * Find revenues by teacher and status
     */
    List<TeacherRevenue> findByTeacherIdAndStatus(UUID teacherId, RevenueStatus status);

    /**
     * Count revenues by teacher and status
     */
    long countByTeacherIdAndStatus(UUID teacherId, RevenueStatus status);

    /**
     * Sum net amount by teacher and status (for available balance)
     */
    @Query("SELECT COALESCE(SUM(r.netAmount), 0) FROM TeacherRevenue r " +
           "WHERE r.teacher.id = :teacherId AND r.status = :status")
    BigDecimal sumNetAmountByTeacherIdAndStatus(
            @Param("teacherId") UUID teacherId, 
            @Param("status") RevenueStatus status);

    /**
     * Sum total net amount by teacher (all time earnings)
     */
    @Query("SELECT COALESCE(SUM(r.netAmount), 0) FROM TeacherRevenue r " +
           "WHERE r.teacher.id = :teacherId")
    BigDecimal sumNetAmountByTeacherId(@Param("teacherId") UUID teacherId);

    /**
     * Sum total gross amount by teacher (total sales)
     */
    @Query("SELECT COALESCE(SUM(r.grossAmount), 0) FROM TeacherRevenue r " +
           "WHERE r.teacher.id = :teacherId")
    BigDecimal sumGrossAmountByTeacherId(@Param("teacherId") UUID teacherId);

    /**
     * Find revenues that are past hold period and should become available
     */
    @Query("SELECT r FROM TeacherRevenue r WHERE r.status = 'PENDING' AND r.availableAt <= :now")
    List<TeacherRevenue> findPendingRevenuesReadyForAvailability(@Param("now") Instant now);

    /**
     * Count revenues by status (for admin dashboard)
     */
    long countByStatus(RevenueStatus status);

    /**
     * Total platform fees (for admin dashboard)
     */
    @Query("SELECT COALESCE(SUM(r.platformFee), 0) FROM TeacherRevenue r")
    BigDecimal sumTotalPlatformFees();

    /**
     * Shortcut: Get available balance for a teacher
     */
    default BigDecimal getAvailableBalance(UUID teacherId) {
        return sumNetAmountByTeacherIdAndStatus(teacherId, RevenueStatus.AVAILABLE);
    }

    /**
     * Shortcut: Get pending balance for a teacher
     */
    default BigDecimal getPendingBalance(UUID teacherId) {
        return sumNetAmountByTeacherIdAndStatus(teacherId, RevenueStatus.PENDING);
    }

    /**
     * Shortcut: Get total earnings for a teacher
     */
    default BigDecimal getTotalEarnings(UUID teacherId) {
        return sumNetAmountByTeacherId(teacherId);
    }
}
