package com.example.lms.competency_mapping.application.usecase;

import com.example.lms.competency_mapping.application.port.LessonQueryPort;
import com.example.lms.competency_mapping.domain.model.LessonCompetencyMapping;
import com.example.lms.competency_mapping.domain.model.StandardCompetency;
import com.example.lms.competency_mapping.domain.repository.LessonCompetencyMappingRepository;
import com.example.lms.competency_mapping.domain.repository.StandardCompetencyRepository;
import org.springframework.stereotype.Component;

import java.io.StringWriter;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class ExportCompetencyMapUseCase {

    private final LessonQueryPort lessonQueryPort;
    private final LessonCompetencyMappingRepository mappingRepository;
    private final StandardCompetencyRepository competencyRepository;

    public ExportCompetencyMapUseCase(LessonQueryPort lessonQueryPort,
                                       LessonCompetencyMappingRepository mappingRepository,
                                       StandardCompetencyRepository competencyRepository) {
        this.lessonQueryPort = lessonQueryPort;
        this.mappingRepository = mappingRepository;
        this.competencyRepository = competencyRepository;
    }

    public byte[] execute(UUID courseId) {
        var lessons = lessonQueryPort.findAllByCourseId(courseId);
        if (lessons.isEmpty()) return buildCsvBytes(List.of("Lesson,Chapter"), List.of());

        var lessonIds = lessons.stream().map(LessonQueryPort.LessonInfo::id).toList();
        var allMappings = mappingRepository.findByLessonIds(lessonIds);

        // Collect all competency IDs, then load details
        var competencyIds = allMappings.stream()
                .map(LessonCompetencyMapping::getCompetencyId)
                .distinct()
                .toList();

        var competencies = competencyIds.isEmpty()
                ? List.<StandardCompetency>of()
                : competencyRepository.findByIds(competencyIds);

        // Sort competencies by displayOrder for consistent column order
        var sortedCompetencies = competencies.stream()
                .sorted(Comparator.comparingInt(StandardCompetency::getDisplayOrder))
                .toList();

        // Build mappings lookup: lessonId → Set<competencyId>
        Map<UUID, Set<UUID>> mappingsByLesson = allMappings.stream()
                .collect(Collectors.groupingBy(
                        LessonCompetencyMapping::getLessonId,
                        Collectors.mapping(LessonCompetencyMapping::getCompetencyId, Collectors.toSet())
                ));

        // Build CSV header: Lesson, Chapter, [competency codes...]
        var header = new StringBuilder("Lesson,Chapter");
        for (var c : sortedCompetencies) {
            header.append(",").append(escapeCsv(c.getCode()));
        }

        // Build CSV rows
        var rows = new ArrayList<String>();
        for (var lesson : lessons) {
            var row = new StringBuilder();
            row.append(escapeCsv(lesson.title()))
               .append(",")
               .append(escapeCsv(lesson.chapterTitle()));

            var mappedIds = mappingsByLesson.getOrDefault(lesson.id(), Set.of());
            for (var c : sortedCompetencies) {
                row.append(",").append(mappedIds.contains(c.getId()) ? "1" : "");
            }
            rows.add(row.toString());
        }

        return buildCsvBytes(List.of(header.toString()), rows);
    }

    private byte[] buildCsvBytes(List<String> headers, List<String> rows) {
        var writer = new StringWriter();
        headers.forEach(h -> writer.write(h + "\n"));
        rows.forEach(r -> writer.write(r + "\n"));
        return writer.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
