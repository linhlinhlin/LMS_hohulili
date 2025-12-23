package com.example.lms.repository;

import com.example.lms.entity.TeacherPayout;
import com.example.lms.entity.TeacherPayout.PayoutStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Repository for TeacherPayout entity
 */
@Repository
public interface TeacherPayoutRepository extends JpaRepository<TeacherPayout, UUID> {

    /**
     * Find payouts by teacher (most recent first)
     */
    List<TeacherPayout> findByTeacherIdOrderByRequestedAtDesc(UUID teacherId);

    /**
     * Find payouts by teacher with pagination
     */
    Page<TeacherPayout> findByTeacherIdOrderByRequestedAtDesc(UUID teacherId, Pageable pageable);

    /**
     * Find payouts by status
     */
    List<TeacherPayout> findByStatus(PayoutStatus status);

    /**
     * Find payouts by status with pagination (for admin queue)
     */
    Page<TeacherPayout> findByStatusOrderByRequestedAtAsc(PayoutStatus status, Pageable pageable);

    /**
     * Find pending payouts (oldest first - FIFO queue)
     */
    List<TeacherPayout> findByStatusOrderByRequestedAtAsc(PayoutStatus status);

    /**
     * Count payouts by status
     */
    long countByStatus(PayoutStatus status);

    /**
     * Sum total payouts by teacher and status
     */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM TeacherPayout p " +
           "WHERE p.teacher.id = :teacherId AND p.status = :status")
    BigDecimal sumAmountByTeacherIdAndStatus(
            @Param("teacherId") UUID teacherId,
            @Param("status") PayoutStatus status);

    /**
     * Sum total completed payouts by teacher (all time)
     */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM TeacherPayout p " +
           "WHERE p.teacher.id = :teacherId AND p.status = 'COMPLETED'")
    BigDecimal sumCompletedPayoutsByTeacherId(@Param("teacherId") UUID teacherId);

    /**
     * Sum total completed payouts (platform-wide)
     */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM TeacherPayout p " +
           "WHERE p.status = 'COMPLETED'")
    BigDecimal sumTotalCompletedPayouts();

    /**
     * Check if teacher has any pending payout request
     */
    boolean existsByTeacherIdAndStatus(UUID teacherId, PayoutStatus status);

    /**
     * Shortcut: Get pending payouts for admin
     */
    default List<TeacherPayout> getPendingPayouts() {
        return findByStatusOrderByRequestedAtAsc(PayoutStatus.REQUESTED);
    }

    /**
     * Shortcut: Count pending payouts
     */
    default long countPendingPayouts() {
        return countByStatus(PayoutStatus.REQUESTED);
    }

    /**
     * Shortcut: Check if teacher has pending request
     */
    default boolean hasPendingRequest(UUID teacherId) {
        return existsByTeacherIdAndStatus(teacherId, PayoutStatus.REQUESTED);
    }
}
