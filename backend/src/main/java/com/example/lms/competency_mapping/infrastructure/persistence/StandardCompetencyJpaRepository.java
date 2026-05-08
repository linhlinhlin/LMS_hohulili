package com.example.lms.competency_mapping.infrastructure.persistence;

import com.example.lms.competency_mapping.infrastructure.persistence.entity.StandardCompetencyJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StandardCompetencyJpaRepository extends JpaRepository<StandardCompetencyJpaEntity, UUID> {

    List<StandardCompetencyJpaEntity> findByStandardIdAndActiveTrueOrderByDisplayOrderAsc(UUID standardId);

    List<StandardCompetencyJpaEntity> findByStandardIdAndCategoryAndActiveTrueOrderByDisplayOrderAsc(
            UUID standardId, String category);

    @Query("SELECT c FROM StandardCompetencyJpaEntity c WHERE c.id IN :ids AND c.active = true")
    List<StandardCompetencyJpaEntity> findActiveByIds(@Param("ids") List<UUID> ids);

    List<StandardCompetencyJpaEntity> findByActiveTrueOrderByDisplayOrderAsc();

    @Query("SELECT COUNT(c) FROM StandardCompetencyJpaEntity c WHERE c.standardId = :standardId AND c.active = true")
    int countActiveByStandardId(@Param("standardId") UUID standardId);
}
