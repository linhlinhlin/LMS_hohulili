package com.example.lms.shared.application.port;

import com.example.lms.shared.domain.model.OrgRevenueAggregate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface LearningPackageRevenuePort {
    record TeacherRevenueLine(
            UUID id,
            UUID enrollmentId,
            UUID packageId,
            UUID courseId,
            BigDecimal grossAmount,
            BigDecimal platformFeePct,
            BigDecimal teacherSharePct,
            BigDecimal platformAmount,
            BigDecimal teacherAmount,
            Instant createdAt
    ) {}

    BigDecimal sumTeacherAmountByTeacherId(UUID teacherId);
    BigDecimal sumTeacherAmountThisMonth(UUID teacherId);
    BigDecimal sumTeacherAmountLastMonth(UUID teacherId);
    List<UUID> findDistinctCourseIdsByTeacherId(UUID teacherId);
    Page<TeacherRevenueLine> findTeacherRevenueLines(UUID teacherId, Pageable pageable);
    BigDecimal sumGrossRevenueAll();
    BigDecimal sumPlatformAmountAll();
    BigDecimal sumTeacherAmountAll();
    BigDecimal sumOrgAmountAll();
    List<OrgRevenueAggregate> findTopOrgsByRevenue(int limit);
}
