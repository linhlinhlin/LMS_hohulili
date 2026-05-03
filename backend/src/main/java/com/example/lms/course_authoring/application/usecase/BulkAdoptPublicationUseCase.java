package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CoursePublicationJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CoursePublicationJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Bulk-pins all (or only OPEN) classes of a course to a published version.
 * Pattern reference: Coursera "Promote Session Version", edX "Sync Course Run".
 *
 * Atomicity guarantee: all class updates run in one DB transaction. A mid-loop
 * failure rolls every class back so we never leave a course half-promoted.
 *
 * Idempotent: a class already pinned to the requested publication in PINNED mode
 * is skipped (no-op write) and returned in skippedClassNames so the UI can show
 * an honest "đã ghim sẵn" tally instead of a misleading "promoted".
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BulkAdoptPublicationUseCase {

    private final CoursePublicationJpaRepository publicationRepository;
    private final JpaLearningClassRepository classRepository;

    @Transactional
    public BulkAdoptResult execute(UUID courseId, UUID publicationId, Scope scope, UUID actorId) {
        CoursePublicationJpaEntity publication = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new EntityNotFoundException("CoursePublication", publicationId));

        if (!publication.getCourseId().equals(courseId)) {
            throw new AccessDeniedException("Phiên bản này không thuộc khóa học hiện tại");
        }

        List<LearningClassJpaEntity> targets = scope == Scope.OPEN_ONLY
                ? classRepository.findOpenByCourseId(courseId)
                : classRepository.findByCourseId(courseId);

        var skipped = new ArrayList<String>();
        int affected = 0;

        for (var cls : targets) {
            boolean alreadyPinnedHere = publicationId.equals(cls.getCourseVersionId())
                    && cls.getVersionMode() == LearningClassJpaEntity.VersionMode.PINNED;
            if (alreadyPinnedHere) {
                skipped.add(cls.getName());
                continue;
            }
            cls.setCourseVersionId(publicationId);
            cls.setVersionMode(LearningClassJpaEntity.VersionMode.PINNED);
            classRepository.save(cls);
            affected++;
        }

        long totalClasses = classRepository.countByCourseId(courseId);

        log.info("Bulk adopt publication v{} for course {} by user {}: scope={}, affected={}, skipped={}, total={}",
                publication.getPublicationNumber(), courseId, actorId, scope, affected, skipped.size(), totalClasses);

        return new BulkAdoptResult(
                publicationId,
                publication.getPublicationNumber(),
                scope,
                affected,
                totalClasses,
                skipped
        );
    }

    public enum Scope { OPEN_ONLY, ALL }

    public record BulkAdoptResult(
            UUID publicationId,
            Integer publicationNumber,
            Scope scope,
            int affectedClassCount,
            long totalClassCount,
            List<String> skippedClassNames
    ) {}
}
