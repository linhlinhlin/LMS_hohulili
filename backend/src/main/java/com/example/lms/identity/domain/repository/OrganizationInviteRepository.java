package com.example.lms.identity.domain.repository;

import com.example.lms.identity.domain.model.OrganizationInvite;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for OrganizationInvite aggregate.
 * No JPA/infrastructure imports.
 */
public interface OrganizationInviteRepository {

    OrganizationInvite save(OrganizationInvite invite);

    Optional<OrganizationInvite> findById(UUID id);

    /**
     * Find active invite by code (not expired, not revoked, under max uses).
     */
    Optional<OrganizationInvite> findActiveByCode(String code);

    /**
     * Find active invite by token hash.
     */
    Optional<OrganizationInvite> findActiveByTokenHash(String tokenHash);

    /**
     * Find active email invite for a specific org+email (for duplicate check).
     */
    Optional<OrganizationInvite> findActiveByOrgAndEmail(UUID organizationId, String email);

    /**
     * List invites for an organization (capped at 500).
     */
    List<OrganizationInvite> findByOrganizationId(UUID organizationId);

    /**
     * Check if invite code already exists.
     */
    boolean existsByCode(String code);

    /**
     * Bulk expire active invites past their expiry date. Returns count.
     */
    int markExpiredInvites();
}
