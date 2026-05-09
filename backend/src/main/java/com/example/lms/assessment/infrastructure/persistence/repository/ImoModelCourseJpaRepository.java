package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.ImoModelCourseJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ImoModelCourseJpaRepository extends JpaRepository<ImoModelCourseJpaEntity, Integer> {
    List<ImoModelCourseJpaEntity> findByActiveTrueOrderByCategoryAscDisplayOrderAsc();
}
