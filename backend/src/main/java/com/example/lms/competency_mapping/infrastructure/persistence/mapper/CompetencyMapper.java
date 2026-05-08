package com.example.lms.competency_mapping.infrastructure.persistence.mapper;

import com.example.lms.competency_mapping.domain.model.LessonCompetencyMapping;
import com.example.lms.competency_mapping.domain.model.MaritimeStandard;
import com.example.lms.competency_mapping.domain.model.StandardCompetency;
import com.example.lms.competency_mapping.infrastructure.persistence.entity.LessonCompetencyMappingJpaEntity;
import com.example.lms.competency_mapping.infrastructure.persistence.entity.MaritimeStandardJpaEntity;
import com.example.lms.competency_mapping.infrastructure.persistence.entity.StandardCompetencyJpaEntity;
import org.springframework.stereotype.Component;

@Component
public class CompetencyMapper {

    public MaritimeStandard toDomain(MaritimeStandardJpaEntity e) {
        return MaritimeStandard.reconstitute(
                e.getId(), e.getCode(), e.getName(), e.getDescription(),
                e.isActive(), e.getCreatedAt(), e.getUpdatedAt()
        );
    }

    public StandardCompetency toDomain(StandardCompetencyJpaEntity e) {
        return StandardCompetency.reconstitute(
                e.getId(), e.getStandardId(), e.getCode(), e.getTitle(),
                e.getDescription(), e.getCategory(), e.getDisplayOrder(),
                e.isActive(), e.getCreatedAt(), e.getUpdatedAt()
        );
    }

    public LessonCompetencyMapping toDomain(LessonCompetencyMappingJpaEntity e) {
        return LessonCompetencyMapping.reconstitute(
                e.getId(), e.getLessonId(), e.getCompetencyId(),
                e.getMappedBy(), e.getMappedAt(), e.getNote()
        );
    }

    public LessonCompetencyMappingJpaEntity toEntity(LessonCompetencyMapping m) {
        var e = new LessonCompetencyMappingJpaEntity();
        e.setId(m.getId());
        e.setLessonId(m.getLessonId());
        e.setCompetencyId(m.getCompetencyId());
        e.setMappedBy(m.getMappedBy());
        e.setMappedAt(m.getMappedAt());
        e.setNote(m.getNote());
        return e;
    }
}
