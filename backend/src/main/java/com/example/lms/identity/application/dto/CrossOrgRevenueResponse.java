package com.example.lms.identity.application.dto;

import com.example.lms.identity.domain.model.OrganizationType;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Issue #260 (Phase 4 PR 4): cross-org revenue aggregate response cho admin
 * dashboard. Tổng hợp metrics all-time + top N orgs by revenue.
 */
public record CrossOrgRevenueResponse(
        BigDecimal totalGrossRevenue,
        BigDecimal totalPlatformFees,
        BigDecimal totalTeacherPayouts,
        BigDecimal totalOrgPayouts,
        List<TopOrgRevenue> topOrgs
) {
    public record TopOrgRevenue(
            UUID orgId,
            String name,
            String code,
            OrganizationType type,
            boolean isDefault,
            BigDecimal totalRevenue
    ) {}
}
