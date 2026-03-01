package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.domain.model.OrganizationInvite;
import com.example.lms.identity.domain.repository.OrganizationInviteRepository;
import com.example.lms.identity.infrastructure.persistence.mapper.OrganizationInviteEntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OrganizationInviteRepositoryAdapter implements OrganizationInviteRepository {

    private static final int MAX_LIST_SIZE = 500; // Audit fix: cap list results

    private final OrganizationInviteJpaRepository jpaRepo;
    private final OrganizationInviteEntityMapper mapper;

    @Override
    public OrganizationInvite save(OrganizationInvite invite) {
        var entity = mapper.toEntity(invite);
        var saved = jpaRepo.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<OrganizationInvite> findById(UUID id) {
        return jpaRepo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<OrganizationInvite> findActiveByCode(String code) {
        return jpaRepo.findActiveByCode(code, Instant.now()).map(mapper::toDomain);
    }

    @Override
    public Optional<OrganizationInvite> findActiveByTokenHash(String tokenHash) {
        return jpaRepo.findActiveByTokenHash(tokenHash, Instant.now()).map(mapper::toDomain);
    }

    @Override
    public Optional<OrganizationInvite> findActiveByOrgAndEmail(UUID organizationId, String email) {
        return jpaRepo.findActiveByOrgAndEmail(organizationId, email, Instant.now())
                .map(mapper::toDomain);
    }

    @Override
    public List<OrganizationInvite> findByOrganizationId(UUID organizationId) {
        var entities = jpaRepo.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
        return entities.stream()
                .limit(MAX_LIST_SIZE)
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public boolean existsByCode(String code) {
        return jpaRepo.existsByCode(code);
    }

    @Override
    @Transactional
    public int markExpiredInvites() {
        return jpaRepo.markExpiredInvites(Instant.now());
    }
}
