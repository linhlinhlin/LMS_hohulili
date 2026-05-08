package com.example.lms.competency_mapping.application.usecase;

import com.example.lms.competency_mapping.application.dto.UpdateLessonCompetenciesCommand;
import com.example.lms.competency_mapping.application.port.LessonQueryPort;
import com.example.lms.competency_mapping.domain.model.LessonCompetencyMapping;
import com.example.lms.competency_mapping.domain.repository.LessonCompetencyMappingRepository;
import com.example.lms.competency_mapping.domain.repository.StandardCompetencyRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class UpdateLessonCompetenciesUseCase {

    private static final int WARNING_THRESHOLD = 5;

    private final LessonCompetencyMappingRepository mappingRepository;
    private final LessonQueryPort lessonQueryPort;
    private final StandardCompetencyRepository competencyRepository;

    public UpdateLessonCompetenciesUseCase(LessonCompetencyMappingRepository mappingRepository,
                                            LessonQueryPort lessonQueryPort,
                                            StandardCompetencyRepository competencyRepository) {
        this.mappingRepository = mappingRepository;
        this.lessonQueryPort = lessonQueryPort;
        this.competencyRepository = competencyRepository;
    }

    @Transactional
    @CacheEvict(value = "competency-map", allEntries = true)
    public UpdateResult execute(UUID lessonId, UUID currentUserId, boolean isAdmin,
                                 UpdateLessonCompetenciesCommand command) {
        var lessonInfo = lessonQueryPort.findById(lessonId);
        if (lessonInfo == null) {
            throw new EntityNotFoundException("Lesson", lessonId);
        }

        if (!isAdmin && !lessonQueryPort.canTeachLesson(lessonId, currentUserId)) {
            throw new AccessDeniedException("You don't own this course");
        }

        // Validate that all competency IDs exist
        var requestedIds = command.competencyIds() == null
                ? Set.<UUID>of()
                : new HashSet<>(command.competencyIds());

        if (!requestedIds.isEmpty()) {
            var found = competencyRepository.findByIds(new ArrayList<>(requestedIds));
            if (found.size() != requestedIds.size()) {
                throw new IllegalArgumentException("One or more competency IDs are invalid");
            }
        }

        // Diff-based upsert: preserve existing mappings, only add/remove changes
        var existing = mappingRepository.findByLessonId(lessonId);
        Set<UUID> existingIds = existing.stream()
                .map(LessonCompetencyMapping::getCompetencyId)
                .collect(Collectors.toSet());

        Set<UUID> toAdd = new HashSet<>(requestedIds);
        toAdd.removeAll(existingIds);

        Set<UUID> toRemove = new HashSet<>(existingIds);
        toRemove.removeAll(requestedIds);

        if (!toRemove.isEmpty()) {
            mappingRepository.deleteByLessonIdAndCompetencyIdIn(lessonId, toRemove);
        }

        if (!toAdd.isEmpty()) {
            var newMappings = toAdd.stream()
                    .map(cid -> LessonCompetencyMapping.create(lessonId, cid, currentUserId, command.note()))
                    .toList();
            mappingRepository.saveAll(newMappings);
        }

        String warning = null;
        if (requestedIds.size() > WARNING_THRESHOLD) {
            warning = String.format(
                    "Bài học này đang ánh xạ %d tiêu chuẩn. Cân nhắc chia nhỏ nội dung.",
                    requestedIds.size());
        }

        return new UpdateResult(lessonId, requestedIds.size(), warning,
                lessonInfo.courseId());
    }

    // courseId exposed so @CacheEvict can use it as key — resolved after transaction
    public record UpdateResult(UUID lessonId, int mappingCount, String warning, UUID courseId) {}
}
