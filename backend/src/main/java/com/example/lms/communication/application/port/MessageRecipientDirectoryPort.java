package com.example.lms.communication.application.port;

import com.example.lms.identity.domain.model.Role;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Query-oriented port for recipient directory lookups.
 *
 * This is intentionally separate from UserRepository because recipient discovery
 * is a read model concern with scoped filtering, ranking, and search.
 */
public interface MessageRecipientDirectoryPort {

    Optional<RecipientDirectoryEntry> findActiveById(UUID userId);

    List<RecipientDirectoryEntry> findActiveByIds(Collection<UUID> userIds, String query, int limit);

    List<RecipientDirectoryEntry> findActiveByOrganizationAndRoles(UUID organizationId, Set<Role> roles, String query, int limit);

    List<RecipientDirectoryEntry> findActiveByRoles(Set<Role> roles, String query, int limit);

    List<RecipientDirectoryEntry> findAllActive(String query, int limit);

    record RecipientDirectoryEntry(
            UUID userId,
            String displayName,
            String email,
            Role role,
            UUID organizationId
    ) {}
}
