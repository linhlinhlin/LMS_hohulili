package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.ImoModelCourse;
import com.example.lms.assessment.domain.repository.ImoModelCourseRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.ImoModelCourseJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ImoModelCourseRepositoryAdapter implements ImoModelCourseRepository {

    private final ImoModelCourseJpaRepository jpaRepository;

    @Override
    public List<ImoModelCourse> findAllActive() {
        return jpaRepository.findByActiveTrueOrderByCategoryAscDisplayOrderAsc()
                .stream()
                .map(e -> new ImoModelCourse(e.getId(), e.getCode(), e.getTitle(), e.getCategory(), e.getDisplayOrder(), e.isActive()))
                .toList();
    }
}
