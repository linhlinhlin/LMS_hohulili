package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CoursePublicationJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CoursePublicationJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Returns the publication timeline for a course with adoption metrics.
 * Pattern reference: Coursera Studio "Publication History", edX Studio version selector.
 *
 * The DTO surfaces both pinned counts (classes explicitly tied to a snapshot) and
 * effective counts (pinned + auto-followers on the latest snapshot) so the UI can
 * show "X lớp ghim, +Y lớp theo bản mới" without a second round-trip.
 *
 * Naming convention: prefixed Get* per CleanArchitectureTest CQRS read-side
 * exemption — query handlers may access JPA directly for performance.
 */
@Service
@RequiredArgsConstructor
public class GetCoursePublicationsUseCase {

    private final CoursePublicationJpaRepository publicationRepository;
    private final JpaLearningClassRepository classRepository;
    private final UserJpaRepository userRepository;

    @Transactional(readOnly = true)
    public List<PublicationView> execute(UUID courseId) {
        var publications = publicationRepository.findByCourseIdOrderByPublicationNumberDesc(courseId);
        if (publications.isEmpty()) {
            return List.of();
        }

        var classes = classRepository.findByCourseId(courseId);
        var pinCountByPublicationId = new java.util.HashMap<UUID, Integer>();
        int unpinned = 0;
        for (var cls : classes) {
            if (cls.getCourseVersionId() != null) {
                pinCountByPublicationId.merge(cls.getCourseVersionId(), 1, Integer::sum);
            } else {
                unpinned++;
            }
        }
        final int unpinnedClassCount = unpinned;

        Map<UUID, String> publisherNames = resolvePublisherNames(publications);
        UUID latestId = publications.get(0).getId();

        return publications.stream()
                .map(pub -> toView(pub, latestId, pinCountByPublicationId, unpinnedClassCount, publisherNames))
                .toList();
    }

    private Map<UUID, String> resolvePublisherNames(List<CoursePublicationJpaEntity> publications) {
        var publisherIds = publications.stream()
                .map(CoursePublicationJpaEntity::getPublishedById)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        if (publisherIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(publisherIds).stream()
                .collect(Collectors.toMap(UserJpaEntity::getId, UserJpaEntity::getFullName));
    }

    private PublicationView toView(
            CoursePublicationJpaEntity pub,
            UUID latestId,
            Map<UUID, Integer> pinCountByPublicationId,
            int unpinnedClassCount,
            Map<UUID, String> publisherNames) {
        boolean isLatest = pub.getId().equals(latestId);
        int pinnedCount = pinCountByPublicationId.getOrDefault(pub.getId(), 0);
        // Latest publication also serves classes with no explicit pin (auto-follow fallback).
        int effectiveCount = isLatest ? pinnedCount + unpinnedClassCount : pinnedCount;
        return new PublicationView(
                pub.getId(),
                pub.getPublicationNumber(),
                pub.getContentVersion(),
                pub.getPublishedAt(),
                pub.getPublishedById(),
                pub.getPublishedById() != null ? publisherNames.get(pub.getPublishedById()) : null,
                pub.getReleaseNotes(),
                pinnedCount,
                effectiveCount,
                isLatest
        );
    }

    public record PublicationView(
            UUID id,
            Integer publicationNumber,
            Integer contentVersion,
            Instant publishedAt,
            UUID publishedById,
            String publishedByName,
            String releaseNotes,
            int pinnedClassCount,
            int effectiveClassCount,
            boolean isLatest
    ) {}
}
