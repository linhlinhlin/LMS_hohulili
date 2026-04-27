package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.application.dto.AuditLogEntryDto;
import com.example.lms.shared.application.dto.AuditLogQuery;
import com.example.lms.shared.application.port.AuditLogQueryPort;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.infrastructure.persistence.entity.AuditLogJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Infrastructure adapter wiring {@link AuditLogQueryPort} to the existing JPA
 * repository. Resolves actor identities (email + full name) in a single batch
 * query per page so the controller does not issue N+1 lookups.
 */
@Component
@RequiredArgsConstructor
public class AuditLogQueryAdapter implements AuditLogQueryPort {

    private final AuditLogJpaRepository auditLogRepository;
    private final UserJpaRepository userRepository;

    @Override
    public Page<AuditLogEntryDto> search(AuditLogQuery query) {
        // Phase 8: pre-build lowercase LIKE pattern → JPQL/PostgreSQL bind String
        // explicit thay vì infer bytea từ CONCAT() (DB log "function lower(bytea)
        // does not exist" recurring error).
        Page<AuditLogJpaEntity> rawPage = auditLogRepository.search(
                query.tableName(),
                query.action(),
                query.from(),
                query.to(),
                toLikePattern(query.actorEmail()),
                toLikePattern(query.actorName()),
                PageRequest.of(query.page(), query.size())
        );

        Map<UUID, UserJpaEntity> actors = batchLoadActors(rawPage);
        return rawPage.map(entity -> toDto(entity, actors));
    }

    private static String toLikePattern(String value) {
        if (value == null || value.isBlank()) return null;
        return "%" + value.toLowerCase() + "%";
    }

    @Override
    public AuditLogEntryDto findById(Long id) {
        AuditLogJpaEntity entity = auditLogRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Nhật ký kiểm toán", id.toString()));
        Map<UUID, UserJpaEntity> actors = entity.getChangedBy() != null
                ? userRepository.findByIdIn(Set.of(entity.getChangedBy())).stream()
                        .collect(Collectors.toMap(UserJpaEntity::getId, u -> u))
                : Map.of();
        return toDto(entity, actors);
    }

    private Map<UUID, UserJpaEntity> batchLoadActors(Page<AuditLogJpaEntity> page) {
        Set<UUID> actorIds = page.getContent().stream()
                .map(AuditLogJpaEntity::getChangedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
        if (actorIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, UserJpaEntity> result = new HashMap<>(actorIds.size());
        for (UserJpaEntity user : userRepository.findByIdIn(actorIds)) {
            result.put(user.getId(), user);
        }
        return result;
    }

    private AuditLogEntryDto toDto(AuditLogJpaEntity entity, Map<UUID, UserJpaEntity> actors) {
        UserJpaEntity actor = entity.getChangedBy() != null ? actors.get(entity.getChangedBy()) : null;
        return new AuditLogEntryDto(
                entity.getId(),
                entity.getTableName(),
                entity.getRecordId(),
                entity.getAction(),
                entity.getOldData(),
                entity.getNewData(),
                entity.getChangedBy(),
                actor != null ? actor.getEmail() : null,
                actor != null ? actor.getFullName() : null,
                entity.getChangedAt()
        );
    }
}
