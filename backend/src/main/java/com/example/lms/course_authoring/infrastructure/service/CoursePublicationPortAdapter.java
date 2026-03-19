package com.example.lms.course_authoring.infrastructure.service;

import com.example.lms.course_authoring.application.port.CoursePublicationPort;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CoursePublicationJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CoursePublicationPortAdapter implements CoursePublicationPort {

    private final CoursePublicationService coursePublicationService;
    private final CoursePublicationJpaRepository publicationRepository;

    @Override
    @Transactional
    public void publish(UUID courseId, UUID publishedById) {
        coursePublicationService.publish(courseId, publishedById);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> findLatestPublicationId(UUID courseId) {
        return publicationRepository.findTopByCourseIdOrderByPublicationNumberDesc(courseId)
                .map(publication -> publication.getId());
    }
}
