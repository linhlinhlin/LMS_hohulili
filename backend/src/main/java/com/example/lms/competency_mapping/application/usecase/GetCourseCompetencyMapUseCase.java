package com.example.lms.competency_mapping.application.usecase;

import com.example.lms.competency_mapping.application.dto.*;
import com.example.lms.competency_mapping.application.port.LessonQueryPort;
import com.example.lms.competency_mapping.domain.model.LessonCompetencyMapping;
import com.example.lms.competency_mapping.domain.model.StandardCompetency;
import com.example.lms.competency_mapping.domain.repository.LessonCompetencyMappingRepository;
import com.example.lms.competency_mapping.domain.repository.MaritimeStandardRepository;
import com.example.lms.competency_mapping.domain.repository.StandardCompetencyRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class GetCourseCompetencyMapUseCase {

    private static final int WARNING_THRESHOLD = 5;

    private final LessonQueryPort lessonQueryPort;
    private final LessonCompetencyMappingRepository mappingRepository;
    private final StandardCompetencyRepository competencyRepository;
    private final MaritimeStandardRepository standardRepository;

    public GetCourseCompetencyMapUseCase(LessonQueryPort lessonQueryPort,
                                          LessonCompetencyMappingRepository mappingRepository,
                                          StandardCompetencyRepository competencyRepository,
                                          MaritimeStandardRepository standardRepository) {
        this.lessonQueryPort = lessonQueryPort;
        this.mappingRepository = mappingRepository;
        this.competencyRepository = competencyRepository;
        this.standardRepository = standardRepository;
    }

    @Cacheable(value = "competency-map", key = "#courseId")
    public CompetencyMapResponse execute(UUID courseId) {
        var lessons = lessonQueryPort.findAllByCourseId(courseId);
        var lessonIds = lessons.stream().map(LessonQueryPort.LessonInfo::id).toList();

        var allMappings = lessonIds.isEmpty()
                ? List.<LessonCompetencyMapping>of()
                : mappingRepository.findByLessonIds(lessonIds);

        // Group mappings by lessonId
        Map<UUID, List<UUID>> mappingsByLesson = allMappings.stream()
                .collect(Collectors.groupingBy(
                        LessonCompetencyMapping::getLessonId,
                        Collectors.mapping(LessonCompetencyMapping::getCompetencyId, Collectors.toList())
                ));

        // Currently mapped competency IDs (for stats)
        Set<UUID> mappedCompetencyIds = allMappings.stream()
                .map(LessonCompetencyMapping::getCompetencyId)
                .collect(Collectors.toSet());

        // Always load ALL active standards and competencies so the matrix is always visible
        var standards = standardRepository.findAllActive();
        List<StandardCompetency> competencies = competencyRepository.findAllActive();

        // Index standards by ID for fast lookup
        Map<UUID, com.example.lms.competency_mapping.domain.model.MaritimeStandard> standardById =
                standards.stream().collect(Collectors.toMap(
                        com.example.lms.competency_mapping.domain.model.MaritimeStandard::getId,
                        s -> s
                ));

        // Build lesson responses
        var courseWarnings = new ArrayList<String>();
        var lessonResponses = lessons.stream()
                .map(lesson -> {
                    var mappedIds = mappingsByLesson.getOrDefault(lesson.id(), List.of());
                    String lessonWarning = null;
                    if (mappedIds.size() > WARNING_THRESHOLD) {
                        lessonWarning = String.format(
                                "Bài học này đang ánh xạ %d tiêu chuẩn. Cân nhắc chia nhỏ nội dung.",
                                mappedIds.size());
                        courseWarnings.add(String.format("'%s': %s", lesson.title(), lessonWarning));
                    }
                    return new LessonMappingResponse(
                            lesson.id(),
                            lesson.title(),
                            lesson.chapterTitle(),
                            lesson.chapterId(),
                            new ArrayList<>(mappedIds),
                            lessonWarning
                    );
                })
                .toList();

        // Build stats (coverage = mapped / total available)
        int totalMappings = allMappings.size();
        long lessonsWithMapping = mappingsByLesson.size();
        int competenciesCovered = mappedCompetencyIds.size();
        int totalCompetencies = competencies.size();
        int coveragePercent = totalCompetencies > 0
                ? (int) Math.round(100.0 * competenciesCovered / totalCompetencies)
                : 0;

        int unmappedLessonsCount = lessons.size() - (int) lessonsWithMapping;
        int uncoveredCompetenciesCount = totalCompetencies - competenciesCovered;

        var stats = new CompetencyMapStats(
                totalMappings,
                coveragePercent,
                (int) lessonsWithMapping,
                lessons.size(),
                competenciesCovered,
                totalCompetencies,
                unmappedLessonsCount,
                uncoveredCompetenciesCount
        );

        // Build standard responses
        var standardResponses = standards.stream()
                .map(s -> new StandardResponse(
                        s.getId(),
                        s.getCode(),
                        s.getName(),
                        s.getDescription(),
                        competencyRepository.countActiveByStandardId(s.getId())
                ))
                .toList();

        var competencyResponses = competencies.stream()
                .sorted(Comparator.comparingInt(StandardCompetency::getDisplayOrder))
                .map(c -> {
                    var std = standardById.get(c.getStandardId());
                    String standardCode = std != null ? std.getCode() : "";
                    return new CompetencyResponse(
                            c.getId(), c.getStandardId(), standardCode,
                            c.getCode(), c.getTitle(), c.getDescription(),
                            c.getCategory(), c.getDisplayOrder()
                    );
                })
                .toList();

        return new CompetencyMapResponse(
                standardResponses,
                competencyResponses,
                lessonResponses,
                stats,
                courseWarnings.isEmpty() ? null : courseWarnings
        );
    }
}
