package com.example.lms.shared.application.port;

import com.example.lms.shared.domain.model.OrgRevenueAggregate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface LearningPackageRevenuePort {
    BigDecimal sumTeacherAmountByTeacherId(UUID teacherId);
    BigDecimal sumTeacherAmountThisMonth(UUID teacherId);
    BigDecimal sumTeacherAmountLastMonth(UUID teacherId);
    List<UUID> findDistinctCourseIdsByTeacherId(UUID teacherId);
    BigDecimal sumGrossRevenueAll();
    BigDecimal sumPlatformAmountAll();
    BigDecimal sumTeacherAmountAll();
    BigDecimal sumOrgAmountAll();
    List<OrgRevenueAggregate> findTopOrgsByRevenue(int limit);
}
