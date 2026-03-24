package com.example.lms.communication.infrastructure.persistence;

import com.example.lms.communication.application.port.MessageRecipientDirectoryPort;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class MessageRecipientDirectoryAdapter implements MessageRecipientDirectoryPort {

    private final UserJpaRepository userJpaRepository;

    @Override
    public Optional<RecipientDirectoryEntry> findActiveById(UUID userId) {
        return userJpaRepository.findById(userId)
                .filter(UserJpaEntity::isEnabled)
                .map(this::toEntry);
    }

    @Override
    public List<RecipientDirectoryEntry> findActiveByIds(Collection<UUID> userIds, String query, int limit) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        return userJpaRepository.findAllById(userIds).stream()
                .filter(UserJpaEntity::isEnabled)
                .filter(user -> matchesQuery(user, query))
                .sorted(Comparator.comparing(UserJpaEntity::getFullName, String.CASE_INSENSITIVE_ORDER))
                .limit(limit)
                .map(this::toEntry)
                .toList();
    }

    @Override
    public List<RecipientDirectoryEntry> findActiveByOrganizationAndRoles(UUID organizationId, Set<Role> roles, String query, int limit) {
        if (organizationId == null || roles == null || roles.isEmpty()) {
            return List.of();
        }
        Pageable pageable = PageRequest.of(0, Math.max(limit, 20), Sort.by(Sort.Direction.ASC, "fullName"));
        Map<UUID, RecipientDirectoryEntry> deduped = new LinkedHashMap<>();

        for (Role role : roles) {
            List<UserJpaEntity> users = (query == null || query.isBlank())
                    ? userJpaRepository.findByOrganizationIdAndRole(organizationId, toJpaRole(role), pageable).getContent()
                    : userJpaRepository.searchByOrganizationIdAndRoleAndKeyword(organizationId, toJpaRole(role), query.trim(), pageable).getContent();

            users.stream()
                    .filter(UserJpaEntity::isEnabled)
                    .forEach(user -> deduped.putIfAbsent(user.getId(), toEntry(user)));
        }

        return deduped.values().stream()
                .sorted(Comparator.comparing(RecipientDirectoryEntry::displayName, String.CASE_INSENSITIVE_ORDER))
                .limit(limit)
                .toList();
    }

    @Override
    public List<RecipientDirectoryEntry> findActiveByRoles(Set<Role> roles, String query, int limit) {
        if (roles == null || roles.isEmpty()) {
            return List.of();
        }
        Pageable pageable = PageRequest.of(0, Math.max(limit, 20), Sort.by(Sort.Direction.ASC, "fullName"));
        Map<UUID, RecipientDirectoryEntry> deduped = new LinkedHashMap<>();

        for (Role role : roles) {
            List<UserJpaEntity> users = (query == null || query.isBlank())
                    ? userJpaRepository.findByRole(toJpaRole(role), pageable).getContent()
                    : userJpaRepository.searchUsersByRole(toJpaRole(role), query.trim(), pageable).getContent();

            users.stream()
                    .filter(UserJpaEntity::isEnabled)
                    .forEach(user -> deduped.putIfAbsent(user.getId(), toEntry(user)));
        }

        return deduped.values().stream()
                .sorted(Comparator.comparing(RecipientDirectoryEntry::displayName, String.CASE_INSENSITIVE_ORDER))
                .limit(limit)
                .toList();
    }

    @Override
    public List<RecipientDirectoryEntry> findAllActive(String query, int limit) {
        Pageable pageable = PageRequest.of(0, Math.max(limit * 2, 50), Sort.by(Sort.Direction.ASC, "fullName"));
        List<UserJpaEntity> users = (query == null || query.isBlank())
                ? userJpaRepository.findAll(pageable).getContent()
                : userJpaRepository.searchUsersByKeyword(query.trim(), pageable).getContent();

        return users.stream()
                .filter(UserJpaEntity::isEnabled)
                .sorted(Comparator.comparing(UserJpaEntity::getFullName, String.CASE_INSENSITIVE_ORDER))
                .limit(limit)
                .map(this::toEntry)
                .toList();
    }

    private boolean matchesQuery(UserJpaEntity user, String query) {
        if (query == null || query.isBlank()) {
            return true;
        }
        String normalized = query.trim().toLowerCase(Locale.ROOT);
        return containsIgnoreCase(user.getFullName(), normalized)
                || containsIgnoreCase(user.getEmail(), normalized)
                || containsIgnoreCase(user.getDisplayName(), normalized);
    }

    private boolean containsIgnoreCase(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }

    private RecipientDirectoryEntry toEntry(UserJpaEntity user) {
        return new RecipientDirectoryEntry(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                Role.valueOf(user.getRole().name()),
                user.getOrganizationId()
        );
    }

    private UserJpaEntity.UserRole toJpaRole(Role role) {
        return UserJpaEntity.UserRole.valueOf(role.name());
    }
}
