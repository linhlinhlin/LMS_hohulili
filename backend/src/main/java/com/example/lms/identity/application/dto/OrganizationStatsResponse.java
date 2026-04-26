package com.example.lms.identity.application.dto;

/**
 * Aggregate stats over all organizations — powers the KPI strip on
 * `/admin/organizations` (issue #200, F-ORG-1).
 *
 * <ul>
 *   <li>{@code totalOrgs} — count of all organizations.</li>
 *   <li>{@code activeOrgs} — count where {@code enabled = true}.</li>
 *   <li>{@code totalMembers} — count of users with non-null
 *       {@code organization_id} (members across all orgs).</li>
 *   <li>{@code activeInvites} — count of {@code organization_invites} in
 *       {@code ACTIVE} status whose {@code expires_at} is still in the
 *       future. Mirrors the {@code findActiveBy*} predicate used elsewhere.</li>
 * </ul>
 *
 * <p>ADMIN role only — ORG_ADMIN does not see this aggregate (their list is
 * scoped to their own org).
 */
public record OrganizationStatsResponse(
        long totalOrgs,
        long activeOrgs,
        long totalMembers,
        long activeInvites
) {}
