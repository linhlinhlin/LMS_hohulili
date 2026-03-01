package com.example.lms.identity.domain.repository;

import com.example.lms.identity.domain.model.Organization;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Organization aggregate.
 * No JPA/infrastructure imports.
 */
public interface OrganizationRepository {

    Organization save(Organization organization);

    Optional<Organization> findById(UUID id);

    Optional<Organization> findByCode(String code);

    List<Organization> findAll();

    boolean existsByCode(String code);

    long count();
}
