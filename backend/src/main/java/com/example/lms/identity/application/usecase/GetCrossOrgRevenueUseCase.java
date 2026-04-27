package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.CrossOrgRevenueResponse;
import com.example.lms.identity.application.dto.CrossOrgRevenueResponse.TopOrgRevenue;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.domain.model.OrgRevenueAggregate;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Issue #260 (Phase 4 PR 4): aggregate cross-org revenue cho admin dashboard.
 * ADMIN-only — surface high-level metrics + top orgs ranking.
 *
 * Clean architecture: dùng cả 2 domain ports (RevenueSplitRepository +
 * OrganizationRepository), không phụ thuộc infrastructure.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GetCrossOrgRevenueUseCase {

    private static final int TOP_N = 5;

    private final RevenueSplitRepository revenueRepo;
    private final OrganizationRepository orgRepo;

    @Transactional(readOnly = true)
    public CrossOrgRevenueResponse execute() {
        BigDecimal totalGross = revenueRepo.sumGrossRevenueAll();
        BigDecimal totalPlatform = revenueRepo.sumPlatformAmountAll();
        BigDecimal totalTeacher = revenueRepo.sumTeacherAmountAll();
        BigDecimal totalOrg = revenueRepo.sumOrgAmountAll();

        List<OrgRevenueAggregate> topAggregates = revenueRepo.findTopOrgsByRevenue(TOP_N);
        List<TopOrgRevenue> topOrgs = topAggregates.stream()
                .map(this::resolveOrgMetadata)
                .filter(java.util.Objects::nonNull)
                .toList();

        return new CrossOrgRevenueResponse(
                totalGross, totalPlatform, totalTeacher, totalOrg, topOrgs);
    }

    /** Resolve org id → name/code/type. Trả null nếu org bị xóa (orphan
     *  revenue split) — filter out ở caller. */
    private TopOrgRevenue resolveOrgMetadata(OrgRevenueAggregate agg) {
        UUID orgId = agg.orgId();
        Organization org = orgRepo.findById(orgId).orElse(null);
        if (org == null) {
            log.warn("Cross-org revenue: org {} not found (orphan revenue split)", orgId);
            return null;
        }
        return new TopOrgRevenue(
                org.getId(), org.getName(), org.getCode(),
                org.getType(), org.isDefault(),
                agg.totalRevenue()
        );
    }
}
