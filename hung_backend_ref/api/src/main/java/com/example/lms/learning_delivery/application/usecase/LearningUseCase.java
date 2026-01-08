package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.course_management.domain.model.CourseVersion;
import com.example.lms.course_management.domain.repo_port.CourseRepository;
import com.example.lms.learning_delivery.domain.model.LearningClass;
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

        LearningClass clazz = enrollment.getLearningClass();

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

    public static class LearningPathDTO {
        private UUID enrollmentId;
        private String courseTitle;
        private Integer completionPercent;
        private List<ChapterDTO> chapters;

        // Manual G/S
        public UUID getEnrollmentId() { return enrollmentId; }
        public void setEnrollmentId(UUID enrollmentId) { this.enrollmentId = enrollmentId; }
        public String getCourseTitle() { return courseTitle; }
        public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }
        public Integer getCompletionPercent() { return completionPercent; }
        public void setCompletionPercent(Integer completionPercent) { this.completionPercent = completionPercent; }
        public List<ChapterDTO> getChapters() { return chapters; }
        public void setChapters(List<ChapterDTO> chapters) { this.chapters = chapters; }

        public static LearningPathDTOBuilder builder() { return new LearningPathDTOBuilder(); }
        public static class LearningPathDTOBuilder {
            private LearningPathDTO dto = new LearningPathDTO();
            public LearningPathDTOBuilder enrollmentId(UUID id) { dto.setEnrollmentId(id); return this; }
            public LearningPathDTOBuilder courseTitle(String t) { dto.setCourseTitle(t); return this; }
            public LearningPathDTOBuilder completionPercent(Integer c) { dto.setCompletionPercent(c); return this; }
            public LearningPathDTOBuilder chapters(List<ChapterDTO> c) { dto.setChapters(c); return this; }
            public LearningPathDTO build() { return dto; }
        }

        public static class ChapterDTO {
            private UUID id;
            private String title;
            private List<LessonDTO> lessons;
            
            // Manual G/S
            public UUID getId() { return id; }
            public void setId(UUID id) { this.id = id; }
            public String getTitle() { return title; }
            public void setTitle(String title) { this.title = title; }
            public List<LessonDTO> getLessons() { return lessons; }
            public void setLessons(List<LessonDTO> lessons) { this.lessons = lessons; }

            public static ChapterDTOBuilder builder() { return new ChapterDTOBuilder(); }
            public static class ChapterDTOBuilder {
                private ChapterDTO dto = new ChapterDTO();
                public ChapterDTOBuilder id(UUID id) { dto.setId(id); return this; }
                public ChapterDTOBuilder title(String t) { dto.setTitle(t); return this; }
                public ChapterDTOBuilder lessons(List<LessonDTO> l) { dto.setLessons(l); return this; }
                public ChapterDTO build() { return dto; }
            }
        }

        public static class LessonDTO {
            private UUID id;
            private String title;
            private String type;
            private String status;
            private Integer durationSeconds;
            private boolean isCompleted;
            
            // Manual G/S
            public UUID getId() { return id; }
            public void setId(UUID id) { this.id = id; }
            public String getTitle() { return title; }
            public void setTitle(String title) { this.title = title; }
            public String getType() { return type; }
            public void setType(String type) { this.type = type; }
            public String getStatus() { return status; }
            public void setStatus(String status) { this.status = status; }
            public Integer getDurationSeconds() { return durationSeconds; }
            public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
            public boolean isCompleted() { return isCompleted; }
            public void setCompleted(boolean isCompleted) { this.isCompleted = isCompleted; }

            public static LessonDTOBuilder builder() { return new LessonDTOBuilder(); }
            public static class LessonDTOBuilder {
                private LessonDTO dto = new LessonDTO();
                public LessonDTOBuilder id(UUID id) { dto.setId(id); return this; }
                public LessonDTOBuilder title(String t) { dto.setTitle(t); return this; }
                public LessonDTOBuilder type(String t) { dto.setType(t); return this; }
                public LessonDTOBuilder status(String s) { dto.setStatus(s); return this; }
                public LessonDTOBuilder durationSeconds(Integer d) { dto.setDurationSeconds(d); return this; }
                public LessonDTOBuilder isCompleted(boolean b) { dto.setCompleted(b); return this; }
                public LessonDTO build() { return dto; }
            }
        }
    }
}
