package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.course_management.domain.model.CourseVersion;
import com.example.lms.course_management.domain.repo_port.CourseRepository;
import com.example.lms.learning_delivery.domain.model.Class;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repo_port.LearningRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LearningUseCase {

    private final LearningRepository learningRepository;
    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public LearningPathDTO getLearningPath(UUID enrollmentId) {
        // 1. Get Enrollment
        Enrollment enrollment = learningRepository.findEnrollmentById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Enrollment not found: " + enrollmentId));

        Class clazz = enrollment.getClazz();

        // 2. Get Course Snapshot (Immutable Content)
        CourseVersion version = courseRepository.findVersionById(clazz.getCourseVersionId())
                .orElseThrow(() -> new RuntimeException("Course Version not found: " + clazz.getCourseVersionId()));

        // 3. Merge Progress
        return mapToDTO(version, enrollment);
    }

    private LearningPathDTO mapToDTO(CourseVersion version, Enrollment enrollment) {
        Map<String, Enrollment.LessonProgress> progressMap = enrollment.getProgress();

        List<LearningPathDTO.ChapterDTO> chapters = version.getSnapshotContent().stream()
                .map(ch -> mapChapter(ch, progressMap))
                .collect(Collectors.toList());

        return LearningPathDTO.builder()
                .enrollmentId(enrollment.getId())
                .courseTitle("Course Version " + version.getVersionNumber()) // Could fetch Course Title if needed from Course Aggregate
                .completionPercent(enrollment.getCompletionPercent())
                .chapters(chapters)
                .build();
    }

    private LearningPathDTO.ChapterDTO mapChapter(CourseVersion.ChapterSnapshot chapter, Map<String, Enrollment.LessonProgress> progressMap) {
        List<LearningPathDTO.LessonDTO> lessons = chapter.getLessons().stream()
                .map(l -> mapLesson(l, progressMap.get(l.getId().toString())))
                .collect(Collectors.toList());

        return LearningPathDTO.ChapterDTO.builder()
                .id(chapter.getId())
                .title(chapter.getTitle())
                .lessons(lessons)
                .build();
    }

    private LearningPathDTO.LessonDTO mapLesson(CourseVersion.LessonSnapshot lesson, Enrollment.LessonProgress progress) {
        String status = (progress != null) ? progress.getStatus() : "LOCKED"; 
        // Logic to determine LOCKED/UNLOCKED should be here or in Domain Service. 
        // For now defaulting to LOCKED if not present.
        
        return LearningPathDTO.LessonDTO.builder()
                .id(lesson.getId())
                .title(lesson.getTitle())
                .type(lesson.getType())
                .status(status)
                .durationSeconds(lesson.getDurationSeconds())
                .isCompleted("COMPLETED".equals(status))
                .build();
    }

    @Data
    @Builder
    public static class LearningPathDTO {
        private UUID enrollmentId;
        private String courseTitle;
        private Integer completionPercent;
        private List<ChapterDTO> chapters;

        @Data
        @Builder
        public static class ChapterDTO {
            private UUID id;
            private String title;
            private List<LessonDTO> lessons;
        }

        @Data
        @Builder
        public static class LessonDTO {
            private UUID id;
            private String title;
            private String type;
            private String status;
            private Integer durationSeconds;
            private boolean isCompleted;
        }
    }
}
