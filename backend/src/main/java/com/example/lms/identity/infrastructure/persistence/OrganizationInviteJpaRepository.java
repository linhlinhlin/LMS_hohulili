package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.infrastructure.persistence.entity.OrganizationInviteJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.OrganizationInviteJpaEntity.InviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationInviteJpaRepository extends JpaRepository<OrganizationInviteJpaEntity, UUID> {

    /**
     * Find active invite by code. Checks: ACTIVE status, not expired, under max uses.
     * Audit fix: maxUses filter in JPQL (prevents accepting exhausted invites).
     */
    @Query("""
        SELECT i FROM OrganizationInviteJpaEntity i
        WHERE i.code = :code
          AND i.status = 'ACTIVE'
          AND i.expiresAt > :now
          AND (i.maxUses IS NULL OR i.useCount < i.maxUses)
        """)
    Optional<OrganizationInviteJpaEntity> findActiveByCode(
            @Param("code") String code,
            @Param("now") Instant now);

    @Query("""
        SELECT i FROM OrganizationInviteJpaEntity i
        WHERE i.tokenHash = :tokenHash
          AND i.status = 'ACTIVE'
          AND i.expiresAt > :now
          AND (i.maxUses IS NULL OR i.useCount < i.maxUses)
        """)
    Optional<OrganizationInviteJpaEntity> findActiveByTokenHash(
            @Param("tokenHash") String tokenHash,
            @Param("now") Instant now);

    @Query("""
        SELECT i FROM OrganizationInviteJpaEntity i
        WHERE i.organizationId = :orgId
          AND i.email = :email
          AND i.status = 'ACTIVE'
          AND i.expiresAt > :now
        """)
    Optional<OrganizationInviteJpaEntity> findActiveByOrgAndEmail(
            @Param("orgId") UUID orgId,
            @Param("email") String email,
            @Param("now") Instant now);

    /**
     * List invites for org, most recent first. Capped at 500 in adapter.
     */
    List<OrganizationInviteJpaEntity> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    boolean existsByCode(String code);

    /**
     * Bulk expire invites past their expiry date.
     * Audit fix: InviteExpiryScheduler uses this.
     */
    @Modifying
    @Query("""
        UPDATE OrganizationInviteJpaEntity i
        SET i.status = 'EXPIRED'
          WHERE i.status = 'ACTIVE'
          AND i.expiresAt <= :now
        """)
    int markExpiredInvites(@Param("now") Instant now);

    /**
     * Count active (status=ACTIVE, not expired) invites across all
     * organizations. Powers `/admin/organizations/stats` KPI strip
     * (issue #200, F-ORG-1).
     */
    @Query("""
        SELECT COUNT(i) FROM OrganizationInviteJpaEntity i
        WHERE i.status = 'ACTIVE'
          AND i.expiresAt > :now
        """)
    long countActiveInvites(@Param("now") Instant now);
}
