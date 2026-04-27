package com.example.lms.shared.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Issue #260 (Phase 4 PR 4): aggregate row trả về từ findTopOrgsByRevenue.
 * Pure domain value object — không phụ thuộc Organization để tránh coupling
 * giữa shared (revenue) và identity (org). Use case resolve org metadata
 * sau bằng OrganizationRepository.
 */
public record OrgRevenueAggregate(UUID orgId, BigDecimal totalRevenue) {}
