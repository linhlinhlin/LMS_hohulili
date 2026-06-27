package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.CrossOrgRevenueResponse;
import com.example.lms.identity.application.dto.CrossOrgRevenueResponse.TopOrgRevenue;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.application.port.LearningPackageRevenuePort;
import com.example.lms.shared.domain.model.OrgRevenueAggregate;
import com.example.lms.shared.domain.repository.RevenueSplitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

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
    private final LearningPackageRevenuePort learningPackageRevenuePort;
    private final OrganizationRepository orgRepo;

    @Transactional(readOnly = true)
    public CrossOrgRevenueResponse execute() {
        BigDecimal totalGross = sum(revenueRepo.sumGrossRevenueAll(), learningPackageRevenuePort.sumGrossRevenueAll());
        BigDecimal totalPlatform = sum(revenueRepo.sumPlatformAmountAll(), learningPackageRevenuePort.sumPlatformAmountAll());
        BigDecimal totalTeacher = sum(revenueRepo.sumTeacherAmountAll(), learningPackageRevenuePort.sumTeacherAmountAll());
        BigDecimal totalOrg = sum(revenueRepo.sumOrgAmountAll(), learningPackageRevenuePort.sumOrgAmountAll());

        List<OrgRevenueAggregate> topAggregates = mergeTopAggregates(
                revenueRepo.findTopOrgsByRevenue(TOP_N),
                learningPackageRevenuePort.findTopOrgsByRevenue(TOP_N));
        List<TopOrgRevenue> topOrgs = topAggregates.stream()
                .map(this::resolveOrgMetadata)
                .filter(java.util.Objects::nonNull)
                .toList();

        return new CrossOrgRevenueResponse(
                totalGross, totalPlatform, totalTeacher, totalOrg, topOrgs);
    }

    private List<OrgRevenueAggregate> mergeTopAggregates(List<OrgRevenueAggregate> courseRevenue,
                                                         List<OrgRevenueAggregate> packageRevenue) {
        Map<UUID, BigDecimal> totals = new HashMap<>();
        Stream.concat(courseRevenue.stream(), packageRevenue.stream())
                .filter(agg -> agg.orgId() != null)
                .forEach(agg -> totals.merge(agg.orgId(), zeroIfNull(agg.totalRevenue()), BigDecimal::add));

        return totals.entrySet().stream()
                .map(entry -> new OrgRevenueAggregate(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(OrgRevenueAggregate::totalRevenue).reversed())
                .limit(TOP_N)
                .toList();
    }

    private BigDecimal sum(BigDecimal courseRevenue, BigDecimal packageRevenue) {
        return zeroIfNull(courseRevenue).add(zeroIfNull(packageRevenue));
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
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
