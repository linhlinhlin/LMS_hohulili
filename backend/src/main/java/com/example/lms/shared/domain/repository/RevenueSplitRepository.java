package com.example.lms.shared.domain.repository;

import com.example.lms.shared.domain.model.OrgRevenueAggregate;
import com.example.lms.shared.domain.model.RevenueSplit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RevenueSplitRepository {
    RevenueSplit save(RevenueSplit split);
    Optional<RevenueSplit> findByPaymentId(UUID paymentId);
    Page<RevenueSplit> findByTeacherId(UUID teacherId, Pageable pageable);

    BigDecimal sumTeacherAmountByTeacherId(UUID teacherId);
    BigDecimal sumTeacherAmountThisMonth(UUID teacherId);
    BigDecimal sumTeacherAmountLastMonth(UUID teacherId);
    List<UUID> findDistinctCourseIdsByTeacherId(UUID teacherId);

    // ==================== Issue #260 (Phase 4 PR 4): cross-org aggregates ====================

    /** Tổng doanh thu gross all-time (mọi payment đã complete). */
    BigDecimal sumGrossRevenueAll();
    /** Tổng phí nền tảng all-time. */
    BigDecimal sumPlatformAmountAll();
    /** Tổng teacher payouts all-time. */
    BigDecimal sumTeacherAmountAll();
    /** Tổng org payouts all-time. */
    BigDecimal sumOrgAmountAll();
    /** Top N orgs theo gross revenue (skip null org_id). */
    List<OrgRevenueAggregate> findTopOrgsByRevenue(int limit);
}
