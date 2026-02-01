package com.example.lms.course_authoring.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Category aggregate.
 */
public interface CategoryRepositoryPort {

    UUID save(String code, String name);

    Optional<Object> findById(UUID id);

    Optional<Object> findByCode(String code);

    List<Object> findAll();

    boolean existsByCode(String code);

    void deleteById(UUID id);
}
