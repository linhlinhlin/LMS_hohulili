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

    /**
     * Issue #231 (Phase 1): tìm tổ chức nền tảng mặc định (PLATFORM type
     * + is_default=true). Chỉ có 1 row trong DB (partial unique index).
     * Là home org cho system ADMIN + người dùng đăng ký cá nhân.
     */
    Optional<Organization> findDefault();
}
