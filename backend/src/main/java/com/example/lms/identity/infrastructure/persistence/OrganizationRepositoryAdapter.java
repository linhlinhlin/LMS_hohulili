package com.example.lms.identity.infrastructure.persistence;

import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.identity.infrastructure.persistence.mapper.OrganizationEntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OrganizationRepositoryAdapter implements OrganizationRepository {

    private final OrganizationJpaRepository jpaRepo;
    private final OrganizationEntityMapper mapper;

    @Override
    public Organization save(Organization organization) {
        var entity = mapper.toEntity(organization);
        var saved = jpaRepo.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Organization> findById(UUID id) {
        return jpaRepo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Organization> findByCode(String code) {
        return jpaRepo.findByCode(code).map(mapper::toDomain);
    }

    @Override
    public List<Organization> findAll() {
        return jpaRepo.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public boolean existsByCode(String code) {
        return jpaRepo.existsByCode(code);
    }

    @Override
    public long count() {
        return jpaRepo.count();
    }

    @Override
    public Optional<Organization> findDefault() {
        return jpaRepo.findByIsDefaultTrue().map(mapper::toDomain);
    }
}
